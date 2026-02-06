import { util } from '@joint/plus';
import { config } from '../../configs/system';

import type { dia } from '@joint/plus';
import type { SystemNodeData, SystemDiagramJSON, SystemEdgeData } from '../types';

export interface ConnectionData {
    id: dia.Cell.ID;
    portId?: string;
}

// Data modification

export function removeEdge(json: SystemDiagramJSON, parentData: ConnectionData, childData: ConnectionData) {
    const parent = json[parentData.id];
    if (!parent || !parent.to) return;
    const index = parent.to.findIndex((target) => target.id === childData.id
        && target.sourcePortId === parentData.portId
        && target.targetPortId === childData.portId);

    if (index > -1) {
        parent.to.splice(index, 1);
    }
}

export function changeEdge(json: SystemDiagramJSON, parentData: ConnectionData, childData: ConnectionData, edge: Partial<SystemEdgeData>) {
    const parent = json[parentData.id];
    if (!parent || !parent.to) return;
    const index = parent.to.findIndex((target) => target.id === childData.id
        && target.sourcePortId === parentData.portId
        && target.targetPortId === childData.portId);

    if (index > -1) {
        const currentEdge = parent.to[index];
        parent.to[index] = { ...currentEdge, ...edge };
    }
}

export function insertNode<N extends SystemNodeData>(data: N, json: SystemDiagramJSON, parentData: ConnectionData, childData: ConnectionData) {
    const nodeId = createNode(data, json);
    changeEdge(json, parentData, childData, {
        id: nodeId,
        targetPortId: config.defaultInboundPortId
    });
    addEdge(json, {
        id: nodeId,
        portId: config.defaultOutboundPortId
    }, {
        id: childData.id,
        portId: childData.portId
    });
    return nodeId;
}

export function addEdge(json: SystemDiagramJSON, parentData: ConnectionData, childData: ConnectionData) {
    const parent = json[parentData.id];
    if (!parent) return;
    if (!parent.to) {
        parent.to = [];
    }
    parent.to.push({
        id: childData.id,
        sourcePortId: parentData.portId,
        targetPortId: childData.portId,
    });
}

export function appendNode<N extends SystemNodeData>(data: N, json: SystemDiagramJSON, parentData: ConnectionData) {
    const childId = util.uuid();
    createNode(data, json, childId);
    addEdge(json, parentData, {
        id: childId,
        portId: config.defaultInboundPortId
    });
    return childId;
}

export function createNode<N extends SystemNodeData>(data: N, json: SystemDiagramJSON, id: dia.Cell.ID = util.uuid()) {
    if (!json[id]) {
        const node: SystemNodeData = { to: [], ...data };
        json[id] = node;
    } else {
        json[id] = { ...json[id], ...data };
    }
    return id;
}

export function changeNode<N extends SystemNodeData>(json: SystemDiagramJSON, id: dia.Cell.ID, data: Partial<Omit<N, 'to'>>) {
    const node = json[id] as N;
    if (!node) return;
    const keys = Object.keys(data) as Array<keyof Partial<Omit<N, 'to'>>>;
    keys.forEach((key) => {
        node[key] = data[key]!;
    });
}

export function removeEdgesFromNode(json: SystemDiagramJSON, id: dia.Cell.ID) {
    Object.keys(json).forEach((nodeId) => {
        const node = json[nodeId];
        if (node?.to) {
            const index = node.to.findIndex((target) => target.id === id);
            if (index > -1) {
                node.to.splice(index, 1);
            }
        }
    });
    const node = json[id];
    if (node) {
        node.to = [];
    }
}

export function removeNode(json: SystemDiagramJSON, id: dia.Cell.ID) {
    removeEdgesFromNode(json, id);
    delete json[id];
}

export function getNodeEdges(json: SystemDiagramJSON, id: dia.Cell.ID) {
    const node = json[id];
    if (!node || !node.to) return [];
    return node.to.map(target => `${id}-${target.id}`);
}

export function sortChildren(json: SystemDiagramJSON, id: dia.Cell.ID, graph: dia.Graph, coordinate: 'x' | 'y' = 'x') {
    const node = json[id];
    if (!node || !node.to) return;
    node.to = util.sortBy(node.to, (target) => {
        const targetEl = graph.getCell(target.id) as dia.Element;
        return targetEl.getBBox().center()[coordinate];
    });
}

export function sortNodes(json: SystemDiagramJSON, graph: dia.Graph, coordinate: 'x' | 'y' = 'x') {
    Object.keys(json).forEach((id) => {
        sortChildren(json, id, graph, coordinate);
    });
}

/**
 * Finds all node IDs in the diagram JSON,
 * including those only referenced as targets (placeholders).
 */
export function extractNodesIds(json: SystemDiagramJSON) {
    const acc = new Set<dia.Cell.ID>();
    Object.entries(json).forEach(([sourceId, node]) => {
        acc.add(sourceId);
        node.to?.forEach(target => {
            const targetId = target.id;
            if (targetId) {
                acc.add(targetId);
            }
        });
    });
    return Array.from(acc);
}
