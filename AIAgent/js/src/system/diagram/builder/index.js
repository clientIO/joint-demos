import { util } from '@joint/plus';
import { layoutCells } from './layouts/dagre-layout';
import { Attribute } from '../const';
import { extractGraphCells, setNodeAttribute, isNodeJSON } from './utils';
import { setCustomPosition } from '../custom-positions';
import { extractNodesIds } from '../data/utils';
import { SystemButton, SystemButtonLine, SystemEdge, SystemPlaceholder } from '../models';

export * from './types';

const ZIndex = {
    Edge: 0,
    ButtonLine: 0,
    Button: 1,
    Placeholder: 1,
    Node: 1,
};

export function buildDiagram(data, graph, options = {}) {
    const { 
    // By default the data node is used as-is to create the model.
    buildNode = (node) => node, 
    // By default, nodes have no growth limit.
    growthLimit = () => Infinity, disableOptimalOrderHeuristic = true, } = options;
    updateGraph(graph, data, buildNode, growthLimit);
    layoutGraph(graph, disableOptimalOrderHeuristic);
}

function updateGraph(graph, json, buildNode, growthLimit) {
    
    const nodes = [];
    const edges = [];
    
    const growthLimits = new Map();
    const nodeIds = extractNodesIds(json);
    
    nodeIds.forEach(sourceId => {
        const nodeJSON = json[sourceId] ?? { /* placeholder */};
        const nodeType = nodeJSON.type;
        
        let node;
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
                const nodeModel = graph.getCell(sourceId);
                if (nodeModel && nodeModel.get('type') !== nodeType) {
                    // Currently, if node JSON, is replaced with a cell of a different type,
                    // we need to remove it to avoid issue with attributes incompatible with the new type.
                    graph.removeCell(nodeModel, { replace: true });
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
    
    graph.syncCells([
        ...nodes,
        ...edges,
        ...makeButtons(nodeIds, json, growthLimits)
    ], { remove: true });
}

function layoutGraph(graph, disableOptimalOrderHeuristic) {
    
    const { fixedNodes, ...cells } = extractGraphCells(graph);
    
    layoutCells(graph, cells, {
        disableOptimalOrderHeuristic,
    });
    
    // Set the position of the nodes with fixed positions
    fixedNodes.forEach(node => setCustomPosition(graph, node));
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
    const buttonId = `${nodeId}-button`;
    const buttonLineId = `${nodeId}-button-line`;
    return [{
            id: buttonId,
            type: SystemButton.type,
            z: ZIndex.Button,
        }, {
            id: buttonLineId,
            type: SystemButtonLine.type,
            source: { id: nodeId },
            target: { id: buttonId },
            z: ZIndex.ButtonLine,
        }];
}

