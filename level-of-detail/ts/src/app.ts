import { dia, ui } from '@joint/plus';
import { DETAIL_LABEL, DETAIL_MODE_LABEL, getActiveLevel, getDetailLevel, getDetailMode, setDetailMode } from './detail';
import type { DetailLevel, DetailMode } from './detail';
import { generateCells } from './generate-graph';
import { requestDetailUpdate } from './level-of-detail-view';
import { ServiceView } from './service-view';
import { cellNamespace } from './shapes';
import { CANVAS_COLOR } from './theme';

/**
 * The lowest zoom has to frame the whole map - about 12,000 x 8,600 px - which
 * the scroller's default floor does not reach.
 */
const MIN_ZOOM = 0.04;
const MAX_ZOOM = 2;
const ZOOM_STEP = 1.4;

const FIT_OPTIONS: dia.Paper.TransformToFitContentOptions = {
    padding: 40,
    // Only a fraction of the views exist at any moment, so the fit has to be
    // computed from the models rather than from the DOM.
    useModelGeometry: true,
    minScale: MIN_ZOOM,
    maxScale: 1
};

const MODES: DetailMode[] = ['auto', 'high', 'medium', 'low'];

/**
 * Link ends are computed from the model, not from the rendered DOM.
 *
 * The default anchor and connection point measure the element *view*, which
 * here is markup that changes with the zoom. Reading the model instead means a
 * link end cannot move when a card becomes a block - the box on the model is
 * the same at all three levels - which is what makes it safe for
 * `requestDetailUpdate()` to isolate its updates and skip the connected links
 * entirely.
 */
const LINK_GEOMETRY = {
    defaultAnchor: { name: 'center', args: { useModelGeometry: true }},
    defaultConnectionPoint: { name: 'bbox', args: { useModelGeometry: true }}
} as const;

export function init(): void {

    /*
     * A `dia.SearchGraph` - the graph backed by a quad-tree index over element
     * bounds. Virtual rendering asks "which cells are in the viewport?" on
     * every pan and zoom frame; on 1,200 elements that question answered by a
     * linear scan is a per-frame cost that grows with the map.
     *
     * Lazy mode, rather than indexing eagerly: this graph is written once, at
     * load, and only ever queried afterwards. Eager would reindex each element
     * as it arrived; lazy marks the tree dirty and builds it on the first query.
     */
    const graph = new dia.SearchGraph({}, { cellNamespace });
    graph.setQuadTreeLazyMode(true);

    const paper = new dia.Paper({
        model: graph,
        cellViewNamespace: cellNamespace,
        // Every element is drawn by the level-of-detail view.
        elementView: ServiceView,
        async: true,
        sorting: dia.Paper.sorting.APPROX,
        /*
         * Freeze once everything has settled, and wake on the next scheduled
         * update. It also gives the HUD the event it needs: `render:done` only
         * fires when views were *updated* (`stats.updated > 0`), so a pass that
         * merely unmounts cells that left the viewport is silent - and that is
         * most of what zooming out does. `render:idle` fires when the whole
         * thing has come to rest, unmounts included.
         */
        autoFreeze: true,
        /*
         * Required for virtual rendering: the scroller's controller refuses to
         * start on a paper in legacy mode, and `legacyMode` is simply
         * `!options.viewManagement`.
         *
         * `lazyInitialize` is also what `requestDetailUpdate()` relies on - an
         * element the scroller has never shown has a placeholder rather than a
         * view, which is exactly what `paper.getCellView()` reports as "no view
         * yet". `disposeHidden` drops a view when it leaves the viewport, so a
         * long pan across 1,200 elements does not accumulate all of them.
         */
        viewManagement: {
            lazyInitialize: true,
            disposeHidden: true
        },
        background: { color: CANVAS_COLOR },
        gridSize: 1,
        drawGrid: false,
        ...LINK_GEOMETRY
    });

    const scroller = new ui.PaperScroller({
        paper,
        cursor: 'grab',
        inertia: true,
        autoResizePaper: true,
        baseWidth: 1,
        baseHeight: 1,
        contentOptions: { padding: 100, allowNewOrigin: 'any' },
        /*
         * Only the cells inside the viewport get a view. It is the first half
         * of the story - and the half that runs out: zoom far enough and every
         * cell is inside the viewport, at which point the level of detail in
         * `ServiceView` is the only thing left.
         */
        virtualRendering: {
            margin: 200,
            /*
             * Level of detail applied to the links: below 25% they are not
             * drawn at all.
             *
             * At `Fit` all 1,600 of them are inside the viewport, so virtual
             * rendering mounts every one - and at that scale a 1px line is a
             * grey haze that hides the status colours rather than showing any
             * structure. Dropping them there is the single biggest saving in
             * the demo, because the links outnumber the elements.
             *
             * The controller composes this with its own viewport test - ours
             * runs first and short-circuits - and re-runs the whole check on
             * the paper's `transform` event, so the links come back by
             * themselves on the way in. It keys off the paper's actual scale
             * rather than the toolbar's pinned mode: the pin is there to
             * compare how the *elements* draw.
             */
            cellVisibility: (cell) => !(cell.isLink() && getDetailLevel(paper.scale().sx) === 'low')
        }
    });

    const canvas = document.getElementById('canvas');
    if (!canvas) throw new Error('level-of-detail: missing #canvas element.');
    canvas.appendChild(scroller.el);
    scroller.render();

    // Frozen while the 2,800 cells land, so the paper renders once rather than
    // per cell.
    paper.freeze();
    graph.resetCells(generateCells());
    paper.unfreeze();

    scroller.zoomToFit(FIT_OPTIONS);

    /*
     * The level the views were last told about.
     *
     * The guard is what keeps the loop in `requestDetailUpdate()` off every
     * wheel tick: the paper fires `scale` on every zoom frame, but the level
     * only changes twice in the whole range.
     */
    let currentLevel: DetailLevel = getActiveLevel(paper.scale().sx);

    function applyLevel(): void {
        const level = getActiveLevel(paper.scale().sx);
        // Not a correctness guard - the views hold one of those themselves.
        // This one keeps the loop off every frame of a zoom.
        if (level === currentLevel) return;
        currentLevel = level;
        requestDetailUpdate(paper, graph);
    }

    // `scale` is the only event the level of detail listens to. Panning does
    // not fire it, so a pan never touches a view's DOM.
    paper.on('scale', () => {
        applyLevel();
        updateHud();
    });
    scroller.on('scroll', updateHud);

    /*
     * Trackpad pinch, and Ctrl/Cmd + wheel.
     *
     * This has to be wired by hand: `ui.PaperScroller` does not look at the
     * wheel at all. Panning still works without it - the scroller is a native
     * scroll container, so a two-finger scroll scrolls it - but a pinch would
     * otherwise fall through and zoom the browser's page instead of the map.
     * (`@joint/react-plus` wires both for you, which is why the React version
     * of this demo has no equivalent of this block.)
     *
     * The paper only emits `paper:pinch` when something is listening: it checks
     * for subscribers before calling `preventDefault()`, so that a page with no
     * zoom of its own does not swallow the browser's. `scale` is a multiplier
     * and `x`/`y` are local paper coordinates - the same space `zoom()`'s
     * `ox`/`oy` expect - so the point under the cursor stays where it is.
     */
    paper.on('paper:pinch', (_evt, x, y, scale) => {
        scroller.zoom(scroller.zoom() * scale, {
            absolute: true,
            min: MIN_ZOOM,
            max: MAX_ZOOM,
            ox: x,
            oy: y
        });
    });

    /*
     * Dragging the blank canvas pans it.
     *
     * `ui.PaperScroller` does not bind this itself - `cursor: 'grab'` only sets
     * the CSS cursor - so without the line below the grab cursor is a promise
     * the canvas does not keep. `blank:pointerdown` fires only where there is
     * no cell, so dragging a node still moves the node.
     *
     * The cursor follows the gesture, which is the feedback that tells a drag
     * apart from a click on a map this dense.
     */
    paper.on('blank:pointerdown', (evt: dia.Event) => scroller.startPanning(evt));
    scroller.on('pan:start', () => scroller.setCursor('grabbing'));
    scroller.on('pan:stop', () => scroller.setCursor('grab'));

    /* --- Toolbar ---------------------------------------------------------- */

    const select = document.getElementById('detail') as HTMLSelectElement | null;
    if (select) {
        for (const mode of MODES) {
            const option = document.createElement('option');
            option.value = mode;
            option.textContent = DETAIL_MODE_LABEL[mode];
            select.appendChild(option);
        }
        select.value = getDetailMode();
        select.addEventListener('change', () => {
            setDetailMode(select.value as DetailMode);
            // The scale has not moved, so `applyLevel()` would bail out. Ask
            // every view to reconsider instead; each re-renders only if its own
            // level actually moved.
            currentLevel = getActiveLevel(paper.scale().sx);
            requestDetailUpdate(paper, graph);
            updateHud();
        });
    }

    const count = document.getElementById('count');
    if (count) {
        const elementCount = graph.getElements().length;
        const linkCount = graph.getLinks().length;
        count.textContent = `${elementCount.toLocaleString()} nodes · ${linkCount.toLocaleString()} links`;
    }

    // `absolute`, because the relative form of `zoom()` *adds* its argument to
    // the current scale. Stepping has to be multiplicative here: this map is
    // read between 4% and 200%, where a fixed increment is either a crawl at
    // the bottom or a jump past both thresholds at the top.
    bindZoom('zoom-in', () => scroller.zoom(scroller.zoom() * ZOOM_STEP, { absolute: true, max: MAX_ZOOM }));
    bindZoom('zoom-out', () => scroller.zoom(scroller.zoom() / ZOOM_STEP, { absolute: true, min: MIN_ZOOM }));
    bindZoom('zoom-fit', () => scroller.zoomToFit(FIT_OPTIONS));

    /* --- HUD -------------------------------------------------------------- */

    const hudZoom = document.getElementById('hud-zoom');
    const hudLevel = document.getElementById('hud-level');
    const hudElements = document.getElementById('hud-elements');
    const hudLinks = document.getElementById('hud-links');
    const hudNodes = document.getElementById('hud-nodes');

    function updateHud(): void {
        if (hudZoom) hudZoom.textContent = `${Math.round(paper.scale().sx * 100)}%`;
        if (hudLevel) {
            const mode = getDetailMode();
            hudLevel.textContent = DETAIL_LABEL[currentLevel] + (mode === 'auto' ? '' : ' (pinned)');
            hudLevel.className = `hud-level is-${currentLevel}`;
        }
    }

    /*
     * The numbers this demo is actually about, counted off the DOM.
     *
     * `Elements` and `Links` are what virtual rendering and `cellVisibility`
     * control: the first falls from 1,200 at `Fit` to a couple of dozen at
     * 200%, and the second drops to 0 below 25%, where the links are not drawn
     * at all. `SVG nodes` is what the level of detail controls - the same 1,200
     * elements are 1,200 nodes as blocks and 12,000 as cards.
     *
     * Pinning a level at `Fit` moves the node count by 10x while the element
     * count does not budge, which is the whole point: the mechanisms are
     * independent, and only the level of detail still has anything to give once
     * the whole map is on screen.
     *
     * Counted on `render:done` rather than on a timer, so they are only ever
     * read right after the DOM they describe settled.
     */
    function updateCounts(): void {
        const { el } = paper;
        if (hudElements) {
            hudElements.textContent = el.querySelectorAll('.joint-element').length.toLocaleString();
        }
        if (hudLinks) {
            hudLinks.textContent = el.querySelectorAll('.joint-link').length.toLocaleString();
        }
        if (hudNodes) {
            // Everything inside a cell view, links included - so the three
            // numbers add up rather than describing different subsets.
            hudNodes.textContent = el.querySelectorAll('.joint-element *, .joint-link *').length.toLocaleString();
        }
    }

    // `render:done` for a pass that updated views, `render:idle` for one that
    // only unmounted them - see the `autoFreeze` note on the paper options.
    paper.on('render:done render:idle', updateCounts);

    updateHud();
    updateCounts();
}

function bindZoom(id: string, handler: () => void): void {
    const button = document.getElementById(id);
    if (button) button.addEventListener('click', handler);
}

