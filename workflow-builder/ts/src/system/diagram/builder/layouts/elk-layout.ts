import ELK from 'elkjs/lib/elk-api';
import { SystemEdge, SystemNode } from '../../models';
import { Attribute, LAYOUT_BATCH_NAME } from '../../const';

import type { dia } from '@joint/plus';
import type { AutoLayoutDiagramCells } from '../types';
import type { ElkNode, ElkPort, LayoutOptions } from 'elkjs/lib/elk-api';
import type { ElkExtendedEdge } from 'elkjs/lib/elk-api';

// Initialize ELK
const elk = new ELK({
    workerUrl: './elk-worker.min.js',
});

interface ElkLayoutOptions {
    /**
     * Disable the optimal order heuristic for crossing minimization.
     * This is useful to get a faster layout, but the result may not be optimal.
     */
    disableOptimalOrderHeuristic?: boolean;
}

export async function layoutCells(graph: dia.Graph, cells: AutoLayoutDiagramCells, options?: ElkLayoutOptions): Promise<void> {
    const {
        nodes,
        edges,
    } = cells;

    // Construct ELK Graph
    const elkGraph = getElkGraph([...nodes, ...edges], options);

    try {
        graph.startBatch(LAYOUT_BATCH_NAME);
        const laidOutGraph = await elk.layout(elkGraph);
        applyLayout(graph, laidOutGraph);
    } catch (error) {
        console.error('ELK layout error:', error);
    } finally {
        graph.stopBatch(LAYOUT_BATCH_NAME);
    }
}


function getElkGraph(cells: dia.Cell[], options?: ElkLayoutOptions): ElkNode {

    const layoutOptions: LayoutOptions = {
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

    const elkGraph: ElkNode = {
        id: 'root',
        layoutOptions,
        children: [],
        edges: []
    };

    const buildElement = (element: SystemNode) => {
        const size = element.size();
        const partitionIndex = element.get(Attribute.PartitionIndex) == null ? '1000' : (element.get(Attribute.PartitionIndex) as number).toString();
        const elkNode: ElkNode = {
            id: `${element.id}`,
            width: size.width,
            height: size.height,
            ports: element.getPorts().map(port => {
                const rect = element.getPortRelativeRect(port.id!);
                return {
                    id: `${element.id}_${port.id}`,
                    width: rect.width,
                    height: rect.height,
                    x: rect.x,
                    y: rect.y,
                } as ElkPort;
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
            elkNode.layoutOptions!['elk.layered.layering.layerChoiceConstraint'] = '0';
        }

        elkGraph.children!.push(elkNode);
    };

    const buildLink = (link: dia.Link) => {
        const sourceId = `${link.source().id}`;
        const targetId = `${link.target().id}`;
        if (!sourceId || !targetId) {
            return; // Skip if source or target is not defined
        }

        const sourcePort = link.source().port;
        const targetPort = link.target().port;

        elkGraph.edges!.push({
            id: `${link.id}`,
            sources: [`${sourceId}${sourcePort ? '_' + sourcePort : ''}`],
            targets: [`${targetId}${targetPort ? '_' + targetPort : ''}`],
        });
    };

    cells.forEach(cell => {
        if (cell instanceof SystemNode) {
            buildElement(cell);
        } else if (cell instanceof SystemEdge) {
            buildLink(cell);
        }
    });

    return elkGraph;
}


function applyLayout(graph: dia.Graph, elkGraph: ElkNode) {
    // Update Elements
    updateElements(elkGraph.children || [], graph);

    // Update Edges
    updateLinks(elkGraph.edges || [], graph);
}

function updateElements(nodes: ElkNode[], graph: dia.Graph) {
    nodes.forEach(node => {
        const element = graph.getCell(node.id) as dia.Element;
        if (!element) return;

        element.position(node.x!, node.y!);
    });
}

function updateLinks(edges: ElkExtendedEdge[], graph: dia.Graph): void {
    for (const edge of edges) {
        const { sections } = edge;
        if (!sections) continue;

        const linkAttributes: dia.Link.Attributes = {};
        const [{ bendPoints = [] }] = sections;

        // Update link vertices (bend points)
        // Update link source and target anchors (startPoint, endPoint)
        const link = graph.getCell(edge.id) as dia.Link;
        linkAttributes.vertices = bendPoints;
        link.set(linkAttributes);
    }
}
