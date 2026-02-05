import ELK from 'elkjs/lib/elk-api';
import { SystemEdge, SystemNode } from '../../models';
import { Attribute, LAYOUT_BATCH_NAME } from '../../const';

// Initialize ELK
const elk = new ELK({
    workerUrl: './elk-worker.min.js',
});

export async function layoutCells(graph, cells, options) {
    const { nodes, edges, } = cells;
    
    // Construct ELK Graph
    const elkGraph = getElkGraph([...nodes, ...edges], options);
    
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
        'elk.algorithm': 'layered',
        'elk.direction': 'RIGHT',
        'elk.separateConnectedComponents': 'false',
        'elk.edgeRouting': 'ORTHOGONAL',
        'elk.partitioning.activate': 'true',
        'elk.layered.spacing.nodeNodeBetweenLayers': '100',
        'elk.spacing.edgeNode': '50',
        'elk.layered.spacing.edgeNodeBetweenLayers': '50',
        'elk.layered.feedbackEdges': 'true',
        
        // Preserve model order
        'elk.layered.considerModelOrder.strategy': 'PREFER_EDGES',
        'elk.layered.cycleBreaking.strategy': 'DFS_NODE_ORDER',
        
        // Don't reorder nodes within a layer during crossing minimization
        'elk.layered.crossingMinimization.forceNodeModelOrder': 'true',
        
        // Center layers as a whole (optional)
        'elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
        
        // Ports
        'elk.layered.considerModelOrder.portModelOrder': 'true'
    };
    
    if (options?.disableOptimalOrderHeuristic) {
        Object.assign(layoutOptions, {
            'elk.layered.crossingMinimization.strategy': 'NONE', // No crossing minimization is done (at all)
            'elk.layered.crossingMinimization.greedySwitch.type': 'OFF', // Disables greedy switch
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
        const partitionIndex = element.get(Attribute.PartitionIndex) == null ? '1000' : element.get(Attribute.PartitionIndex).toString();
        const elkNode = {
            id: `${element.id}`,
            width: size.width,
            height: size.height,
            ports: element.getPorts().map(port => {
                const rect = element.getPortRelativeRect(port.id);
                return {
                    id: `${element.id}_${port.id}`,
                    width: rect.width,
                    height: rect.height,
                    x: rect.x,
                    y: rect.y,
                };
            }),
            children: [],
            layoutOptions: {
                'elk.portConstraints': 'FIXED_POS',
                'elk.partitioning.partition': partitionIndex,
            },
            labels: element.getLabelsRelativeRects().map(rect => ({
                text: '-', // some text is required (ELK ignores empty labels)
                width: rect.width,
                height: rect.height,
                x: rect.x,
                y: rect.y,
            }))
        };
        
        if (element.get('type') === 'trigger') {
            elkNode.layoutOptions['elk.layered.layering.layerChoiceConstraint'] = '0';
        }
        
        elkGraph.children.push(elkNode);
    };
    
    const buildLink = (link) => {
        const sourceId = `${link.source().id}`;
        const targetId = `${link.target().id}`;
        if (!sourceId || !targetId) {
            return; // Skip if source or target is not defined
        }
        
        const sourcePort = link.source().port;
        const targetPort = link.target().port;
        
        elkGraph.edges.push({
            id: `${link.id}`,
            sources: [`${sourceId}${sourcePort ? '_' + sourcePort : ''}`],
            targets: [`${targetId}${targetPort ? '_' + targetPort : ''}`],
        });
    };
    
    cells.forEach(cell => {
        if (cell instanceof SystemNode) {
            buildElement(cell);
        }
        else if (cell instanceof SystemEdge) {
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
        
        element.position(node.x, node.y);
    });
}

function updateLinks(edges, graph) {
    for (const edge of edges) {
        const { sections } = edge;
        if (!sections)
            continue;
        
        const linkAttributes = {};
        const [{ bendPoints = [] }] = sections;
        
        // Update link vertices (bend points)
        // Update link source and target anchors (startPoint, endPoint)
        const link = graph.getCell(edge.id);
        linkAttributes.vertices = bendPoints;
        link.set(linkAttributes);
    }
}
