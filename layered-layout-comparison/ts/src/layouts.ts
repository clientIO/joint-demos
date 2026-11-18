import { shapes } from '@joint/plus';
import { DirectedGraph } from '@joint/layout-directed-graph';
import { layout as elkLayout, createWorkerElk } from '@joint/layout-elk';
import { layout as msaglLayout, EdgeRoutingMode, LayerDirectionEnum } from '@joint/layout-msagl';
import ElkWorker from '@joint/layout-elk/worker?worker';

import type { dia } from '@joint/plus';
import type { Options as MsaglOptions } from '@joint/layout-msagl';

export type Engine = 'dagre' | 'elk' | 'msagl';
export type Direction = 'LR' | 'TB';

export interface LayoutSettings {
    engine: Engine;
    direction: Direction;
    // The space between elements in a layer.
    nodeSep: number;
    // The space between layers.
    rankSep: number;
}

export interface LayoutOptions {
    // The layer each element must be in (layers count from 0, along the direction).
    // Without it, the engine chooses the layers itself.
    getLayer?: (element: dia.Element) => number;
    signal?: AbortSignal;
}

// MSAGL ignores the length of a helper element thinner than a few pixels.
const HELPER_THICKNESS = 10;

// The graph dagre lays out (node ids are the element ids).
type DagreGraph = Parameters<DirectedGraph.CustomOrderCallback>[0];

// ELK runs in a Web Worker, so the page stays responsive while it lays out.
const elk = createWorkerElk(() => new ElkWorker());

// Lays out the cells (elements and the links between them) with the chosen engine.
// All three are layered (Sugiyama) layouts: the elements go in layers along the direction,
// ordered within each layer so that the links cross as little as possible.
// Each engine positions the elements, routes the links (vertices and anchors)
// and places the link labels, sized by the `labelSize` of the link.
export async function layoutCells(
    cells: dia.Cell[],
    settings: LayoutSettings,
    options: LayoutOptions = {}
): Promise<void> {
    const { engine, direction, nodeSep, rankSep } = settings;
    const { getLayer, signal } = options;
    switch (engine) {
        case 'dagre': {
            const cellsById = new Map(cells.map((cell) => [cell.id, cell]));
            DirectedGraph.layout(cells, {
                rankDir: direction,
                nodeSep,
                rankSep,
                edgeSep: 10,
                setVertices: true,
                setLabels: true,
                ...(getLayer && {
                    // TODO: relies on undocumented dagre behaviour, not in the `DirectedGraph` types:
                    // dagre calls a function `ranker` instead of its own ranking.
                    // Dagre doubles the length of every edge (to make room for labels), so the ranks are doubled too.
                    // Nodes dagre adds itself (the root of its nesting graph) go one rank before the first.
                    ranker: ((dagreGraph: DagreGraph) => {
                        dagreGraph.nodes().forEach((id) => {
                            const cell = cellsById.get(id);
                            dagreGraph.node(id).rank = (cell && cell.isElement()) ? 2 * getLayer(cell) : -2;
                        });
                    }) as unknown as DirectedGraph.LayoutOptions['ranker']
                })
            });
            return;
        }
        case 'elk': {
            await elkLayout(cells, {
                elk,
                signal,
                elkLayoutOptions: {
                    'elk.algorithm': 'layered',
                    'elk.direction': direction === 'LR' ? 'RIGHT' : 'DOWN',
                    'elk.edgeRouting': 'ORTHOGONAL',
                    'elk.spacing.nodeNode': nodeSep,
                    'elk.layered.spacing.nodeNodeBetweenLayers': rankSep,
                    'elk.spacing.edgeLabel': 4,
                    'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
                    // Partitions put the elements in layers in the order of the partitions.
                    // The connected components are laid out together, so they share the layers.
                    'elk.partitioning.activate': Boolean(getLayer),
                    'elk.separateConnectedComponents': !getLayer
                },
                exportElement: ({ element, elkNode }) => {
                    if (getLayer) {
                        elkNode.layoutOptions['elk.partitioning.partition'] = getLayer(element);
                        // The room for the labels at its links widens the element, and ELK centers the widened
                        // elements of a layer; aligned to the start of the layer, they line up.
                        elkNode.layoutOptions['elk.alignment'] = direction === 'LR' ? 'LEFT' : 'TOP';
                    }
                },
                exportLinkLabel: ({ elkEdgeLabel }) => {
                    // ELK gives a label in the middle of a link a layer of its own, which would put
                    // the elements after a labeled link one layer further than the partitions say.
                    // A label at the start of the link takes room next to its element instead.
                    if (getLayer) {
                        elkEdgeLabel.layoutOptions['elk.edgeLabels.placement'] = 'TAIL';
                    }
                }
            });
            return;
        }
        case 'msagl': {
            const msaglOptions: MsaglOptions = {
                layerDirection: direction === 'LR' ? LayerDirectionEnum.LR : LayerDirectionEnum.TB,
                nodeSeparation: nodeSep,
                layerSeparation: rankSep,
                edgeRoutingMode: EdgeRoutingMode.Rectilinear
            };
            if (getLayer) {
                layoutMsaglInLayers(cells, msaglOptions, direction, getLayer);
            } else {
                msaglLayout(cells, msaglOptions);
            }
            return;
        }
    }
}

// MSAGL lays out a link that skips layers in as few layers as it can, and each connected
// component on its own. `@joint/layout-msagl` does not pass layer constraints to MSAGL, so,
// for the layout only, invisible elements and links are added:
// - each link that skips layers is replaced by a chain of links through an invisible element
//   in each layer it skips; the route of the chain then becomes the route of the link,
// - an invisible root, one layer before the first, joins the components with a chain
//   to an element of each, so that they share the layers.
// Every link of a chain goes to the next layer, and the layers follow.
function layoutMsaglInLayers(
    cells: dia.Cell[],
    options: MsaglOptions,
    direction: Direction,
    getLayer: (element: dia.Element) => number
) {
    const graph = cells[0].graph;
    const elements = cells.filter((cell): cell is dia.Element => cell.isElement());
    const helpers: dia.Cell[] = [];

    // As long as the elements are in the direction of the layers, and thin across it.
    const { width, height } = elements[0].size();
    const createHelperElement = () => {
        const size = direction === 'LR' ? { width, height: HELPER_THICKNESS } : { width: HELPER_THICKNESS, height };
        const helper = new shapes.standard.Rectangle({ size });
        helpers.push(helper);
        return helper;
    };
    // The first link of a chain makes room for the label (it starts where the link does).
    const createChain = (source: dia.Element, target: dia.Element, span: number, labelSize?: dia.Size) => {
        const chain: dia.Link[] = [];
        let previous = source;
        for (let index = 1; index <= span; index++) {
            const next = (index < span) ? createHelperElement() : target;
            chain.push(new shapes.standard.Link({
                source: { id: previous.id },
                target: { id: next.id },
                labelSize: (index === 1) ? labelSize : undefined
            }));
            previous = next;
        }
        helpers.push(...chain);
        return chain;
    };

    const chains = new Map<dia.Link, dia.Link[]>();
    cells.forEach((cell) => {
        if (!cell.isLink()) {
            return;
        }
        const source = cell.getSourceElement()!;
        const target = cell.getTargetElement()!;
        const span = getLayer(target) - getLayer(source);
        if (span > 1) {
            chains.set(cell, createChain(source, target, span, cell.get('labelSize')));
        }
    });
    const root = createHelperElement();
    getComponents(elements).forEach((component) => {
        const first = component.reduce((a, b) => (getLayer(b) < getLayer(a)) ? b : a);
        createChain(root, first, getLayer(first) + 1);
    });

    graph.addCells(helpers);
    msaglLayout([
        ...cells.filter((cell) => !chains.has(cell as dia.Link)),
        ...helpers
    ], options);
    chains.forEach((chain, link) => {
        const first = chain[0];
        const last = chain[chain.length - 1];
        // The route goes through the invisible elements: in at one side, out at the other.
        // MSAGL may route the next link of the chain from a point a few pixels aside,
        // so that part of the route is moved across to go straight on (up to its first bend,
        // or its end, which then moves along the side of the target).
        const cross = (direction === 'LR') ? 'y' : 'x';
        const vertices: dia.Point[] = [];
        let targetShift = 0;
        chain.forEach((part, index) => {
            const partVertices = [...part.vertices()];
            if (index > 0) {
                const inPoint = vertices[vertices.length - 1];
                const outPoint = getEndPoint(part, 'source');
                const straight = partVertices.findIndex((vertex) => vertex[cross] !== outPoint[cross]);
                const end = (straight === -1) ? partVertices.length : straight;
                for (let i = 0; i < end; i++) {
                    partVertices[i] = { ...partVertices[i], [cross]: inPoint[cross] };
                }
                if (end === partVertices.length && index === chain.length - 1) {
                    targetShift = inPoint[cross] - outPoint[cross];
                }
                vertices.push({ ...outPoint, [cross]: inPoint[cross] });
            }
            vertices.push(...partVertices);
            if (index < chain.length - 1) {
                vertices.push(getEndPoint(part, 'target'));
            }
        });
        link.source({ ...link.source(), anchor: first.source().anchor });
        const targetAnchor = last.target().anchor as { name: 'modelCenter'; args: { dx: number; dy: number } };
        const offset = (cross === 'y') ? 'dy' : 'dx';
        targetAnchor.args = { ...targetAnchor.args, [offset]: targetAnchor.args[offset] + targetShift };
        link.target({ ...link.target(), anchor: targetAnchor });
        link.vertices(vertices);
        // The label is on the first link of the chain, which starts where the link does,
        // so its distance along the link is the same.
        if (link.labels().length > 0 && first.labels().length > 0) {
            link.label(0, { position: first.label(0).position });
        }
    });
    graph.removeCells(helpers);
}

// The elements, in groups of the elements linked to each other (directly or not).
function getComponents(elements: dia.Element[]): dia.Element[][] {
    const remaining = new Set(elements);
    const components: dia.Element[][] = [];
    remaining.forEach((element) => {
        const component = [element];
        remaining.delete(element);
        for (let index = 0; index < component.length; index++) {
            const graph = component[index].graph;
            graph.getNeighbors(component[index]).forEach((neighbor) => {
                if (remaining.delete(neighbor)) {
                    component.push(neighbor);
                }
            });
        }
        components.push(component);
    });
    return components;
}

// Where the link connects to its element, from the anchor MSAGL gave it (relative to the element center).
function getEndPoint(link: dia.Link, end: 'source' | 'target'): dia.Point {
    const element = (end === 'source') ? link.getSourceElement()! : link.getTargetElement()!;
    const { dx = 0, dy = 0 } = link.prop([end, 'anchor', 'args']) ?? {};
    return element.getBBox().center().offset(dx, dy).toJSON();
}
