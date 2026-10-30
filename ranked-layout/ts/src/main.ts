import { dia, highlighters, shapes } from '@joint/core';
import { generate } from './generate';
import { centerRanks, getRank, layoutRanked } from './layout';

import type { connectors } from '@joint/core';
import type { ElementData, LinkData } from './generate';

import './styles.css';

const ELEMENT_WIDTH = 80;
const ELEMENT_HEIGHT = 36;
const HEADER_GAP = 24;
// The length of the arrowhead; links end this far from the target, the arrowhead fills the rest.
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
    defaultAnchor: { name: 'midSide', args: { mode: 'horizontal' }},
    defaultConnectionPoint: { name: 'anchor' }
});

const seedInput = document.getElementById('seed') as HTMLInputElement;
const randomizeButton = document.getElementById('randomize') as HTMLButtonElement;
const rangeInputs = ['ranks', 'elements', 'links'].map((id) => {
    return document.getElementById(id) as HTMLInputElement;
});
const [ranksInput, elementsInput, linksInput] = rangeInputs;
const jumpLinkRoomInput = document.getElementById('jump-link-room') as HTMLInputElement;
const centerRanksInput = document.getElementById('center-ranks') as HTMLInputElement;
const curvatureInput = document.getElementById('curvature') as HTMLInputElement;

// The curvature scales the length of the curve's end tangents (connector defaults: 0.6 and 80).
// Shorter tangents give a straighter middle.
function getConnector(): connectors.ConnectorJSON {
    const curvature = Number(curvatureInput.value);
    return {
        name: 'curve',
        args: {
            sourceDirection: 'right',
            targetDirection: 'left',
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

function createLink({ source, target }: LinkData): dia.Link {
    return new shapes.standard.Link({
        source: { id: source },
        target: {
            id: target,
            anchor: { name: 'midSide', args: { mode: 'horizontal', padding: MARKER_SIZE }}
        },
        z: 1,
        connector: getConnector(),
        attrs: {
            line: {
                stroke: '#8a90a6',
                strokeWidth: 1.5,
                targetMarker: { d: `M 0 -4 ${-MARKER_SIZE} 0 0 4 z` }
            }
        }
    });
}

// A label above the column of each rank.
function createRankHeaders(): dia.Element[] {
    const elements = graph.getElements();
    if (elements.length === 0) {
        return [];
    }
    const top = Math.min(...elements.map((element) => element.position().y));
    const columns = new Map<number, number>();
    elements.forEach((element) => {
        columns.set(getRank(element), element.getBBox().center().x);
    });
    return Array.from(columns, ([rank, x]) => new shapes.standard.Rectangle({
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

function updateOutputs() {
    [...rangeInputs, curvatureInput].forEach((input) => {
        const output = document.querySelector(`output[for="${input.id}"]`) as HTMLOutputElement;
        output.textContent = input.value;
    });
}

function build() {
    updateOutputs();
    const { elements, links } = generate({
        seed: Number(seedInput.value),
        rankCount: Number(ranksInput.value),
        elementCount: Number(elementsInput.value),
        linkCount: Number(linksInput.value)
    });
    graph.resetCells([
        ...elements.map(createElement),
        ...links.map(createLink)
    ]);
    layoutRanked(graph, { jumpLinkRoom: jumpLinkRoomInput.checked });
    if (centerRanksInput.checked) {
        centerRanks(graph);
    }
    graph.addCells(createRankHeaders());
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

// Highlights the element, its links and its neighbors, and dims the rest.
function highlight(element: dia.Element) {
    clearHighlight();
    const links = graph.getConnectedLinks(element);
    const neighbors = graph.getNeighbors(element);
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

paper.on('element:pointerclick', (elementView: dia.ElementView) => {
    const element = elementView.model;
    if (element.get('header')) {
        return;
    }
    highlight(element);
});
paper.on('blank:pointerclick', () => clearHighlight());

seedInput.addEventListener('input', () => build());
rangeInputs.forEach((input) => input.addEventListener('input', () => build()));
jumpLinkRoomInput.addEventListener('change', () => build());
centerRanksInput.addEventListener('change', () => build());
curvatureInput.addEventListener('input', () => {
    updateOutputs();
    const connector = getConnector();
    graph.getLinks().forEach((link) => link.connector(connector));
});
randomizeButton.addEventListener('click', () => {
    seedInput.value = String(1 + Math.floor(Math.random() * 99999));
    build();
});

build();
paper.unfreeze();
