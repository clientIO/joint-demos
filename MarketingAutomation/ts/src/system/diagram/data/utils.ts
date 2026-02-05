import type { dia } from '@joint/plus';
import { util } from '@joint/plus';
import type { SystemNodeData, SystemDiagramJSON, SystemEdgeData, SortIteratee } from '../types';

// Data modification

export function removeEdge(json: SystemDiagramJSON, parentId: dia.Cell.ID, childId: dia.Cell.ID) {
    const parent = json[parentId];
    if (!parent || !parent.to) return;
    const index = parent.to.findIndex((target) => target.id === childId);
    if (index > -1) {
        parent.to.splice(index, 1);
    }
}

export function changeEdge(json: SystemDiagramJSON, parentId: dia.Cell.ID, childId: dia.Cell.ID, edge: Partial<SystemEdgeData>) {
    const parent = json[parentId];
    if (!parent || !parent.to) return;
    const index = parent.to.findIndex((target) => target.id === childId);
    if (index > -1) {
        const currentEdge = parent.to[index];
        parent.to[index] = { ...currentEdge, ...edge };
    }
}

export function insertNode<N extends SystemNodeData>(data: N, json: SystemDiagramJSON, parentId: dia.Cell.ID, childId: dia.Cell.ID) {
    const nodeId = createNode(data, json);
    changeEdge(json, parentId, childId, { id: nodeId });
    addEdge(json, nodeId, childId);
    return nodeId;
}

export function addEdge(json: SystemDiagramJSON, parentId: dia.Cell.ID, childId: dia.Cell.ID) {
    const parent = json[parentId];
    if (!parent) return;
    if (!parent.to) {
        parent.to = [];
    }
    parent.to.push({ id: childId });
}

export function appendNode<N extends SystemNodeData>(data: N, json: SystemDiagramJSON, parentId: dia.Cell.ID) {
    const childId = util.uuid();
    createNode(data, json, childId);
    addEdge(json, parentId, childId);
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

export function sortChildren(json: SystemDiagramJSON, id: dia.Cell.ID, graph: dia.Graph, iteratee: SortIteratee<dia.Element>) {
    const node = json[id];
    if (!node || !node.to) return;
    node.to = util.sortBy(node.to, (target) => {
        const targetEl = graph.getCell(target.id) as dia.Element;
        return iteratee(targetEl);
    });
}

export function sortNodes(json: SystemDiagramJSON, graph: dia.Graph, coordinate: 'x' | 'y' = 'x') {
    Object.keys(json).forEach((id) => {
        sortChildren(json, id, graph, (targetEl: dia.Element) => targetEl.getBBox().center()[coordinate]);
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
