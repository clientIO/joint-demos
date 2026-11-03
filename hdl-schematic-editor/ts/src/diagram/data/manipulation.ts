import { g, util } from '@joint/plus';
import { Attribute, NodeTypes } from '../const';
import { resolveCellDefinition } from '../../registry';
import Theme from '../theme';
import { getCellPorts } from '../../yosys/export';

import type { dia } from '@joint/plus';
import type Diagram from '../Diagram';
import type { DiagramJSON, EdgeData, NodeData } from '../types';
import type { Node } from '../models';
import type { PortDirection } from '../../registry';

/**
 * Get the port of the node data the user most likely wants to connect to (or from).
 * It's the first port (not at the bottom) of the given direction.
 */
export function getDataPrimaryPortId(data: NodeData, direction: PortDirection): string | null {
    switch (data.type) {
        case NodeTypes.Input:
        case NodeTypes.Constant:
            return direction === 'out' ? 'Y' : null;
        case NodeTypes.Output:
            return direction === 'in' ? 'A' : null;
        default: {
            const definition = resolveCellDefinition(data[Attribute.CellType]);
            if (definition) {
                const port = definition.ports.find(port => port.direction === direction && port.side !== 'SOUTH');
                return port ? port.id : null;
            }
            const port = getCellPorts(data).find(port => port.direction === direction);
            return port ? port.id : null;
        }
    }
}

/**
 * The distance between a port and a node added next to it.
 */
const NEW_NODE_GAP = 60;

/**
 * Estimated size of a new node (the real size is known once the node is created).
 */
const NEW_NODE_SIZE = { width: 50, height: 40 };

const GRID_SIZE = Theme.GridSize;

/**
 * Align the point to the paper grid.
 */
export function snapToGrid({ x, y }: dia.Point): dia.Point {
    return {
        x: Math.round(x / GRID_SIZE) * GRID_SIZE,
        y: Math.round(y / GRID_SIZE) * GRID_SIZE
    };
}

/**
 * Creates a new node driven by the given output port.
 * The node is placed to the right of the port.
 */
export function appendNodeToPort(diagram: Diagram, data: NodeData, sourceNode: dia.Element, sourcePortId: string): Node {
    const { diagramData, graph } = diagram;

    const portCenter = sourceNode.getPortCenter(sourcePortId);
    const position = snapToGrid({
        x: portCenter.x + NEW_NODE_GAP,
        y: portCenter.y - NEW_NODE_SIZE.height / 2
    });

    const id = util.uuid();
    diagramData.runInBatch('append-node', () => {
        diagramData.createNode({ ...data, position }, id);
        const targetPortId = getDataPrimaryPortId(data, 'in');
        if (!targetPortId) return;
        diagramData.addEdge({
            id: sourceNode.id,
            portId: sourcePortId
        }, {
            id,
            portId: targetPortId
        });
    });

    return graph.getCell(id) as Node;
}

/**
 * Creates a new node driving the given input port.
 * The current driver of the port (if any) is disconnected.
 * The node is placed to the left of the port.
 */
export function prependNodeToPort(diagram: Diagram, data: NodeData, targetNode: dia.Element, targetPortId: string): Node {
    const { diagramData, graph } = diagram;

    const portCenter = targetNode.getPortCenter(targetPortId);
    const position = snapToGrid({
        x: portCenter.x - NEW_NODE_GAP - NEW_NODE_SIZE.width,
        y: portCenter.y - NEW_NODE_SIZE.height / 2
    });

    const id = util.uuid();
    diagramData.runInBatch('prepend-node', () => {
        disconnectInputPort(diagram, targetNode.id, targetPortId);
        diagramData.createNode({ ...data, position }, id);
        const sourcePortId = getDataPrimaryPortId(data, 'out');
        if (!sourcePortId) return;
        diagramData.addEdge({
            id,
            portId: sourcePortId
        }, {
            id: targetNode.id,
            portId: targetPortId
        });
    });

    return graph.getCell(id) as Node;
}

/**
 * Inserts a new node on the given link.
 * The node is placed in the middle of the link route.
 */
export function insertNodeOnEdge(diagram: Diagram, data: NodeData, link: dia.Link): Node {
    const { diagramData, graph } = diagram;

    const { id: sourceId, port: sourcePort } = link.source();
    const { id: targetId, port: targetPort } = link.target();
    if (!sourceId || !targetId) {
        throw new Error('Link must have both source and target nodes');
    }

    const middle = getLinkRoute(link).pointAtLength(getLinkRoute(link).length() / 2) || new g.Point();
    const position = snapToGrid({
        x: middle.x - NEW_NODE_SIZE.width / 2,
        y: middle.y - NEW_NODE_SIZE.height / 2
    });

    const id = util.uuid();
    diagramData.runInBatch('insert-node', () => {
        diagramData.createNode({ ...data, position }, id);
        const inputPortId = getDataPrimaryPortId(data, 'in');
        const outputPortId = getDataPrimaryPortId(data, 'out');
        // Redirect the edge to the new node
        diagramData.changeEdge({
            id: sourceId,
            portId: sourcePort
        }, {
            id: targetId,
            portId: targetPort
        }, {
            id,
            targetPortId: inputPortId || undefined
        });
        // Connect the new node to the original target
        if (outputPortId) {
            diagramData.addEdge({
                id,
                portId: outputPortId
            }, {
                id: targetId,
                portId: targetPort
            });
        }
    });

    return graph.getCell(id) as Node;
}

/**
 * Changes the data of the node and removes the edges connected
 * to ports which do not exist anymore.
 */
export function replaceNodeData(diagram: Diagram, nodeId: dia.Cell.ID, data: NodeData) {
    const { diagramData } = diagram;

    const ports = getCellPorts(data);
    const outputPortIds = ports.filter(port => port.direction === 'out').map(port => port.id);
    const inputPortIds = ports.filter(port => port.direction === 'in').map(port => port.id);

    diagramData.runInBatch('replace-node', () => {
        diagramData.changeNode(nodeId, data);
        const json = diagramData.toJSON() as DiagramJSON;
        // Outbound edges
        ((json[nodeId]?.to || []) as EdgeData[]).forEach(edge => {
            if (outputPortIds.includes(edge.sourcePortId!)) return;
            diagramData.removeEdge({ id: nodeId, portId: edge.sourcePortId }, { id: edge.id!, portId: edge.targetPortId });
        });
        // Inbound edges
        Object.entries(json).forEach(([sourceId, node]) => {
            (node.to || []).forEach(edge => {
                if (edge.id !== nodeId || inputPortIds.includes(edge.targetPortId!)) return;
                diagramData.removeEdge({ id: sourceId, portId: edge.sourcePortId }, { id: nodeId, portId: edge.targetPortId });
            });
        });
    });
}

/**
 * Removes the edge driving the given input port (if any).
 */
export function disconnectInputPort(diagram: Diagram, nodeId: dia.Cell.ID, portId: string) {
    const { diagramData } = diagram;
    const json = diagramData.toJSON() as DiagramJSON;
    Object.entries(json).forEach(([sourceId, node]) => {
        (node.to || []).forEach(edge => {
            if (edge.id !== nodeId || edge.targetPortId !== portId) return;
            diagramData.removeEdge({ id: sourceId, portId: edge.sourcePortId }, { id: nodeId, portId });
        });
    });
}

/**
 * Get the route of the link: from the source pin through the vertices to the target pin.
 */
export function getLinkRoute(link: dia.Link): g.Polyline {
    const points: dia.Point[] = [];
    const source = link.getSourceElement();
    const target = link.getTargetElement();
    const sourcePort = link.source().port;
    const targetPort = link.target().port;
    if (source) {
        points.push(sourcePort ? source.getPortCenter(sourcePort) : source.getBBox().center());
    }
    points.push(...link.vertices());
    if (target) {
        points.push(targetPort ? target.getPortCenter(targetPort) : target.getBBox().center());
    }
    return new g.Polyline(points);
}
