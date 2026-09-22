import { dia, ui } from '@joint/plus';
import type { g } from '@joint/plus';

import { addBelow, canMove, canMoveBelow, canMoveOnLink, canRemoveBranch, deleteElement, describeMoved, getActionTarget, getMovedCells, getNodeElement, insertOnLink, moveBelow, moveOnLink, removeBranch, removeNode, toggleGroup } from './actions';
import type { MoveScope } from './actions';
import { buildGraph, getId } from './data/build';
import { DiagramData } from './data/diagram-data';
import { example } from './data/example';
import type { Id } from './data/types';
import { FrameHighlighter } from './frame';
import type { FrameRadius } from './frame';
import { isSelectable, syncInspector } from './inspector';
import { isCellVisible, runLayout } from './layout';
import { createNavigator } from './navigator';
import { COLORS, PLUS_ICON, STEP_RADIUS, StepModel, cellNamespace } from './shapes';
import { getTheme, setTheme } from './theme';
import { addHoverTools, addTooltips, clearPreviews, markMove, placeLinkTools } from './tools';
import type { ToolActions } from './tools';

/** How far the frame of the selected element stands from its edge. */
const SELECTION_PADDING = 5;

const PAPER_PADDING = 40;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3;
/** How close the fit goes, at most: a narrow flow is shown at its size, not blown up. */
const FIT_MAX_ZOOM = 1;

export function init(): void {

    // The data is the source of truth; the graph is built from it (see
    // `data/build.ts`) and laid out, after every edit. The command manager
    // records the edits on the data: undo and redo set it back and the
    // graph follows.
    const data = new DiagramData();
    data.fromJSON(example);
    const history = new dia.CommandManager({ model: data });

    const graph = new dia.Graph({}, { cellNamespace });

    const paper = new dia.Paper({
        model: graph,
        cellViewNamespace: cellNamespace,
        gridSize: 1,
        // The buttons on the edges of the pills reach outside the paper when a pill sits at its edge.
        overflow: true,
        clickThreshold: 10,
        // The layout owns the positions.
        interactive: false,
        // A build changes every cell: the updates of the views are scheduled, and `refresh()` renders them all at once.
        async: true,
        background: { color: COLORS.background },
        // Both ends of a link are computed from the models, not the views: a
        // group has no view, and the view of the start overhangs its box by
        // the chip of the trigger. The layout puts special anchors on the
        // links of the groups (see `anchorGroupLinks()`).
        defaultAnchor: { name: 'center', args: { useModelGeometry: true }},
        defaultConnectionPoint: { name: 'bbox', args: { useModelGeometry: true }},
        viewManagement: {
            lazyInitialize: true,
            disposeHidden: true
        },
        cellVisibility: (cell) => isCellVisible(cell)
    });

    // The paper lives in a scroller: it grows with the content, and the
    // content is panned and zoomed - by dragging the blank area, with a
    // trackpad (two fingers pan, a pinch zooms) or with the mouse wheel.
    const scroller = new ui.PaperScroller({
        paper,
        autoResizePaper: true,
        // The paper grows to fit the content, measured by the model (see `parkHiddenContent()` in `layout/index.ts`).
        contentOptions: { useModelGeometry: true },
        padding: PAPER_PADDING,
        cursor: 'grab',
        scrollWhileDragging: false
    });
    document.getElementById('paper')!.appendChild(scroller.el);
    scroller.render();

    // The map of the diagram, floating over the corner of the paper.
    const navigator = createNavigator(scroller);
    document.getElementById('navigator')!.appendChild(navigator.el);
    navigator.render();

    paper.on('blank:pointerdown', (evt: dia.Event) => scroller.startPanning(evt));
    paper.on('paper:pan', (evt: dia.Event, deltaX: number, deltaY: number) => {
        evt.preventDefault();
        scroller.el.scrollLeft += deltaX;
        scroller.el.scrollTop += deltaY;
    });
    paper.on('paper:pinch', (evt: dia.Event, x: number, y: number, scale: number) => {
        evt.preventDefault();
        scroller.zoom(scroller.zoom() * scale, { min: MIN_ZOOM, max: MAX_ZOOM, ox: x, oy: y, absolute: true });
    });

    /** The bounding box of the visible elements after the last layout: what "zoom to fit" fits. */
    let contentBBox: g.Rect | null = null;

    /**
     * Fits the width of the visible content into the view - at the start,
     * and after a reset: centered horizontally, and at the top, where the
     * flow starts, even when it is short.
     */
    function fit(): void {
        if (!contentBBox) return;
        // The widest part of the flow fills the width of the view, with a
        // margin; the flow is read from the top down by scrolling. Not closer
        // than 1:1 - a flow that is a mere line stays its size.
        const { width } = scroller.getClientSize();
        const scale = Math.min(FIT_MAX_ZOOM, Math.max(MIN_ZOOM, (width - 2 * PAPER_PADDING) / contentBBox.width));
        scroller.zoom(scale, { absolute: true });
        scroller.positionRect(contentBBox, 'top', { padding: PAPER_PADDING });
    }

    /** The whole visible content in the view, centered - the toolbar's "zoom to fit". Not closer than 1:1 either. */
    function zoomToFit(): void {
        if (contentBBox) scroller.zoomToRect(contentBBox, { padding: PAPER_PADDING, minScale: MIN_ZOOM, maxScale: FIT_MAX_ZOOM });
    }

    /**
     * Builds the graph from the data, lays it out and renders it. The view
     * is fitted to the content once, at the start; an edit, a collapse or an
     * expansion keeps the zoom and the scroll position the user has.
     */
    function refresh({ fit: fitToContent = false } = {}): void {
        // The tools of the previous build go first - some sit on views about
        // to be removed; the hover tools come back on hover - and so do the
        // previews of a deletion or a collapse, which sit on views too.
        paper.removeTools();
        clearPreviews();
        buildGraph(graph, data.getData());
        contentBBox = runLayout(graph, graph.getCell(data.getRootId()) as dia.Element);
        // A move whose element the edit removed - an undo, a redo, `Delete` - is off.
        if (moved && graph.getCell(moved.element.id) !== moved.element) setMoved(null);
        paper.updateCellsVisibility();
        // The map hides the content of the collapsed groups like the paper does.
        navigator.targetPaper.updateCellsVisibility();
        // The insert buttons and the option names are placed along the routes
        // of the layout in a second, cheap pass.
        placeLinkTools(paper, actions);
        markMove(paper, actions);
        // A selected element that the edit removed, or hid, leaves the selection.
        const kept = selection.collection.filter((cell) => graph.getCell(cell.id) === cell && isCellVisible(cell));
        if (kept.length < selection.collection.length) selection.collection.reset(kept);
        // The inspector follows the data: an option added to the selected decision gets its input.
        updateInspector();
        if (fitToContent) fit();
    }

    // Every edit, undone or redone step lands on the history as one command.
    history.on('stack:push stack:undo stack:redo', () => refresh());

    // One element at a time can be selected, by a click; a click on the blank
    // area or `Escape` clears the selection. The selected element is outlined
    // - by a frame in the layer below the cells, behind the links and the
    // buttons that hang off the element - and inspected in the panel on the
    // right. The frame has the shape of the element (see `frame.ts`): a step
    // is a box with small corners, everything else selectable is round by
    // half its height.
    const selection = new ui.Selection({
        paper,
        useModelGeometry: true,
        handles: [],
        wrapper: false,
        boxContent: false,
        allowTranslate: false,
        allowCellInteraction: true,
        frames: new ui.HighlighterSelectionFrameList({
            highlighter: FrameHighlighter,
            options: (cell: dia.Cell) => {
                const radius: FrameRadius = StepModel.isStep(cell) ? STEP_RADIUS : 'round';
                return { layer: dia.Paper.Layers.BACK, padding: SELECTION_PADDING, radius, attrs: { stroke: COLORS.selection, strokeWidth: 1.5 }};
            }
        })
    });
    const inspectorEl = document.getElementById('inspector')!;
    const appEl = document.querySelector('.app')!;
    function updateInspector(): void {
        const selected = selection.collection.at(0);
        // On a small screen the panel shows only while something is selected (see the stylesheet).
        appEl.classList.toggle('has-selection', selected !== undefined);
        syncInspector(inspectorEl, data, selected && isSelectable(selected) ? selected : null);
    }
    /**
     * Selects the element of the node `id` just added - the graph has it,
     * rebuilt on the push of the edit - so that its fields open in the
     * inspector, and puts the cursor in the first of them, its text selected:
     * typing replaces the default label.
     */
    function selectNode(id: Id): void {
        const element = getNodeElement(graph, id);
        if (!element || !isSelectable(element)) return;
        selection.collection.reset([element]);
        const field = inspectorEl.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea');
        field?.focus();
        field?.select();
    }
    selection.collection.on('reset add remove', updateInspector);
    updateInspector();
    paper.on('element:pointerclick', (elementView: dia.ElementView) => {
        if (isSelectable(elementView.model)) selection.collection.reset([elementView.model]);
    });
    paper.on('blank:pointerclick', () => {
        selection.collection.reset([]);
        if (moved) {
            setMoved(null);
            placeTools();
        }
    });

    // The move: "Move to…" in the menu of an element starts it; the drop
    // points - the buttons of the links, the add buttons - take the subtree
    // instead of adding, and the move ends. `Escape` or a click on the
    // blank area cancels it.
    let moved: { element: dia.Element; scope: MoveScope } | null = null;
    const moveHintEl = document.getElementById('move-hint')!;
    /** The move in progress - the element and what it takes along - or none. The app marks the mode: the buttons turn into drop points, and the hint over the paper names what moves and says what to do. */
    function setMoved(next: { element: dia.Element; scope: MoveScope } | null): void {
        moved = next;
        moveHintEl.hidden = next === null;
        appEl.classList.toggle('moving-mode', next !== null);
        if (next) renderMoveHint(describeMoved(data, getId(next.element)), next.scope);
    }
    function renderMoveHint(subject: string, scope: MoveScope): void {
        const what = document.createElement('div');
        const strong = document.createElement('strong');
        strong.textContent = subject;
        what.append('Moving ', strong, scope === 'branch' ? ' and everything below it' : ' alone');
        const how = document.createElement('div');
        how.className = 'move-hint-how';
        // The drop point itself, small, in the sentence.
        const button = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        button.setAttribute('class', 'move-hint-button');
        button.setAttribute('viewBox', '-9 -9 18 18');
        button.setAttribute('aria-label', 'plus');
        button.innerHTML = `<rect x="-9" y="-9" width="18" height="18" rx="3" ry="3"/><path d="${PLUS_ICON}"/>`;
        const escape = document.createElement('kbd');
        escape.textContent = 'Esc';
        how.append('Click a ', button, ' button where it should go. ', escape, ' or a click on the blank area cancels.');
        moveHintEl.replaceChildren(what, how);
    }
    /** The tools of the rendered diagram follow the move: drop points, or insert buttons. */
    function placeTools(): void {
        paper.removeTools();
        placeLinkTools(paper, actions);
        markMove(paper, actions);
    }
    /** Ends the move with a drop: the edit that follows rebuilds the diagram, tools included. */
    function takeMoved(): { id: Id; scope: MoveScope } {
        const { element, scope } = moved!;
        setMoved(null);
        return { id: getId(element), scope };
    }
    const movedId = (): Id => getId(moved!.element);
    const movedScope = (): MoveScope => moved!.scope;

    const actions: ToolActions = {
        addBelow: (element, choice) => selectNode(addBelow(data, element, choice)),
        insertOnLink: (link, choice) => selectNode(insertOnLink(data, link, choice)),
        remove: (element, scope) => (scope === 'branch' ? removeBranch(graph, data, element) : removeNode(graph, data, element)),
        toggleGroup: (group) => toggleGroup(data, group),
        canMove: (element, scope) => canMove(graph, data, element, scope),
        startMove: (element, scope) => {
            setMoved({ element, scope });
            placeTools();
        },
        getMoved: () => moved?.element ?? null,
        getMovedCells: () => getMovedCells(graph, data, movedId(), movedScope()),
        getMovedCellsOf: (element, scope) => getMovedCells(graph, data, getId(element), scope),
        canDropBelow: (parent) => canMoveBelow(graph, data, movedId(), movedScope(), parent),
        canDropOnLink: (link) => canMoveOnLink(graph, data, movedId(), movedScope(), link),
        dropBelow: (parent) => {
            const { id, scope } = takeMoved();
            moveBelow(data, id, scope, parent);
        },
        dropOnLink: (link) => {
            const { id, scope } = takeMoved();
            moveOnLink(data, id, scope, link);
        }
    };
    addHoverTools(paper, actions);
    addTooltips(document.body);

    // The toolbar: undo and redo, driven by the history and disabled when
    // there is nothing to undo or redo; the zoom, driven by the scroller -
    // except "zoom to fit", a plain button: the built-in widget would fit
    // every cell of the graph, the never-rendered groups and the hidden
    // content of collapsed groups included. `zoomToFit()` fits what is
    // visible, the whole of it, centered - unlike the view at the start,
    // which fits the width and puts the start at the top. (The `attrs` of a
    // widget are set on the DOM as they are, hence the dashed `data-tooltip`;
    // the attributes of the cells are camel-cased.)
    const themeTooltip = (): string => getTheme() === 'dark' ? 'Light theme' : 'Dark theme';
    const toolbar = new ui.Toolbar({
        autoToggle: true,
        references: { commandManager: history, paperScroller: scroller },
        tools: [
            { type: 'button', name: 'reset', attrs: { button: { 'data-tooltip': 'New diagram' }}},
            { type: 'separator' },
            { type: 'undo', attrs: { button: { 'data-tooltip': 'Undo (Ctrl+Z)' }}},
            { type: 'redo', attrs: { button: { 'data-tooltip': 'Redo (Ctrl+Shift+Z)' }}},
            { type: 'separator' },
            { type: 'zoomOut', min: MIN_ZOOM, max: MAX_ZOOM, attrs: { button: { 'data-tooltip': 'Zoom out' }}},
            { type: 'zoomIn', min: MIN_ZOOM, max: MAX_ZOOM, attrs: { button: { 'data-tooltip': 'Zoom in' }}},
            { type: 'button', name: 'zoomToFit', attrs: { button: { 'data-tooltip': 'Zoom to fit' }}},
            { type: 'separator' },
            { type: 'button', name: 'theme', attrs: { button: { 'data-tooltip': themeTooltip() }}}
        ]
    });
    document.getElementById('toolbar')!.appendChild(toolbar.el);
    toolbar.render();
    toolbar.on('zoomToFit:pointerclick', zoomToFit);
    // The last button switches the theme: the stylesheet follows `data-theme` on the document, its icon included; the tooltip names the other theme.
    toolbar.on('theme:pointerclick', () => {
        setTheme(getTheme() === 'dark' ? 'light' : 'dark');
        toolbar.getWidgetByName('theme').el.setAttribute('data-tooltip', themeTooltip());
    });
    // Everything but the start goes: one edit of the data like any other, so it can be undone; the view is fitted again.
    toolbar.on('reset:pointerclick', () => {
        if (moved) setMoved(null);
        data.reset();
        fit();
    });

    const keyboard = new ui.Keyboard();
    keyboard.on('ctrl+z command+z', (evt: dia.Event) => {
        evt.preventDefault();
        history.undo();
    });
    keyboard.on('ctrl+shift+z command+shift+z ctrl+y', (evt: dia.Event) => {
        evt.preventDefault();
        history.redo();
    });
    keyboard.on('escape', () => {
        // An open menu goes first; then the move, then the selection.
        if (ui.ContextToolbar.opened) ui.ContextToolbar.close();
        else if (moved) {
            setMoved(null);
            placeTools();
        } else selection.collection.reset([]);
    });
    // `Delete` on the selected element does what the "remove" item of its
    // menu does: the start of a group deletes the group; what cannot be
    // deleted stays.
    keyboard.on('delete backspace', (evt: dia.Event) => {
        const selected = selection.collection.at(0);
        if (!selected) return;
        evt.preventDefault();
        const target = getActionTarget(selected);
        // What the menu's first "remove" item would do: the element alone where its children can move up, the branch below it where they cannot.
        if (target && canRemoveBranch(graph, target)) deleteElement(graph, data, target);
    });

    refresh({ fit: true });
}
