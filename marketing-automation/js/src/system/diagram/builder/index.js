import { util } from '@joint/plus';
import { layoutCells } from './layouts/elk-layout';
import { Attribute } from '../const';
import { extractGraphCells, setNodeAttribute, isNodeJSON } from './utils';
import { setCustomPosition } from '../custom-positions';
import { extractNodesIds } from '../data/utils';
import { SystemButton, SystemButtonLine, SystemEdge, SystemPlaceholder } from '../models';
import { runAfterLayout } from '../../../diagram/utils';

export * from './types';

const ZIndex = {
    Edge: 0,
    ButtonLine: 0,
    Button: 1,
    Placeholder: 1,
    Node: 1,
};

/**
 * Builds the diagram.
 * @param data - The system diagram JSON data.
 * @param graph - The graph instance.
 * @param options - The options for building the diagram.
 */
export function buildDiagram(data, graph, options = {}) {
    const { 
    // By default the data node is used as-is to create the model.
    buildNode = (node) => node, 
    // By default, nodes have no growth limit.
    growthLimit = () => Infinity, disableOptimalOrderHeuristic = true, } = options;
    const { addedNodeIds, addedButtonIds, replacedNodePositions } = updateGraph(graph, data, buildNode, growthLimit);
    // Note: This only sets the initial positions for new and replaced nodes and buttons,
    // to disable the animations completely, set the transition to none in shapes.scss.
    setInitialPositionsForAnimation(graph, data, addedNodeIds, addedButtonIds, replacedNodePositions);
    layoutGraph(graph, disableOptimalOrderHeuristic);
}

/**
 * Updates the graph with the new data.
 * @param graph - The graph instance.
 * @param json - The system diagram JSON data.
 * @param buildNode - The function to build a node.
 * @param growthLimit - The function to calculate the growth limit for a node.
 * @returns The added node IDs, added button IDs, and replaced node positions.
 */
function updateGraph(graph, json, buildNode, growthLimit) {
    
    const nodes = [];
    const edges = [];
    
    const growthLimits = new Map();
    const nodeIds = extractNodesIds(json);
    const addedNodeIds = new Set();
    const addedButtonIds = new Set();
    const replacedNodePositions = new Map();
    
    nodeIds.forEach(sourceId => {
        const nodeJSON = json[sourceId] ?? { /* placeholder */};
        const nodeType = nodeJSON.type;
        
        let node;
        const existingNode = graph.getCell(sourceId);
        
        if (!existingNode) {
            addedNodeIds.add(sourceId);
        }
        
        if (!nodeType) {
            // The node type is not defined in the data, so we create a placeholder
            const defaults = util.result(graph.layerCollection.cellNamespace[SystemPlaceholder.type].prototype, 'defaults', {});
            node = {
                type: SystemPlaceholder.type,
                id: sourceId,
                z: ZIndex.Placeholder,
                // Make sure the `attrs` are not carried over from the "new node"
                // when undoing an operation.
                attrs: defaults.attrs || {},
            };
        }
        else {
            node = buildNode(nodeJSON, sourceId.toString());
            // Ensure the node has the ID attribute set
            setNodeAttribute(node, 'id', sourceId);
            if (isNodeJSON(node)) {
                if (existingNode && existingNode.get('type') !== nodeType) {
                    // Currently, if node JSON, is replaced with a cell of a different type,
                    // we need to remove it to avoid issue with attributes incompatible with the new type.
                    graph.removeCell(existingNode, { replace: true });
                    // We are replacing the node, so we save the position of the old node
                    replacedNodePositions.set(sourceId, existingNode.position());
                }
                if (!('z' in node)) {
                    // Temporary workaround for a JointJS z-index behavior.
                    // When creating a cell from JSON without a 'z' property,
                    // JointJS assigns one automatically, overriding the model's default 'z' value.
                    const defaults = util.result(graph.layerCollection.cellNamespace[nodeType].prototype, 'defaults', {});
                    node.z = defaults.z ?? ZIndex.Node;
                }
            }
            // Evaluate the growth limit for the node and store it
            growthLimits.set(sourceId, growthLimit(nodeJSON));
        }
        
        nodes.push(node);
    });
    
    nodeIds.forEach(sourceId => {
        
        const nodeJSON = json[sourceId];
        if (!nodeJSON) {
            // Placeholder has no links
            return;
        }
        
        const targets = nodeJSON.to || [];
        targets.forEach((target, sourceIndex) => {
            const targetId = target.id;
            if (!targetId)
                return;
            
            const edgeJSON = {
                ...target,
                z: ZIndex.Edge,
                type: SystemEdge.type,
                [Attribute.SourceIndex]: sourceIndex,
                id: `${sourceId}-${targetId}`,
                source: { id: sourceId },
                target: { id: targetId }
            };
            
            edges.push(edgeJSON);
        });
    });
    
    const buttons = makeButtons(nodeIds, json, growthLimits);
    // Track which buttons will be new
    buttons.forEach(button => {
        if (!graph.getCell(button.id)) {
            addedButtonIds.add(button.id);
        }
    });
    
    graph.syncCells([
        ...nodes,
        ...edges,
        ...buttons
    ], { remove: true });
    
    return { addedNodeIds, addedButtonIds, replacedNodePositions };
}

/**
 * Sets initial positions for newly added/replaced nodes and buttons before ELK layout runs.
 * This enables smooth animations from current positions to layout-calculated positions.
 * New nodes are positioned at their parent's location, replaced nodes are positioned at their original location,
 * and buttons are positioned relative to their parent node.
 * @param graph - The graph instance.
 * @param json - The system diagram JSON data.
 * @param addedNodeIds - Set of node IDs that were newly added to the graph.
 * @param addedButtonIds - Set of button IDs that were newly added to the graph.
 * @param replacedNodePositions - Map of node IDs to their positions that were replaced in the graph.
 */
function setInitialPositionsForAnimation(graph, json, addedNodeIds, addedButtonIds, replacedNodePositions) {
    const nodeIds = extractNodesIds(json);
    
    // Build parent-child relationship map
    const parentMap = new Map();
    nodeIds.forEach(sourceId => {
        const nodeJSON = json[sourceId];
        if (nodeJSON && nodeJSON.to) {
            nodeJSON.to.forEach(target => {
                if (target.id) {
                    parentMap.set(target.id, sourceId);
                }
            });
        }
    });
    
    /**
     * Map of node IDs to their positions, used to retrieve parent positions for new nodes.
     */
    const positionsMap = new Map();
    
    // Capture existing node positions
    nodeIds.forEach(sourceId => {
        const nodeModel = graph.getCell(sourceId);
        if (nodeModel && !addedNodeIds.has(sourceId)) {
            positionsMap.set(sourceId, nodeModel.position());
        }
    });
    
    // Set positions for newly added nodes based on their parent
    addedNodeIds.forEach(nodeId => {
        const nodeModel = graph.getCell(nodeId);
        if (!nodeModel)
            return;
        
        const initialPosition = retrieveParentPositionRecursively(nodeId, parentMap, positionsMap);
        nodeModel.position(initialPosition.x, initialPosition.y, { silent: true });
        positionsMap.set(nodeId, initialPosition);
    });
    
    // Preserve replaced nodes' exact positions
    replacedNodePositions.forEach((position, nodeId) => {
        const nodeModel = graph.getCell(nodeId);
        if (!nodeModel)
            return;
        
        nodeModel.position(position.x, position.y, { silent: true });
        positionsMap.set(nodeId, position);
    });
    
    // Third pass: set positions for newly added buttons based on their parent node
    addedButtonIds.forEach(buttonId => {
        const button = graph.getCell(buttonId);
        if (button) {
            const connectedLink = graph.getConnectedLinks(button, { inbound: true })[0];
            if (!connectedLink)
                return;
            
            const nodeId = connectedLink.source().id;
            if (!nodeId)
                return;
            
            const nodePosition = positionsMap.get(nodeId);
            if (!nodePosition)
                return;
            
            button.position(nodePosition.x, nodePosition.y, { silent: true });
        }
    });
}

async function layoutGraph(graph, disableOptimalOrderHeuristic) {
    const { fixedNodes, ...cells } = extractGraphCells(graph);
    
    const setFixedPositions = () => {
        fixedNodes.forEach(node => setCustomPosition(graph, node));
    };
    
    // Set the fixed positions immediately to avoid any animation
    // from (0,0) to the target position.
    setFixedPositions();
    
    // Set the fixed positions after the layout is completed,
    // and reference nodes have been positioned.
    runAfterLayout(graph, setFixedPositions);
    
    // Async layout the cells
    return layoutCells(graph, cells, {
        disableOptimalOrderHeuristic,
    });
}

function constructButtonId(nodeId) {
    return `${nodeId}-button`;
}

/**
 * Retrieves the position of a node's parent recursively.
 * @param nodeId - The ID of the node.
 * @param parentMap - The map of parent IDs.
 * @param graph - The graph instance.
 * @returns The position of the node's parent.
 */
function retrieveParentPositionRecursively(nodeId, parentMap, positions) {
    const parentId = parentMap.get(nodeId);
    
    // If there is no parent, return the origin position
    if (!parentId)
        return { x: 0, y: 0 };
    
    const parentPosition = positions.get(parentId);
    // The parent has no defined position therefore it's not yet part of the graph, go up the hierarchy
    if (!parentPosition)
        return retrieveParentPositionRecursively(parentId, parentMap, positions);
    
    // The parent has defined position therefore it's already part of the graph, return it
    return parentPosition;
}

function makeButtons(nodeIds, data, growthLimits) {
    
    const cells = [];
    
    nodeIds.forEach(nodeId => {
        const nodeJSON = data[nodeId];
        if (!nodeJSON || !nodeJSON.type)
            return;
        const growthLimit = growthLimits.get(nodeId) ?? Infinity;
        const childCount = nodeJSON.to?.length || 0;
        if (childCount < growthLimit) {
            cells.push(...makeButton(nodeId));
        }
    });
    
    return cells;
}

function makeButton(nodeId) {
    const buttonId = constructButtonId(nodeId);
    const buttonLineId = `${buttonId}-line`;
    
    const buttonInit = {
        id: buttonId,
        type: SystemButton.type,
        z: ZIndex.Button,
    };
    
    return [
        buttonInit,
        {
            id: buttonLineId,
            type: SystemButtonLine.type,
            source: { id: nodeId },
            target: { id: buttonId },
            z: ZIndex.ButtonLine,
        }
    ];
}
