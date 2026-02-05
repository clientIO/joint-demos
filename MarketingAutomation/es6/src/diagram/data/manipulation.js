import { Branch } from '../models';
import { Attribute } from '../const';

/**
 * Appends a new node to the parent of the given button.
 */
export function appendNodeToButtonParent(diagram, data, button) {
    const { diagramData, graph } = diagram;
    
    const [sourceNode] = graph.getNeighbors(button, { inbound: true });
    if (!sourceNode) {
        throw new Error('Button has no parent node');
    }
    
    const addedNodeId = diagramData.runInBatch('append-node', () => {
        const id = diagramData.appendNode(data, sourceNode.id);
        if (sourceNode instanceof Branch) {
            diagramData.changeEdge(sourceNode.id, id, { [Attribute.NodeCondition]: '' });
        }
        return id;
    });
    
    return graph.getCell(addedNodeId);
}

/**
 * Replaces the data of an existing node.
 */
export function replacePlaceholderWithNode(diagram, placeholderId, data) {
    const { diagramData, graph } = diagram;
    
    diagramData.createNode(data, placeholderId);
    return graph.getCell(placeholderId);
}

/**
 * Inserts a new node on the given link.
 */
export function insertNodeOnEdge(diagram, data, link) {
    const { diagramData, graph } = diagram;
    
    const { id: sourceId } = link.source();
    const { id: targetId } = link.target();
    if (!sourceId || !targetId) {
        throw new Error('Link must have both source and target nodes');
    }
    
    const insertedNodeId = diagramData.runInBatch('insert-node', () => {
        const id = diagramData.insertNode(data, sourceId, targetId);
        if (data.type === Branch.type) {
            diagramData.changeEdge(id, targetId, { [Attribute.EdgeCondition]: '' });
        }
        return id;
    });
    
    return graph.getCell(insertedNodeId);
}
