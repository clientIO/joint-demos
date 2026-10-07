import { layout } from '@joint/layout-elk';
import { SystemButton } from '../../models';
import { LAYOUT_BATCH_NAME } from '../../../../diagram/const';

/**
 * Layout configuration values.
 */
const LayoutConfig = {
    NodeNode: 50,
    EdgeNodeBetweenLayers: 50,
    EdgeEdgeBetweenLayers: 25,
    NodeNodeBetweenLayers: 100,
};

export async function layoutCells(graph, cells, options) {
    const { nodes, edges, buttons, buttonLines, } = cells;

    try {
        graph.startBatch(LAYOUT_BATCH_NAME);
        // Lay out the given cells only (e.g. not the notes), in the order ELK should consider
        await layout({
            graph,
            elements: [...nodes, ...buttons],
            links: [...edges, ...buttonLines]
        }, {
            elkLayoutOptions: getElkLayoutOptions(options),
            // The edge labels are not taken into account
            exportLinkLabel: () => false,
            setElementAttributes: ({ element, attributes }) => {
                updateElement(element, attributes.position, graph);
            },
            setLinkAttributes: ({ link, attributes }) => {
                // Note: use only the bend points to update the link vertices
                // anchor is by default set to perpendicular on paper
                link.vertices(attributes.vertices);
            }
        });
    }
    catch (error) {
        console.warn('ELK layout error:', error);
    }
    finally {
        graph.stopBatch(LAYOUT_BATCH_NAME);
    }
}

function getElkLayoutOptions(options) {

    const layoutOptions = {
        // Use layered layout algorithm
        'elk.algorithm': 'layered',

        // Layout the graph from top to bottom
        'elk.direction': 'DOWN',

        // Route edges orthogonally (perpendicular to the nodes)
        'elk.edgeRouting': 'ORTHOGONAL',

        // Ensure the feedback edges are routed to the side of graph.
        'elk.layered.feedbackEdges': 'true',

        // Layout the graph based on order of edges we provided in the model.
        'elk.layered.considerModelOrder.strategy': 'PREFER_EDGES',

        // Use DFS node order for cycle breaking
        'elk.layered.cycleBreaking.strategy': 'DFS_NODE_ORDER',

        // Don't reorder nodes within a layer during crossing minimization
        'elk.layered.crossingMinimization.forceNodeModelOrder': 'true',

        // Center layers as a whole
        'elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',

        // Spacing between layers
        'elk.layered.spacing.nodeNodeBetweenLayers': `${LayoutConfig.NodeNodeBetweenLayers}`,

        // Spacing to be preserved between nodes on the same layer.
        'elk.spacing.nodeNode': `${LayoutConfig.NodeNode}`,

        // The spacing to be preserved between nodes and edges that are routed next to the node’s layer.
        'elk.layered.spacing.edgeNodeBetweenLayers': `${LayoutConfig.EdgeNodeBetweenLayers}`,

        // Spacing to be preserved between pairs of edges that are routed between the same pair of layers.
        'elk.layered.spacing.edgeEdgeBetweenLayers': `${LayoutConfig.EdgeEdgeBetweenLayers}`,
    };

    if (options?.disableOptimalOrderHeuristic) {
        Object.assign(layoutOptions, {
            // No crossing minimization is done (at all)
            'elk.layered.crossingMinimization.strategy': 'NONE',

            // Disables greedy switch for crossing minimization
            'elk.layered.crossingMinimization.greedySwitch.type': 'OFF',
        });
    }

    return layoutOptions;
}

function updateElement(element, position, graph) {
    let { y } = position;

    // Apply custom logic for SystemButton
    if (SystemButton.isButton(element)) {
        const [parent] = graph.getNeighbors(element, { inbound: true });
        if (parent) {
            const { height } = element.size();
            const siblings = graph.getNeighbors(parent, { outbound: true });
            if (siblings.length === 1) {
                // There are no other siblings, position the button below the parent
                y -= (LayoutConfig.NodeNodeBetweenLayers + height) / 2;
            }
            else {
                // Align the button vertically to another sibling
                const sibling = siblings.find(sib => sib.id !== element.id);
                const { height: siblingHeight } = sibling.size();
                y += (siblingHeight - height) / 2;
            }
        }
    }

    element.position(position.x, y);
}
