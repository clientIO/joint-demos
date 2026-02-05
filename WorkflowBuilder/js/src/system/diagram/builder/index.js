import { util } from '@joint/plus';
import { layoutCells } from './layouts/elk-layout';
import { extractGraphCells, setNodeAttribute, isNodeJSON } from './utils';
import { setCustomPosition } from '../custom-positions';
import { extractNodesIds } from '../data/utils';
import { SystemEdge } from '../models';
import { Attribute } from '../const';
import { runAfterLayout } from '../../../diagram/utils';

export * from './types';

const ZIndex = {
    Edge: 0,
    Node: 1,
};

export async function buildDiagram(data, graph, options = {}) {
    const { 
    // By default the data node is used as-is to create the model.
    buildNode = (node) => node, disableOptimalOrderHeuristic = true, } = options;
    updateGraph(graph, data, buildNode);
    await layoutGraph(graph, disableOptimalOrderHeuristic);
}

function updateGraph(graph, json, buildNode) {
    
    const nodes = [];
    const edges = [];
    
    const nodeIds = extractNodesIds(json);
    
    nodeIds.forEach(sourceId => {
        // node should always exist in the JSON
        const nodeJSON = json[sourceId];
        const nodeType = nodeJSON.type;
        
        const node = buildNode(nodeJSON, sourceId.toString());
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
        
        nodes.push(node);
    });
    
    nodeIds.forEach(sourceId => {
        const nodeJSON = json[sourceId];
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
                id: `${sourceId}${target.sourcePortId ? '_' + target.sourcePortId : ''}-${targetId}${target.targetPortId ? '_' + target.targetPortId : ''}`,
                source: {
                    id: sourceId,
                    port: target.sourcePortId
                },
                target: {
                    id: targetId,
                    port: target.targetPortId
                }
            };
            
            edges.push(edgeJSON);
        });
    });
    
    graph.syncCells([
        ...nodes,
        ...edges,
    ], { remove: true });
}

/**
 * Asynchronously layouts the graph using the ELK layout engine.
 */
async function layoutGraph(graph, disableOptimalOrderHeuristic) {
    
    const { fixedNodes, ...cells } = extractGraphCells(graph);
    
    const setFixedPositions = () => {
        fixedNodes.forEach(node => setCustomPosition(graph, node));
    };
    
    // Set fixed node positions to ensure they
    // have the correct position set synchronously
    setFixedPositions();
    
    // Set the fixed positions after the layout is completed,
    // and reference nodes have been positioned.
    runAfterLayout(graph, setFixedPositions);
    
    await layoutCells(graph, cells, { disableOptimalOrderHeuristic });
}
