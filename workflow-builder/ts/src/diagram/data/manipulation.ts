import { Attribute } from '../const';
import type { dia } from '@joint/plus';
import type Diagram from '../Diagram';
import type { NodeData } from '../types';
import type { Node, DiagramNode } from '../models';

/**
 * Appends a new node to the parent of the given node.
 */
export function appendNodeToParent(diagram: Diagram, data: NodeData, sourceNode: DiagramNode, options: { sourcePortId?: string }): Node {
    const { diagramData, graph } = diagram;

    const addedNodeId = diagramData.runInBatch('append-node', () => {
        const id = diagramData.appendNode(data, {
            id: sourceNode.id,
            portId: options.sourcePortId
        });
        return id;
    });

    return graph.getCell(addedNodeId) as Node;
}

/**
 * Inserts a new node on the given link.
 */
export function insertNodeOnEdge(diagram: Diagram, data: NodeData, link: dia.Link): Node {
    const { diagramData, graph } = diagram;

    const { id: sourceId, port: sourcePort } = link.source();
    const { id: targetId, port: targetPort } = link.target();
    if (!sourceId || !targetId) {
        throw new Error('Link must have both source and target nodes');
    }

    const insertedNodeId = diagramData.runInBatch('insert-node', () => {
        // Special case: if inserting a control node with no control key, just append it to the source node
        // this avoids creating invalid links from not configured control nodes
        if (data.type === 'control' && data[Attribute.ControlKey] === null) {
            const id = diagramData.appendNode(data, {
                id: sourceId,
                portId: sourcePort
            });

            diagramData.removeEdge({
                id: sourceId,
                portId: sourcePort
            }, {
                id: targetId,
                portId: targetPort
            });

            return id;
        }

        const id = diagramData.insertNode(data, {
            id: sourceId,
            portId: sourcePort
        }, {
            id: targetId,
            portId: targetPort
        });

        return id;
    });

    return graph.getCell(insertedNodeId) as Node;
}
