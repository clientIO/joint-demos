import { dia, g, highlighters, shapes, ui } from '@joint/plus';
import { categories, entities, flows } from './data';
import { layoutCells } from './layouts';
import { createNavigator } from './navigator';
import { Entity, shapesNamespace } from './shapes';

import type { CategoryData, EntityData, FlowData } from './data';
import type { Direction, Engine, LayoutSettings } from './layouts';

import '@joint/plus/joint-plus.css';
import './styles.css';

// The length of the arrowhead, which ends at the end of the link (on the border of the target).
const MARKER_SIZE = 8;
const LABEL_FONT_SIZE = 11;
const LABEL_PADDING = { horizontal: 6, vertical: 3 };
// The space between the category summary and the diagram.
const LANE_GAP = 80;
// The space around the diagram, in the scroller and when it is fitted to the screen.
const PADDING = 40;
// How far the pointer may move for a click (farther, it is a pan).
const CLICK_THRESHOLD = 10;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;

const categoryColors: Record<string, string> = {
    'raw-materials': '#0ea5e9',
    'processing': '#8b5cf6',
    'materials-hub': '#ec4899',
    'tier-2': '#10b981',
    'tier-1': '#f59e0b',
    'assembly': '#f97316',
    'distribution': '#64748b'
};

const categoryById = new Map(categories.map((category) => [category.id, category]));
const entityById = new Map(entities.map((entity) => [entity.id, entity]));
// The layer of each category: its index in the list of categories.
const categoryLayers = new Map(categories.map((category, index) => [category.id, index]));

const graph = new dia.Graph({}, { cellNamespace: shapesNamespace });

const paper = new dia.Paper({
    model: graph,
    cellViewNamespace: shapesNamespace,
    async: true,
    frozen: true,
    interactive: false,
    clickThreshold: CLICK_THRESHOLD,
    background: { color: '#f8fafc' },
    defaultConnectionPoint: { name: 'boundary' },
    defaultConnector: {
        name: 'straight',
        args: { cornerType: 'cubic', cornerRadius: 6 }
    }
});

// The paper grows with the diagram, and the scroller scrolls and zooms it.
const scroller = new ui.PaperScroller({
    paper,
    autoResizePaper: true,
    contentOptions: { padding: PADDING, useModelGeometry: true, allowNewOrigin: 'any' },
    baseWidth: 1,
    baseHeight: 1,
    cursor: 'grab'
});
document.getElementById('scroller')!.appendChild(scroller.el);
scroller.render();

const navigator = createNavigator(scroller);
document.getElementById('navigator')!.appendChild(navigator.el);
navigator.render();

const engineInputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="engine"]'));
const directionInputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="direction"]'));
const nodeSepInput = document.getElementById('node-sep') as HTMLInputElement;
const rankSepInput = document.getElementById('rank-sep') as HTMLInputElement;
const labelsInput = document.getElementById('transport-labels') as HTMLInputElement;
const laneInput = document.getElementById('category-lane') as HTMLInputElement;
const alignInput = document.getElementById('align-layers') as HTMLInputElement;
const fitButton = document.getElementById('fit') as HTMLButtonElement;
const statsEl = document.getElementById('stats') as HTMLElement;
const detailsEl = document.getElementById('details') as HTMLElement;

function checkedValue<T extends string>(inputs: HTMLInputElement[]): T {
    return inputs.find((input) => input.checked)!.value as T;
}

function getSettings(): LayoutSettings {
    return {
        engine: checkedValue<Engine>(engineInputs),
        direction: checkedValue<Direction>(directionInputs),
        nodeSep: Number(nodeSepInput.value),
        rankSep: Number(rankSepInput.value)
    };
}

function getColor(categoryId: string): string {
    return categoryColors[categoryId] ?? '#94a3b8';
}

function createEntity(entity: EntityData): dia.Element {
    const color = getColor(entity.category);
    return new Entity({
        id: entity.id,
        category: entity.category,
        // The color of the element on the map (see `navigator.ts`).
        color,
        attrs: {
            accent: { fill: color },
            category: { text: categoryById.get(entity.category)?.label.toUpperCase(), fill: color },
            name: { text: entity.name },
            code: { text: entity.code }
        }
    });
}

// A node of the category summary, filled with the color of its category.
function createSummaryNode(category: CategoryData): dia.Element {
    const color = getColor(category.id);
    return new Entity({
        id: `summary-${category.id}`,
        category: category.id,
        isSummary: true,
        color,
        attrs: {
            body: { fill: color, stroke: color },
            accent: { fill: 'rgba(255, 255, 255, 0.35)' },
            category: { text: 'CATEGORY', fill: 'rgba(255, 255, 255, 0.8)' },
            name: { text: category.label, fill: '#ffffff' },
            code: { text: '' }
        }
    });
}

// The links of the category summary: from each category to the next one.
function getSummaryFlows(): FlowData[] {
    return categories.slice(1).map((category, index) => ({
        id: `summary-flow-${index}`,
        source: `summary-${categories[index].id}`,
        target: `summary-${category.id}`
    }));
}

const measureContext = document.createElement('canvas').getContext('2d')!;
measureContext.font = `${LABEL_FONT_SIZE}px Inter, system-ui, sans-serif`;

function getTransportLabel({ transport }: FlowData): dia.Link.Label | null {
    if (!transport) {
        return null;
    }
    const text = `${transport.mode} · ${transport.days} d`;
    const size = {
        width: Math.ceil(measureContext.measureText(text).width) + 2 * LABEL_PADDING.horizontal,
        height: LABEL_FONT_SIZE + 2 * LABEL_PADDING.vertical + 2
    };
    return {
        size,
        markup: [{ tagName: 'rect', selector: 'labelBody' }, { tagName: 'text', selector: 'labelText' }],
        attrs: {
            labelBody: {
                x: -size.width / 2,
                y: -size.height / 2,
                width: size.width,
                height: size.height,
                rx: 4,
                ry: 4,
                fill: '#ffffff',
                stroke: '#cbd5e1'
            },
            labelText: {
                text,
                fontSize: LABEL_FONT_SIZE,
                fontFamily: 'Inter, system-ui, sans-serif',
                fill: '#334155',
                textAnchor: 'middle',
                textVerticalAnchor: 'middle'
            }
        }
    };
}

function createFlow(flow: FlowData, showLabels: boolean): dia.Link {
    const label = showLabels ? getTransportLabel(flow) : null;
    return new shapes.standard.Link({
        id: flow.id,
        source: { id: flow.source },
        target: { id: flow.target },
        // ELK reads the size of each label, dagre and MSAGL read `labelSize` (one label per link).
        labels: label ? [label] : [],
        labelSize: label?.size,
        attrs: {
            line: {
                stroke: '#94a3b8',
                strokeWidth: 1.5,
                targetMarker: {
                    d: `M 0 0 ${MARKER_SIZE} -4 ${MARKER_SIZE} 4 z`,
                    // Follows the stroke of the line, also when the highlight changes it.
                    fill: 'context-stroke'
                }
            }
        }
    });
}

function getCategory(element: dia.Element): string {
    return element.get('category');
}

// Every element in the layer of its category.
function getLayer(element: dia.Element): number {
    return categoryLayers.get(getCategory(element)) ?? 0;
}

// Puts each node of the category summary in line with the layer of its category:
// above the diagram when the layers run from left to right, to its left otherwise.
function placeLaneOverLayers(laneElements: dia.Element[], diagramElements: dia.Element[], bbox: g.Rect, direction: Direction) {
    laneElements.forEach((laneElement) => {
        const layerElement = diagramElements.find((element) => getCategory(element) === getCategory(laneElement));
        if (!layerElement) {
            return;
        }
        const center = layerElement.getBBox().center();
        const { width, height } = laneElement.size();
        if (direction === 'LR') {
            laneElement.position(center.x - width / 2, bbox.y - LANE_GAP - height);
        } else {
            laneElement.position(bbox.x - LANE_GAP - width, center.y - height / 2);
        }
    });
}

// Moves the cells (elements, and the vertices of links) by the given offset.
function translateCells(cells: dia.Cell[], dx: number, dy: number) {
    cells.forEach((cell) => (cell as dia.Element | dia.Link).translate(dx, dy));
}

let layoutController: AbortController | null = null;

// Rebuilds the graph from the data and lays it out with the current settings.
// The category summary goes in a lane of its own: above the diagram when the layers run
// from left to right, to its left otherwise. With the layers aligned by category, each summary
// node is in line with the layer of its category; otherwise, the same engine lays the lane out.
async function build() {
    layoutController?.abort();
    const controller = new AbortController();
    layoutController = controller;

    const settings = getSettings();
    const showLane = laneInput.checked;
    const showLabels = labelsInput.checked;
    const alignLayers = alignInput.checked;

    const entityCells = entities.map(createEntity);
    const flowCells = flows.map((flow) => createFlow(flow, showLabels));
    const laneCells = showLane
        ? [
            ...categories.map(createSummaryNode),
            ...getSummaryFlows().map((flow) => createFlow(flow, false))
        ]
        : [];

    // The cells are laid out before they are added to the graph, so the graph
    // keeps showing the previous layout while ELK runs in its worker.
    const layoutGraph = new dia.Graph({}, { cellNamespace: shapesNamespace });
    layoutGraph.addCells([...entityCells, ...flowCells, ...laneCells]);
    const diagramCells = [...entityCells, ...flowCells];
    const start = performance.now();
    let bbox: g.Rect;
    try {
        await layoutCells(diagramCells, settings, {
            getLayer: alignLayers ? getLayer : undefined,
            signal: controller.signal
        });
        // Measured the same way for every engine: the elements and the routes of the links.
        bbox = layoutGraph.getCellsBBox(diagramCells)!;
        if (laneCells.length > 0 && alignLayers) {
            const laneElements = laneCells.filter((cell): cell is dia.Element => cell.isElement());
            placeLaneOverLayers(laneElements, entityCells, bbox, settings.direction);
        } else if (laneCells.length > 0) {
            await layoutCells(laneCells, settings, { signal: controller.signal });
            const laneBBox = layoutGraph.getCellsBBox(laneCells)!;
            if (settings.direction === 'LR') {
                translateCells(laneCells, bbox.x - laneBBox.x, bbox.y - LANE_GAP - laneBBox.y - laneBBox.height);
            } else {
                translateCells(laneCells, bbox.x - LANE_GAP - laneBBox.x - laneBBox.width, bbox.y - laneBBox.y);
            }
        }
    } catch (error) {
        // A newer build aborted this one.
        if (controller.signal.aborted) {
            return;
        }
        throw error;
    }
    const time = performance.now() - start;

    layoutGraph.removeCells(layoutGraph.getCells());
    // A focus waiting for its delay would go to an element of the graph about to be replaced
    // (while ELK runs, the pointer can still move over the elements of the previous layout).
    cancelHoverFocus();
    graph.resetCells([...diagramCells, ...laneCells]);
    paper.once('render:done', () => {
        // A newer build has replaced the graph in the meantime.
        if (layoutController !== controller) return;
        updateStats(time, bbox);
        restoreSelection();
    });
    fitContent();
}

function fitContent() {
    scroller.zoomToFit({ padding: PADDING, maxScale: 1, useModelGeometry: true });
}

// The points a link passes through, without the ones on a straight line.
function getLinkPolyline(link: dia.Link): g.Polyline {
    const linkView = link.findView(paper) as dia.LinkView;
    const polyline = new g.Polyline([linkView.sourcePoint, ...linkView.route, linkView.targetPoint]);
    polyline.simplify({ threshold: 0.5 });
    return polyline;
}

// Counts the bends and the crossings of the links in the diagram (the category lane excluded).
// Links that share an element meet at it, which does not count as a crossing.
function measureLinks() {
    const links = graph.getLinks().filter((link) => !link.getSourceElement()?.get('isSummary'));
    const polylines = links.map(getLinkPolyline);
    let bends = 0;
    let crossings = 0;
    polylines.forEach((polyline, i) => {
        bends += polyline.points.length - 2;
        const ends = [links[i].source().id, links[i].target().id];
        for (let j = i + 1; j < polylines.length; j++) {
            if (ends.includes(links[j].source().id) || ends.includes(links[j].target().id)) {
                continue;
            }
            const other = polylines[j];
            for (let k = 0; k < other.points.length - 1; k++) {
                const segment = new g.Line(other.points[k], other.points[k + 1]);
                crossings += polyline.intersectionWithLine(segment)?.length ?? 0;
            }
        }
    });
    return { bends, crossings };
}

function updateStats(time: number, bbox: g.Rect) {
    const { bends, crossings } = measureLinks();
    const rows: [string, string][] = [
        ['Layout time', `${Math.round(time)} ms`],
        ['Diagram size', `${Math.round(bbox.width)} × ${Math.round(bbox.height)}`],
        ['Link crossings', String(crossings)],
        ['Link bends', String(bends)]
    ];
    statsEl.replaceChildren(...rows.flatMap(([term, value]) => {
        const dt = document.createElement('dt');
        dt.textContent = term;
        const dd = document.createElement('dd');
        dd.textContent = value;
        return [dt, dd];
    }));
}

// Focus: the hovered (or else the selected) element, everything upstream and downstream of it,
// and the links between them. The rest is dimmed.

const SELECTED_HIGHLIGHT = 'selected';
const PATH_HIGHLIGHT = 'path';
const DIMMED_HIGHLIGHT = 'dimmed';

let selectedId: dia.Cell.ID | null = null;

// Hovering focuses on an element after a short delay, so that moving the pointer across the
// diagram does not flash the focus of every element on the way.
const HOVER_DELAY = 200;
let hoverTimer: number | undefined;
let isHoverFocused = false;

function cancelHoverFocus() {
    window.clearTimeout(hoverTimer);
    isHoverFocused = false;
}

function clearHighlight() {
    [SELECTED_HIGHLIGHT, PATH_HIGHLIGHT, DIMMED_HIGHLIGHT].forEach((id) => {
        dia.HighlighterView.removeAll(paper, id);
    });
}

function getSelected(): dia.Element | null {
    const element = selectedId === null ? null : graph.getCell(selectedId);
    return (element && element.isElement()) ? element : null;
}

function select(element: dia.Element | null) {
    selectedId = element ? element.id : null;
    focus(element);
}

function focus(element: dia.Element | null) {
    clearHighlight();
    showDetails(element);
    if (!element) {
        return;
    }
    const upstream = graph.getPredecessors(element);
    const downstream = graph.getSuccessors(element);
    // The links between the element, its upstream and its downstream elements.
    const related = new Set<dia.Cell>(graph.getSubgraph([element, ...upstream, ...downstream]));
    highlighters.mask.add(element.findView(paper), 'body', SELECTED_HIGHLIGHT, {
        padding: 4,
        attrs: { stroke: '#0f172a', strokeWidth: 2.5, rx: 8, ry: 8 }
    });
    graph.getCells().forEach((cell) => {
        const cellView = cell.findView(paper);
        if (!related.has(cell)) {
            highlighters.addClass.add(cellView, 'root', DIMMED_HIGHLIGHT, { className: 'dimmed' });
        } else if (cell.isLink()) {
            highlighters.addClass.add(cellView, 'line', PATH_HIGHLIGHT, { className: 'path-link' });
        }
    });
}

// Focuses again on the element selected before the graph was rebuilt.
function restoreSelection() {
    focus(getSelected());
}

function showDetails(element: dia.Element | null) {
    if (!element) {
        detailsEl.textContent = 'Hover over or click an element to see where its goods come from and where they go.';
        return;
    }
    const category = categoryById.get(getCategory(element))?.label ?? '';
    const entity = entityById.get(String(element.id));
    const rows: [string, string][] = entity
        ? [
            ['Name', entity.name],
            ['Category', category],
            ['Code', entity.code],
            ['Region', entity.region]
        ]
        : [['Category', category]];
    const dl = document.createElement('dl');
    dl.append(...rows.flatMap(([term, value]) => {
        const dt = document.createElement('dt');
        dt.textContent = term;
        const dd = document.createElement('dd');
        dd.textContent = value;
        return [dt, dd];
    }));
    detailsEl.replaceChildren(dl);
}

paper.on('element:pointerclick', (elementView: dia.ElementView, evt: dia.Event) => {
    if (!isPan(evt)) select(elementView.model);
});
paper.on('blank:pointerclick', (evt: dia.Event) => {
    if (!isPan(evt)) select(null);
});

paper.on('element:mouseenter', (elementView: dia.ElementView) => {
    window.clearTimeout(hoverTimer);
    hoverTimer = window.setTimeout(() => {
        isHoverFocused = true;
        focus(elementView.model);
    }, HOVER_DELAY);
});
paper.on('element:mouseleave', () => {
    window.clearTimeout(hoverTimer);
    if (isHoverFocused) {
        isHoverFocused = false;
        focus(getSelected());
    }
});

// Navigation: drag to pan, scroll (or swipe with two fingers) to scroll, pinch (or ctrl + scroll) to zoom.

// TODO: a workaround - while the scroller pans, the paper does not see the pointer move,
// so it takes the end of a pan for a click. A click the pointer moved far for is a pan.
let panStart: dia.Point = { x: 0, y: 0 };

function isPan(evt: dia.Event): boolean {
    const distance = Math.hypot(evt.clientX! - panStart.x, evt.clientY! - panStart.y);
    return distance > CLICK_THRESHOLD;
}

function startPanning(evt: dia.Event) {
    panStart = { x: evt.clientX!, y: evt.clientY! };
    scroller.startPanning(evt);
}

paper.on({
    'blank:pointerdown': (evt: dia.Event) => startPanning(evt),
    'element:pointerdown': (_elementView: dia.ElementView, evt: dia.Event) => startPanning(evt),
    'paper:pinch': (evt: dia.Event, ox: number, oy: number, scale: number) => {
        evt.preventDefault();
        scroller.zoom((scale - 1) * 2, { min: MIN_ZOOM, max: MAX_ZOOM, ox, oy });
    },
    'paper:pan': (evt: dia.Event, deltaX: number, deltaY: number) => {
        evt.preventDefault();
        scroller.el.scrollLeft += deltaX;
        scroller.el.scrollTop += deltaY;
    }
});

[...engineInputs, ...directionInputs, labelsInput, laneInput, alignInput].forEach((input) => {
    input.addEventListener('change', () => build());
});
[nodeSepInput, rankSepInput].forEach((input) => {
    input.addEventListener('input', () => {
        updateOutputs();
        build();
    });
});
fitButton.addEventListener('click', () => fitContent());

function updateOutputs() {
    [nodeSepInput, rankSepInput].forEach((input) => {
        const output = document.querySelector(`output[for="${input.id}"]`) as HTMLOutputElement;
        output.textContent = input.value;
    });
}

updateOutputs();
showDetails(null);
build();
paper.unfreeze();
