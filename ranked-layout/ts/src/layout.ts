import { g } from '@joint/core';
import { DirectedGraph } from '@joint/layout-directed-graph';

import type { dia } from '@joint/core';

// The graph dagre lays out (node ids are the element ids).
type DagreGraph = Parameters<DirectedGraph.CustomOrderCallback>[0];

export interface RankedLayoutOptions {
    rankSep?: number;
    nodeSep?: number;
    // Keep room in every rank a link jumps over, and route the link through it.
    jumpLinkRoom?: boolean;
}

export function getRank(element: dia.Element): number {
    return element.get('rank');
}

export function getRankSpan(link: dia.Link): number {
    const source = link.getSourceElement();
    const target = link.getTargetElement();
    if (!source || !target) {
        return 0;
    }
    return getRank(target) - getRank(source);
}

// Lays the elements out left to right, each in the column of its rank.
// Dagre orders the elements within the ranks (fewer crossings, linked elements next to each other)
// and positions them (source and target aligned where possible); only the ranking is ours.
export function layoutRanked(graph: dia.Graph, options: RankedLayoutOptions = {}): g.Rect {
    const { rankSep = 120, nodeSep = 30, jumpLinkRoom = false } = options;
    // Without room for them, links that jump over ranks are left out of the layout
    // and drawn as a plain curve from their source to their target.
    const jumpLinks = graph.getLinks().filter((link) => getRankSpan(link) > 1);
    jumpLinks.forEach((link) => link.vertices([]));
    const cells = jumpLinkRoom
        ? graph.getCells()
        : graph.getCells().filter((cell) => !jumpLinks.includes(cell as dia.Link));
    return DirectedGraph.layout(cells, {
        rankDir: 'LR',
        rankSep,
        nodeSep,
        // TODO: relies on undocumented dagre behaviour, not in the `DirectedGraph` types:
        // dagre calls a function `ranker` instead of its own ranking.
        // Dagre doubles the length of every edge (to make room for labels), so the ranks are doubled too.
        // Nodes dagre adds itself (the root of its nesting graph) go one rank before the first.
        ranker: ((dagreGraph: DagreGraph) => {
            dagreGraph.nodes().forEach((id) => {
                const cell = graph.getCell(id);
                dagreGraph.node(id).rank = (cell && cell.isElement()) ? 2 * getRank(cell) : -2;
            });
        }) as unknown as DirectedGraph.LayoutOptions['ranker'],
        // Links between adjacent ranks are drawn as a plain curve;
        // links that jump over ranks pass through the room dagre keeps for them.
        setVertices: (link: dia.Link, points: dia.Point[]) => {
            if (getRankSpan(link) <= 1) {
                return;
            }
            const polyline = new g.Polyline(points);
            polyline.simplify({ threshold: 0.001 });
            link.vertices(polyline.points.slice(1, -1).map((point) => point.toJSON()));
        }
    });
}

// Post-process: keeps the order the layout gave the elements of each rank, but spaces them
// evenly so that the middle of each rank is the middle of the diagram.
// The link vertices from the layout no longer fit and are removed.
export function centerRanks(graph: dia.Graph, nodeSep = 30) {
    const elements = graph.getElements();
    const bbox = graph.getCellsBBox(elements);
    if (!bbox) {
        return;
    }
    const middle = bbox.center().y;
    const ranks = new Map<number, dia.Element[]>();
    elements.forEach((element) => {
        const rank = getRank(element);
        const rankElements = ranks.get(rank);
        if (rankElements) {
            rankElements.push(element);
        } else {
            ranks.set(rank, [element]);
        }
    });
    ranks.forEach((rankElements) => {
        rankElements.sort((a, b) => a.position().y - b.position().y);
        const step = Math.max(...rankElements.map((element) => element.size().height)) + nodeSep;
        const firstCenter = middle - step * (rankElements.length - 1) / 2;
        rankElements.forEach((element, index) => {
            const { x } = element.position();
            const { height } = element.size();
            element.position(x, firstCenter + index * step - height / 2);
        });
    });
    graph.getLinks().forEach((link) => link.vertices([]));
}
