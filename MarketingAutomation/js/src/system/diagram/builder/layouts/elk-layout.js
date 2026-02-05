import { dia } from '@joint/plus';
import ELK from 'elkjs/lib/elk-api';
import { SystemButton } from '../../models';
import { LAYOUT_BATCH_NAME } from '../../../../diagram/const';

/**
 * Initialized ELK layout engine with the worker URL.
 */
const elk = new ELK({
    workerUrl: './elk-worker.min.js',
});

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
    
    // Construct ELK Graph
    const elkGraph = getElkGraph([...nodes, ...edges, ...buttonLines, ...buttons], options);
    
    try {
        graph.startBatch(LAYOUT_BATCH_NAME);
        const laidOutGraph = await elk.layout(elkGraph);
        applyLayout(graph, laidOutGraph);
    }
    catch (error) {
        console.error('ELK layout error:', error);
    }
    finally {
        graph.stopBatch(LAYOUT_BATCH_NAME);
    }
}

function getElkGraph(cells, options) {
    
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
    
    const elkGraph = {
        id: 'root',
        layoutOptions,
        children: [],
        edges: []
    };
    
    const buildElement = (element) => {
        const size = element.size();
        const elkNode = {
            id: `${element.id}`,
            width: size.width,
            height: size.height,
            ports: [],
            children: []
        };
        
        elkGraph.children.push(elkNode);
    };
    
    const buildLink = (link) => {
        const sourceId = `${link.source().id}`;
        const targetId = `${link.target().id}`;
        if (!sourceId || !targetId) {
            return; // Skip if source or target is not defined
        }
        elkGraph.edges.push({
            id: `${link.id}`,
            sources: [sourceId],
            targets: [targetId]
        });
    };
    
    cells.forEach(cell => {
        if (cell instanceof dia.Element) {
            buildElement(cell);
        }
        else if (cell instanceof dia.Link) {
            buildLink(cell);
        }
    });
    
    return elkGraph;
}

function applyLayout(graph, elkGraph) {
    // Update Elements
    updateElements(elkGraph.children || [], graph);
    
    // Update Edges
    updateLinks(elkGraph.edges || [], graph);
}

function updateElements(nodes, graph) {
    nodes.forEach(node => {
        const element = graph.getCell(node.id);
        if (!element)
            return;
        
        let y = node.y || 0;
        
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
        
        element.position(node.x || 0, y);
    });
}

function updateLinks(edges, graph) {
    for (const edge of edges) {
        const { sections } = edge;
        if (!sections)
            continue;
        
        // Note: use only the bend points to update the link vertices
        // anchor is by default set to perpendicular on paper
        const [{ bendPoints = [] }] = sections;
        const link = graph.getCell(edge.id);
        link.vertices(bendPoints);
    }
}
