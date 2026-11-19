import { dia, highlighters, shapes } from '@joint/core';
import { generate } from './generate';
import BackwardLinksBadge from './BackwardLinksBadge';
import { centerRanks, isBackward, layoutRanked } from './layout';
import { exportToVisio } from './visio-export';

import type { connectors } from '@joint/core';
import type { ElementData, LinkData } from './generate';

import './styles.css';

const ELEMENT_WIDTH = 80;
const ELEMENT_HEIGHT = 36;
const HEADER_GAP = 24;
// The length of the arrowhead; its tip is at the end of the link.
const MARKER_SIZE = 8;

const rankColors = ['#264653', '#2a9d8f', '#8ab17d', '#e9c46a', '#f4a261', '#e76f51'];
const rankLabelColors = ['#fff', '#fff', '#264653', '#264653', '#264653', '#fff'];

const graph = new dia.Graph({}, { cellNamespace: shapes });

const paper = new dia.Paper({
    el: document.getElementById('paper'),
    model: graph,
    cellViewNamespace: shapes,
    width: '100%',
    height: '100%',
    async: true,
    frozen: true,
    background: { color: '#f8fafc' },
    interactive: false,
    clickThreshold: 10,
    defaultConnectionPoint: { name: 'anchor' }
});

const seedInput = document.getElementById('seed') as HTMLInputElement;
const randomizeButton = document.getElementById('randomize') as HTMLButtonElement;
const rangeInputs = ['ranks', 'empty-ranks', 'elements', 'links', 'backward-links'].map((id) => {
    return document.getElementById(id) as HTMLInputElement;
});
const [ranksInput, emptyRanksInput, elementsInput, linksInput, backwardLinksInput] = rangeInputs;
const jumpLinkRoomInput = document.getElementById('jump-link-room') as HTMLInputElement;
const centerRanksInput = document.getElementById('center-ranks') as HTMLInputElement;
const fadeBackwardLinksInput = document.getElementById('fade-backward-links') as HTMLInputElement;
// The opacity of a faded backward link; the highlight of a clicked element shows it in full.
const FADED_OPACITY = 0.2;
const curvatureInput = document.getElementById('curvature') as HTMLInputElement;
const exportVisioButton = document.getElementById('export-visio') as HTMLButtonElement;

// The curvature scales the length of the curve's end tangents (connector defaults: 0.6 and 80).
// Shorter tangents give a straighter middle.
// A backward link leaves its source to the left and enters its target from the right.
function getConnector(backward: boolean): connectors.ConnectorJSON {
    const curvature = Number(curvatureInput.value);
    return {
        name: 'curve',
        args: {
            sourceDirection: backward ? 'left' : 'right',
            targetDirection: backward ? 'right' : 'left',
            distanceCoefficient: curvature,
            angleTangentCoefficient: 40 * curvature
        }
    };
}

function createElement({ id, rank }: ElementData): dia.Element {
    const colorIndex = rank % rankColors.length;
    return new shapes.standard.Rectangle({
        id,
        rank,
        size: { width: ELEMENT_WIDTH, height: ELEMENT_HEIGHT },
        z: 2,
        attrs: {
            body: {
                fill: rankColors[colorIndex],
                stroke: 'rgba(0, 0, 0, 0.18)',
                rx: 4,
                ry: 4
            },
            label: {
                text: id,
                fill: rankLabelColors[colorIndex],
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'sans-serif'
            }
        }
    });
}

// A link leaves the right side of its source and enters the left side of its target, a backward link the other way round.
// An anchor on a given side is exported to Visio as glue to that point (`midSide` would be dynamic glue).
// A backward link is dashed and goes below the other links.
function createLink({ source, target }: LinkData, backward: boolean): dia.Link {
    return new shapes.standard.Link({
        source: { id: source, anchor: { name: backward ? 'left' : 'right' }},
        target: { id: target, anchor: { name: backward ? 'right' : 'left' }},
        z: backward ? 0 : 1,
        connector: getConnector(backward),
        attrs: {
            line: {
                stroke: '#8a90a6',
                strokeWidth: 1.5,
                strokeDasharray: backward ? '5 4' : 'none',
                opacity: (backward && fadeBackwardLinksInput.checked) ? FADED_OPACITY : 1,
                targetMarker: {
                    d: `M ${MARKER_SIZE} -4 0 0 ${MARKER_SIZE} 4 z`,
                    // Follows the stroke of the line, also when the highlight changes it.
                    fill: 'context-stroke'
                }
            }
        }
    });
}

// A label above the column of each rank (the center x of each column by rank).
function createRankHeaders(columns: Map<number, number>): dia.Element[] {
    const elements = graph.getElements();
    if (elements.length === 0) {
        return [];
    }
    const top = Math.min(...elements.map((element) => element.position().y));
    const sortedColumns = Array.from(columns).sort(([a], [b]) => a - b);
    return sortedColumns.map(([rank, x]) => new shapes.standard.Rectangle({
        header: true,
        position: { x: x - ELEMENT_WIDTH / 2, y: top - HEADER_GAP - ELEMENT_HEIGHT },
        size: { width: ELEMENT_WIDTH, height: ELEMENT_HEIGHT },
        attrs: {
            body: { fill: 'none', stroke: 'none' },
            label: {
                text: `Rank ${rank + 1}`,
                fill: '#475569',
                fontSize: 14,
                fontWeight: 600,
                fontFamily: 'sans-serif'
            }
        }
    }));
}

function updateConnectors() {
    graph.getLinks().forEach((link) => link.connector(getConnector(isBackward(link))));
}

function updateOutputs() {
    [...rangeInputs, curvatureInput].forEach((input) => {
        const output = document.querySelector(`output[for="${input.id}"]`) as HTMLOutputElement;
        output.textContent = input.value;
    });
}

function build() {
    // Only the ranks between the first and the last can be empty.
    emptyRanksInput.max = String(Number(ranksInput.value) - 2);
    updateOutputs();
    const { elements, links } = generate({
        seed: Number(seedInput.value),
        rankCount: Number(ranksInput.value),
        emptyRankCount: Number(emptyRanksInput.value),
        elementCount: Number(elementsInput.value),
        linkCount: Number(linksInput.value),
        backwardLinkCount: Number(backwardLinksInput.value)
    });
    const ranks = new Map(elements.map(({ id, rank }) => [id, rank]));
    graph.resetCells([
        ...elements.map(createElement),
        ...links.map((link) => createLink(link, ranks.get(link.target)! < ranks.get(link.source)!))
    ]);
    const columns = layoutRanked(graph, { jumpLinkRoom: jumpLinkRoomInput.checked });
    if (centerRanksInput.checked) {
        centerRanks(graph);
    }
    graph.addCells(createRankHeaders(columns));
    updateBadges();
    paper.transformToFitContent({
        padding: 40,
        maxScale: 1,
        useModelGeometry: true,
        horizontalAlign: 'middle',
        verticalAlign: 'middle'
    });
}

const SELECTED_HIGHLIGHT = 'ranked-selected';
const NEIGHBOR_HIGHLIGHT = 'ranked-neighbor';
const LINK_HIGHLIGHT = 'ranked-link';
const DIMMED_HIGHLIGHT = 'ranked-dimmed';

function clearHighlight() {
    [SELECTED_HIGHLIGHT, NEIGHBOR_HIGHLIGHT, LINK_HIGHLIGHT, DIMMED_HIGHLIGHT].forEach((id) => {
        dia.HighlighterView.removeAll(paper, id);
    });
}

// The backward links that leave the element.
function getBackwardLinks(element: dia.Element): dia.Link[] {
    return graph.getConnectedLinks(element, { outbound: true }).filter(isBackward);
}

const BADGE_HIGHLIGHT = 'ranked-badge';

// With the backward links faded, a badge on every source of some tells their number.
function updateBadges() {
    dia.HighlighterView.removeAll(paper, BADGE_HIGHLIGHT);
    // No badges while an element is selected.
    if (!fadeBackwardLinksInput.checked || dia.HighlighterView.getAll(paper, SELECTED_HIGHLIGHT).length > 0) {
        return;
    }
    graph.getElements().forEach((element) => {
        const count = getBackwardLinks(element).length;
        if (count === 0) {
            return;
        }
        BackwardLinksBadge.add(paper.requireView(element), 'root', BADGE_HIGHLIGHT, { count });
    });
}

// Highlights the element, its links and their other ends, and dims the rest.
// The badges are hidden meanwhile; the highlighted backward links are shown in full anyway.
function highlight(element: dia.Element) {
    clearHighlight();
    dia.HighlighterView.removeAll(paper, BADGE_HIGHLIGHT);
    const links = graph.getConnectedLinks(element);
    const neighbors = links.map((link) => {
        return (link.source().id === element.id) ? link.getTargetElement()! : link.getSourceElement()!;
    });
    const related = new Set<dia.Cell>([element, ...links, ...neighbors]);
    highlighters.mask.add(element.findView(paper), 'body', SELECTED_HIGHLIGHT, {
        padding: 4,
        attrs: { stroke: '#0f172a', strokeWidth: 3 }
    });
    neighbors.forEach((neighbor) => {
        highlighters.mask.add(neighbor.findView(paper), 'body', NEIGHBOR_HIGHLIGHT, {
            padding: 3,
            attrs: { stroke: '#0f172a', strokeWidth: 1.5 }
        });
    });
    links.forEach((link) => {
        highlighters.addClass.add(link.findView(paper), 'line', LINK_HIGHLIGHT, {
            className: 'ranked-link-highlighted'
        });
    });
    graph.getCells().forEach((cell) => {
        if (related.has(cell) || cell.get('header')) {
            return;
        }
        highlighters.addClass.add(cell.findView(paper), 'root', DIMMED_HIGHLIGHT, {
            className: 'ranked-dimmed'
        });
    });
}

function isBadgeEvent(evt: dia.Event): boolean {
    return Boolean((evt.target as Element).closest('[data-backward-badge]'));
}

paper.on('element:pointerclick', (elementView: dia.ElementView, evt: dia.Event) => {
    const element = elementView.model;
    if (element.get('header') || isBadgeEvent(evt)) {
        return;
    }
    highlight(element);
});

// Hovering a badge shows the backward links it counts.
const REVEALED_HIGHLIGHT = 'ranked-revealed';
paper.on('element:mouseover', (elementView: dia.ElementView, evt: dia.Event) => {
    dia.HighlighterView.removeAll(paper, REVEALED_HIGHLIGHT);
    if (!isBadgeEvent(evt)) {
        return;
    }
    getBackwardLinks(elementView.model).forEach((link) => {
        highlighters.addClass.add(link.findView(paper), 'line', REVEALED_HIGHLIGHT, {
            className: 'ranked-link-revealed'
        });
    });
});
paper.on('element:mouseleave', () => dia.HighlighterView.removeAll(paper, REVEALED_HIGHLIGHT));
paper.on('blank:pointerclick', () => {
    clearHighlight();
    updateBadges();
});

seedInput.addEventListener('input', () => build());
rangeInputs.forEach((input) => input.addEventListener('input', () => build()));
jumpLinkRoomInput.addEventListener('change', () => build());
centerRanksInput.addEventListener('change', () => build());
fadeBackwardLinksInput.addEventListener('change', () => {
    const opacity = fadeBackwardLinksInput.checked ? FADED_OPACITY : 1;
    graph.getLinks().filter(isBackward).forEach((link) => link.attr('line/opacity', opacity));
    updateBadges();
});
curvatureInput.addEventListener('input', () => {
    updateOutputs();
    updateConnectors();
});
randomizeButton.addEventListener('click', () => {
    seedInput.value = String(1 + Math.floor(Math.random() * 99999));
    build();
});
exportVisioButton.addEventListener('click', async() => {
    exportVisioButton.disabled = true;
    try {
        await exportToVisio(paper);
    } finally {
        exportVisioButton.disabled = false;
    }
});

build();
paper.unfreeze();
