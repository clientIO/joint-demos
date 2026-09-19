import { dia, highlighters, ui } from '@joint/plus';

import { addBelow, canDelete, deleteElement, insertOnLink, toggleGroup } from './actions';
import { buildGraph } from './data/build';
import { DiagramData } from './data/DiagramData';
import { gateAnchor } from './gate-anchor';
import { isSelectable, syncInspector } from './inspector';
import { isCellVisible, runLayout } from './layout';
import { pipeline } from './pipeline';
import { COLORS, cellNamespace } from './shapes';
import { addHoverTools, addTooltips, getDeleteTarget, placeLinkTools } from './tools';
import type { ToolActions } from './tools';

const PAPER_PADDING = 40;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3;

export function init(): void {

    // The data is the source of truth; the graph is built from it (see
    // `data/build.ts`) and laid out, after every edit. The command manager
    // records the edits on the data: undo and redo set it back and the
    // graph follows.
    const data = new DiagramData();
    data.fromJSON(pipeline);
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
        background: { color: COLORS.background },
        // The links meet a group where its gates are. Both ends are computed
        // from the models: a group has no view.
        defaultAnchor: gateAnchor,
        defaultConnectionPoint: { name: 'bbox', args: { useModelGeometry: true }},
        defaultConnector: { name: 'straight', args: { cornerType: 'cubic', cornerRadius: 6 }},
        sorting: dia.Paper.sorting.APPROX,
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
        padding: PAPER_PADDING,
        cursor: 'grab',
        scrollWhileDragging: false
    });
    document.getElementById('paper')!.appendChild(scroller.el);
    scroller.render();

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

    /**
     * Builds the graph from the data, lays it out and renders it. The view
     * is fitted to the content once, at the start; an edit, a collapse or an
     * expansion keeps the zoom and the scroll position the user has.
     */
    function refresh({ fit = false } = {}): void {
        // The tools of the previous build go first - some sit on views about
        // to be removed; the hover tools come back on hover.
        paper.removeTools();
        paper.freeze();
        buildGraph(graph, data.getData());
        const bbox = runLayout(graph, graph.getCell(data.getRootId()) as dia.Element);
        paper.unfreeze();
        paper.updateCellsVisibility();
        // The routes are known once rendered: the insert buttons and the
        // option names are placed in a second, cheap pass.
        placeLinkTools(paper, actions);
        // A selected element that the edit removed, or hid, leaves the selection.
        const kept = selection.collection.filter((cell) => graph.getCell(cell.id) === cell && isCellVisible(cell));
        if (kept.length < selection.collection.length) selection.collection.reset(kept);
        // The inspector follows the data: an option added to the selected decision gets its input.
        updateInspector();
        if (!fit || !bbox) return;
        scroller.zoomToFit({
            contentArea: bbox,
            padding: PAPER_PADDING,
            minScale: MIN_ZOOM,
            maxScale: 1,
            useModelGeometry: true
        });
        scroller.centerContent({ useModelGeometry: true });
    }

    // Every edit, undone or redone step lands on the history as one command.
    history.on('stack:push stack:undo stack:redo', () => refresh());

    // One element at a time can be selected, by a click; a click on the blank
    // area or `Escape` clears the selection. The selected element is outlined
    // - by a frame in the layer below the cells, behind the links and the
    // buttons that hang off the element - and inspected in the panel on the right.
    const selection = new ui.Selection({
        paper,
        useModelGeometry: true,
        handles: [],
        wrapper: false,
        boxContent: false,
        allowTranslate: false,
        allowCellInteraction: true,
        frames: new ui.HighlighterSelectionFrameList({
            highlighter: highlighters.stroke,
            selector: 'body',
            options: { layer: dia.Paper.Layers.BACK, padding: 5, rx: 9, ry: 9, attrs: { stroke: COLORS.selection, 'stroke-width': 1.5 }}
        })
    });
    const inspectorEl = document.getElementById('inspector')!;
    function updateInspector(): void {
        const selected = selection.collection.at(0);
        syncInspector(inspectorEl, data, selected && isSelectable(selected) ? selected : null);
    }
    selection.collection.on('reset add remove', updateInspector);
    updateInspector();
    paper.on('element:pointerclick', (elementView: dia.ElementView) => {
        if (isSelectable(elementView.model)) selection.collection.reset([elementView.model]);
    });
    paper.on('blank:pointerclick', () => selection.collection.reset([]));

    const actions: ToolActions = {
        addBelow: (element, choice) => addBelow(data, element, choice),
        insertOnLink: (link, choice) => insertOnLink(data, link, choice),
        delete: (element) => deleteElement(graph, data, element),
        toggleGroup: (group) => toggleGroup(data, group)
    };
    addHoverTools(paper, actions);
    addTooltips(document.body);

    // The toolbar: undo and redo, driven by the history and disabled when
    // there is nothing to undo or redo; the zoom, driven by the scroller.
    const toolbar = new ui.Toolbar({
        autoToggle: true,
        references: { commandManager: history, paperScroller: scroller },
        tools: [
            { type: 'undo', attrs: { button: { 'data-tooltip': 'Undo (Ctrl+Z)' }}},
            { type: 'redo', attrs: { button: { 'data-tooltip': 'Redo (Ctrl+Shift+Z)' }}},
            { type: 'separator' },
            { type: 'zoomOut', min: MIN_ZOOM, max: MAX_ZOOM, attrs: { button: { 'data-tooltip': 'Zoom out' }}},
            { type: 'zoomIn', min: MIN_ZOOM, max: MAX_ZOOM, attrs: { button: { 'data-tooltip': 'Zoom in' }}},
            { type: 'zoomToFit', min: MIN_ZOOM, max: 1, step: 0.01, padding: PAPER_PADDING, useModelGeometry: true, attrs: { button: { 'data-tooltip': 'Zoom to fit' }}}
        ]
    });
    document.getElementById('toolbar')!.appendChild(toolbar.el);
    toolbar.render();

    const keyboard = new ui.Keyboard();
    keyboard.on('ctrl+z command+z', (evt: dia.Event) => {
        evt.preventDefault();
        history.undo();
    });
    keyboard.on('ctrl+shift+z command+shift+z ctrl+y', (evt: dia.Event) => {
        evt.preventDefault();
        history.redo();
    });
    keyboard.on('escape', () => selection.collection.reset([]));
    // `Delete` on the selected element does what its delete tool does: the
    // start of a group deletes the group; what cannot be deleted stays.
    keyboard.on('delete backspace', (evt: dia.Event) => {
        const selected = selection.collection.at(0);
        if (!selected) return;
        evt.preventDefault();
        const target = getDeleteTarget(selected);
        if (target && canDelete(graph, target)) actions.delete(target);
    });

    refresh({ fit: true });
}
