import { util } from '@joint/plus';
import { config } from '../../configs/system';

// Data modification

export function removeEdge(json, parentData, childData) {
    const parent = json[parentData.id];
    if (!parent || !parent.to)
        return;
    const index = parent.to.findIndex((target) => target.id === childData.id
        && target.sourcePortId === parentData.portId
        && target.targetPortId === childData.portId);
    
    if (index > -1) {
        parent.to.splice(index, 1);
    }
}

export function changeEdge(json, parentData, childData, edge) {
    const parent = json[parentData.id];
    if (!parent || !parent.to)
        return;
    const index = parent.to.findIndex((target) => target.id === childData.id
        && target.sourcePortId === parentData.portId
        && target.targetPortId === childData.portId);
    
    if (index > -1) {
        const currentEdge = parent.to[index];
        parent.to[index] = { ...currentEdge, ...edge };
    }
}

export function insertNode(data, json, parentData, childData) {
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

export function addEdge(json, parentData, childData) {
    const parent = json[parentData.id];
    if (!parent)
        return;
    if (!parent.to) {
        parent.to = [];
    }
    parent.to.push({
        id: childData.id,
        sourcePortId: parentData.portId,
        targetPortId: childData.portId,
    });
}

export function appendNode(data, json, parentData) {
    const childId = util.uuid();
    createNode(data, json, childId);
    addEdge(json, parentData, {
        id: childId,
        portId: config.defaultInboundPortId
    });
    return childId;
}

export function createNode(data, json, id = util.uuid()) {
    if (!json[id]) {
        const node = { to: [], ...data };
        json[id] = node;
    }
    else {
        json[id] = { ...json[id], ...data };
    }
    return id;
}

export function changeNode(json, id, data) {
    const node = json[id];
    if (!node)
        return;
    const keys = Object.keys(data);
    keys.forEach((key) => {
        node[key] = data[key];
    });
}

export function removeEdgesFromNode(json, id) {
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

export function removeNode(json, id) {
    removeEdgesFromNode(json, id);
    delete json[id];
}

export function getNodeEdges(json, id) {
    const node = json[id];
    if (!node || !node.to)
        return [];
    return node.to.map(target => `${id}-${target.id}`);
}

export function sortChildren(json, id, graph, coordinate = 'x') {
    const node = json[id];
    if (!node || !node.to)
        return;
    node.to = util.sortBy(node.to, (target) => {
        const targetEl = graph.getCell(target.id);
        return targetEl.getBBox().center()[coordinate];
    });
}

export function sortNodes(json, graph, coordinate = 'x') {
    Object.keys(json).forEach((id) => {
        sortChildren(json, id, graph, coordinate);
    });
}

/**
 * Finds all node IDs in the diagram JSON,
 * including those only referenced as targets (placeholders).
 */
export function extractNodesIds(json) {
    const acc = new Set();
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
