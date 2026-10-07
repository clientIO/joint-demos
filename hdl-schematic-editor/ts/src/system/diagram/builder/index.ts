import { layoutCells } from './layouts/elk-layout';
import { extractGraphCells, setNodeAttribute, isNodeJSON } from './utils';
import { setCustomPosition } from '../custom-positions';
import { extractNodesIds } from '../data/utils';
import { SystemEdge } from '../models';
import { Attribute } from '../const';
import { runAfterLayout } from '../../../diagram/utils';

import type { dia } from '@joint/plus';
import type { BuildNode, BuildDiagramOptions } from './types';
import type { SystemDiagramJSON, SystemTypedNodeData } from '../types';

export * from './types';

const ZIndex = {
    Edge: 0,
    Node: 1,
};

export async function buildDiagram(data: SystemDiagramJSON, graph: dia.Graph, options: BuildDiagramOptions = {}) {
    const {
        // By default the data node is used as-is to create the model.
        buildNode = (node) => node as dia.Graph.CellInit,
        disableOptimalOrderHeuristic = true,
        autoLayout = true,
    } = options;
    updateGraph(graph, data, buildNode);
    // Without the automatic layout, the nodes keep the positions stored in the data
    if (!autoLayout) return;
    await layoutGraph(graph, disableOptimalOrderHeuristic, extractNodesIds(data));
}

function updateGraph(graph: dia.Graph, json: SystemDiagramJSON, buildNode: BuildNode) {

    const nodes: dia.Graph.CellInit[] = [];
    const edges: dia.Graph.CellInit[] = [];

    const nodeIds = extractNodesIds(json);

    nodeIds.forEach(sourceId => {
        // node should always exist in the JSON
        const nodeJSON = json[sourceId];
        const nodeType = nodeJSON.type;

        const node = buildNode(nodeJSON as SystemTypedNodeData, sourceId.toString());
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
                const defaults = graph.getTypeDefaults(nodeType!);
                node.z = defaults.z ?? ZIndex.Node;
            }
        }

        nodes.push(node as dia.Graph.CellInit);
    });

    nodeIds.forEach(sourceId => {
        const nodeJSON = json[sourceId];
        const targets = nodeJSON.to || [];
        targets.forEach((target, sourceIndex) => {
            const targetId = target.id;
            if (!targetId) return;

            const edgeJSON: dia.Graph.CellInit = {
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
export async function layoutGraph(
    graph: dia.Graph,
    disableOptimalOrderHeuristic: boolean,
    /**
     * The ids of the nodes in the data order (the layout depends on the order of the nodes).
     */
    nodeIds?: dia.Cell.ID[]
): Promise<void> {

    const {
        fixedNodes,
        ...cells
    } = extractGraphCells(graph, nodeIds);

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
