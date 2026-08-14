import { dia, g, ui, util } from '@joint/plus';

import { createDiagram } from './dataset';
import { createCells, embedCells, layoutDiagram } from './layout';
import { Cluster, cellNamespace, TOGGLE_EVENT } from './shapes';

/** How far outside of the visible area the cells are rendered. */
const VIRTUAL_RENDERING_MARGIN = 300;
const PAPER_PADDING = 100;
const MIN_ZOOM = 0.05;
const MAX_ZOOM = 2;

export async function init(): Promise<void> {
    const clusters = createDiagram();

    const graph = new dia.Graph({}, { cellNamespace });

    const paper = new dia.Paper({
        model: graph,
        cellViewNamespace: cellNamespace,
        frozen: true,
        async: true,
        sorting: dia.Paper.sorting.APPROX,
        interactive: false,
        background: { color: '#F3F7F6' },
        // Create the view of a cell when it becomes visible for the first time
        // and throw it away when it is hidden again. Only the cells the user
        // can actually see are kept in the DOM.
        viewManagement: {
            lazyInitialize: true,
            disposeHidden: true
        },
        defaultConnectionPoint: { name: 'anchor' },
        defaultConnector: {
            name: 'straight',
            args: { cornerType: 'cubic', cornerRadius: 5 }
        }
    });

    // The bounding box of the visible cells - the area the paper is sized to.
    let visibleContentArea: dia.BBox = { x: 0, y: 0, width: 1, height: 1 };

    const scroller = new ui.PaperScroller({
        paper,
        cursor: 'grab',
        baseWidth: 1,
        baseHeight: 1,
        // Note: a function is required here - it makes the paper adjusted on
        // every zoom change and it provides the current content area.
        contentOptions: () => ({
            contentArea: visibleContentArea,
            padding: PAPER_PADDING,
            allowNewOrigin: 'any'
        }),
        // Render only the cells within the visible area of the scroller. The
        // controller sets `paper.options.cellVisibility` and combines the
        // viewport check with the callback below.
        virtualRendering: {
            margin: VIRTUAL_RENDERING_MARGIN,
            cellVisibility: isCellVisible
        }
    });

    document.getElementById('canvas')!.appendChild(scroller.el);
    scroller.render();

    graph.resetCells(createCells(clusters));
    embedCells(graph, clusters);

    let isLayoutRunning = false;
    let isLayoutQueued = false;
    // The cluster the user has toggled last. The layout moves the cells
    // around, the cluster is kept in the view afterwards.
    let toggledCluster: Cluster | null = null;

    async function runLayout(): Promise<void> {
        if (isLayoutRunning) {
            isLayoutQueued = true;
            return;
        }
        isLayoutRunning = true;
        // The distance of the collapse button (the top-right corner of the
        // cluster) from the center of the view. The button is moved back to
        // the same position on the screen once the diagram is laid out again.
        const buttonOffset = toggledCluster
            ? toggledCluster.getBBox().topRight().difference(scroller.getVisibleArea().center())
            : null;
        paper.freeze();
        try {
            await layoutDiagram(graph, clusters);
        } catch (error) {
            console.warn('ELK layout error:', error);
        } finally {
            isLayoutRunning = false;
        }
        paper.unfreeze();
        visibleContentArea = getVisibleContentArea(graph) ?? visibleContentArea;
        scroller.adjustPaper();
        // The collapsed state has changed - re-evaluate which cells are shown.
        paper.updateCellsVisibility();
        if (isLayoutQueued) {
            isLayoutQueued = false;
            await runLayout();
            return;
        }
        // Everything has been laid out again, keep the toggled cluster (or the
        // whole diagram) in the view.
        if (toggledCluster && buttonOffset) {
            const center = toggledCluster.getBBox().topRight().difference(buttonOffset);
            scroller.center(center.x, center.y);
            toggledCluster = null;
        } else {
            const center = new g.Rect(visibleContentArea).center();
            scroller.center(center.x, center.y);
        }
    }

    // A single layout run is enough for any number of clusters toggled at once
    // (e.g. by the "Collapse All" button).
    const scheduleLayout = util.debounce(() => runLayout(), 10);
    graph.on('change:collapsed', () => scheduleLayout());

    paper.on(TOGGLE_EVENT, (elementView: dia.ElementView, evt: dia.Event) => {
        // Do not start panning the paper when the button is clicked.
        evt.stopPropagation();
        const cluster = elementView.model as Cluster;
        toggledCluster = cluster;
        cluster.toggle();
    });

    addPanningAndZooming(scroller);
    addToolbarListeners(graph, scroller, () => (toggledCluster = null));
    addStats(scroller);

    await runLayout();
    // Note: the rect is passed explicitly - `scroller.zoomToFit()` measures the
    // rendered views, while most of the cells are not rendered at this point.
    scroller.zoomToRect(visibleContentArea, {
        maxScale: 1,
        // Leave a room for the toolbar at the top.
        padding: { top: 60, right: 20, bottom: 20, left: 20 }
    });
}

/**
 * A cell is hidden when any of its ancestors is a collapsed cluster. Note that
 * the links are reparented into the cluster of their endpoints, so the very
 * same check applies to them.
 */
function isCellVisible(cell: dia.Cell): boolean {
    return !cell.getAncestors().some(
        (ancestor) => Cluster.isCluster(ancestor) && ancestor.isCollapsed()
    );
}

/**
 * The bounding box of the cells which are not hidden. A cell inside a collapsed
 * cluster is left where the previous layout put it, so it must not be measured
 * (it would size the paper to a diagram which is not on the screen anymore).
 */
function getVisibleContentArea(graph: dia.Graph): dia.BBox | null {
    return graph.getCellsBBox(graph.getCells().filter(isCellVisible));
}

function addPanningAndZooming(scroller: ui.PaperScroller): void {
    const paper = scroller.options.paper;
    paper.on({
        'blank:pointerdown': (evt: dia.Event) => scroller.startPanning(evt),
        'element:pointerdown': (_view: dia.ElementView, evt: dia.Event) => scroller.startPanning(evt),
        // Zooming with a pinch gesture (or the ctrl key and the mouse wheel).
        'paper:pinch': (evt: dia.Event, ox: number, oy: number, scale: number) => {
            evt.preventDefault();
            scroller.zoom((scale - 1) * 2, { min: MIN_ZOOM, max: MAX_ZOOM, ox, oy });
        },
        // Scrolling with the mouse wheel (or a two-finger swipe).
        'paper:pan': (evt: dia.Event, deltaX: number, deltaY: number) => {
            evt.preventDefault();
            scroller.el.scrollLeft += deltaX;
            scroller.el.scrollTop += deltaY;
        }
    });
}

function addToolbarListeners(
    graph: dia.Graph,
    scroller: ui.PaperScroller,
    onToggleAll: () => void
): void {
    const toggleAll = (collapsed: boolean): void => {
        onToggleAll();
        graph.getElements().forEach((element) => {
            if (Cluster.isCluster(element)) element.toggle(collapsed);
        });
    };

    document.getElementById('zoom-in')!.addEventListener(
        'click', () => scroller.zoom(0.2, { max: MAX_ZOOM, grid: 0.2 })
    );
    document.getElementById('zoom-out')!.addEventListener(
        'click', () => scroller.zoom(-0.2, { min: MIN_ZOOM, grid: 0.2 })
    );
    document.getElementById('collapse-all')!.addEventListener(
        'click', () => toggleAll(true)
    );
    document.getElementById('expand-all')!.addEventListener(
        'click', () => toggleAll(false)
    );
}

/**
 * Show how many of the cells of the graph are rendered at the moment. The
 * number is read from the DOM - a cell which is not visible has no node in the
 * cells layer of the paper.
 */
function addStats(scroller: ui.PaperScroller): void {
    const statsEl = document.getElementById('stats')!;
    const paper = scroller.options.paper;
    const graph = paper.model;
    const cellsLayer = paper.getLayerNode('cells');
    const update = util.debounce(() => {
        const rendered = cellsLayer.childElementCount;
        statsEl.textContent = `${rendered} of ${graph.getCells().length} cells rendered`;
    }, 100);
    paper.on('render:done', update);
    paper.on('transform', update);
    scroller.on('scroll', update);
}
