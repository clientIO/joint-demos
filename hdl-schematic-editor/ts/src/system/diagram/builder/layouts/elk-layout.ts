import { layout } from '@joint/layout-elk';
import { Attribute, LAYOUT_BATCH_NAME } from '../../const';

import type { dia } from '@joint/plus';
import type { SystemNode } from '../../models';
import type { AutoLayoutDiagramCells } from '../types';
import type { ElkLayoutOptions } from '@joint/layout-elk';

interface LayoutCellsOptions {
    /**
     * Disable the optimal order heuristic for crossing minimization.
     * This is useful to get a faster layout, but the result may not be optimal.
     */
    disableOptimalOrderHeuristic?: boolean;
}

export async function layoutCells(graph: dia.Graph, cells: AutoLayoutDiagramCells, options?: LayoutCellsOptions): Promise<void> {
    const {
        nodes,
        edges,
    } = cells;

    try {
        graph.startBatch(LAYOUT_BATCH_NAME);
        // Lay out the given cells only (e.g. not the notes), in the order ELK should consider
        await layout({ graph, elements: nodes, links: edges }, {
            elkLayoutOptions: getElkLayoutOptions(options),
            exportElement: ({ element, elkNode }) => {
                const node = element as SystemNode;
                const partitionIndex = node.get(Attribute.PartitionIndex) == null ? '1000' : (node.get(Attribute.PartitionIndex) as number).toString();
                Object.assign(elkNode.layoutOptions, {
                    'elk.portConstraints': 'FIXED_POS',
                    'elk.partitioning.partition': partitionIndex,
                });
                elkNode.labels = node.getLabelsRelativeRects().map(rect => ({
                    text: '-', // some text is required (ELK ignores empty labels)
                    width: rect.width,
                    height: rect.height,
                    x: rect.x,
                    y: rect.y,
                    layoutOptions: {}
                }));
            },
            // Edge labels (e.g. bus widths) are decorations placed along the edge,
            // they should not take part in the layout.
            exportLinkLabel: () => false,
            // The edges are routed by the avoid router (libavoid) after the nodes are moved,
            // only the node positions computed by ELK are used.
            setLinkAttributes: () => {}
        });
    } catch (error) {
        console.warn('ELK layout error:', error);
    } finally {
        graph.stopBatch(LAYOUT_BATCH_NAME);
    }
}

function getElkLayoutOptions(options?: LayoutCellsOptions): ElkLayoutOptions {

    const layoutOptions: ElkLayoutOptions = {
        'elk.algorithm': 'layered',
        'elk.direction': 'RIGHT',
        'elk.separateConnectedComponents': 'false',
        'elk.edgeRouting': 'ORTHOGONAL',
        'elk.partitioning.activate': 'true',
        'elk.layered.spacing.nodeNodeBetweenLayers': '40',
        'elk.spacing.nodeNode': '30',
        'elk.spacing.edgeNode': '20',
        'elk.spacing.edgeEdge': '10',
        'elk.layered.spacing.edgeNodeBetweenLayers': '20',
        'elk.layered.spacing.edgeEdgeBetweenLayers': '10',
        'elk.layered.feedbackEdges': 'true',

        // Keep the data order where it does not hurt the layout quality
        'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',

        // Straight, evenly distributed wires
        'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
    };

    if (options?.disableOptimalOrderHeuristic) {
        Object.assign(layoutOptions, {
            'elk.layered.crossingMinimization.strategy': 'NONE', // No crossing minimization is done (at all)
            'elk.layered.crossingMinimization.greedySwitch.type': 'OFF', // Disables greedy switch
        });
    }

    return layoutOptions;
}
