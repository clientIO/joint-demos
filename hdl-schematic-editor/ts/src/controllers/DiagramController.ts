import { dia, ui } from '@joint/plus';
import { Controller } from '../system/controllers';
// Diagram
import { State } from '../const';
import { appConfig } from '../configs';
import { Node, Edge, HdlNode, HdlCell } from '../diagram/models';
import { addEffect, removeEffect, removeCellEffect, Effect } from '../diagram/effects';
// Actions
import { openPortMenu, openPaperMenu, openChangeCellPicker } from '../actions/menu-actions';
import { addNodeHoverTools, addEdgeHoverTools, removeCellTools } from '../actions/tools-actions';
import { selectModel } from '../actions/selection-actions';
import { loadYosysJSON, storeNodePositions } from '../actions/diagram-actions';
import { openMessageDialog } from '../actions/dialog-actions';
import { getNetEdges } from '../actions/wire-actions';
// Utils
import { isToolElement, scheduleToolsRemoval, cancelToolsRemoval } from '../diagram/tools/utils';

import type { App } from '../app';
import type { YosysJSON } from '../yosys/types';

/**
 * DiagramController manages user interactions with the diagram nodes,
 * edges, and the paper background.
 */
export default class DiagramController extends Controller<[App]> {

    startListening() {
        const { paper, scroller } = this.context;

        this.listenTo(paper, {
            //  Links
            'link:mouseenter': onLinkMouseEnter,
            'link:mouseleave': onLinkMouseLeave,
            'link:pointerclick': onLinkPointerClick,
            // Elements
            'element:mouseenter': onElementMouseEnter,
            'element:mouseleave': onElementMouseLeave,
            'port:pointerclick': onPortClick,
            'element:pointerclick': onNodePointerClick,
            'element:pointerdblclick': onNodePointerDblClick,
            'element:pointerup': onNodePointerUp,
            'cell:highlight': onCellHighlight,
            'cell:unhighlight': onCellUnhighlight,
            // Paper
            'blank:pointerdown': onBlankPointerdown,
            'blank:contextmenu': onBlankContextmenu,
            'paper:pinch': onPaperPinch,
            'paper:pan': onPaperPan,
            'transform': onPaperTransform,
            // IO
            'file:drop': onFileDrop,
            'file:drop:invalid': onFileDropInvalid,
        });

        this.listenTo(scroller, {
            'pan:start': onScrollerPanStart,
            'pan:stop': onScrollerPanStop,
        });
    }
}

// UI interactions with elements

function onElementMouseEnter(app: App, elementView: dia.ElementView) {
    // The pointer is back (e.g. from the node tools): keep the hover state
    cancelToolsRemoval(elementView);
    if (elementView.hasTools()) return;
    addEffect(elementView, Effect.NodeHover);
    if (elementView.model instanceof Node) {
        addNodeHoverTools(app, elementView as dia.ElementView<Node>, () => hideElementHover(app, elementView));
    }
}

function onElementMouseLeave(app: App, elementView: dia.ElementView, evt: dia.Event) {
    // Keep the tools while the pointer is moving to them (e.g. to the menu button)
    if (isToolElement((evt.originalEvent as MouseEvent | undefined)?.relatedTarget)) return;
    // Give the pointer a moment to reach the tools across a gap
    scheduleToolsRemoval(elementView, () => hideElementHover(app, elementView));
}

function hideElementHover(app: App, elementView: dia.ElementView) {
    cancelToolsRemoval(elementView);
    removeCellEffect(elementView, Effect.NodeHover);
    removeCellTools(app, elementView);
}

function onPortClick(app: App, elementView: dia.ElementView, _evt: dia.Event, portId: string) {
    const node = elementView.model;
    if (!(node instanceof HdlNode)) return;
    openPortMenu(app, node, { portId });
}

function onNodePointerClick(app: App, elementView: dia.ElementView<Node>, evt: dia.Event) {
    const node = elementView.model;

    selectModel(app, node, { cherryPick: evt.ctrlKey || evt.metaKey });
}

function onNodePointerUp(app: App) {
    // Store the positions of the moved nodes (if any) in the data
    storeNodePositions(app);
}

function onNodePointerDblClick(app: App, elementView: dia.ElementView<Node>) {
    const node = elementView.model;

    if (node instanceof HdlCell) {
        openChangeCellPicker(app, node);
    }
}

/**
 * The connection candidates (ports) and the connection target are highlighted with CSS classes.
 */
function onCellHighlight(_app: App, _cellView: dia.CellView, node: SVGElement, { type }: { type: dia.CellView.Highlighting }) {
    switch (type) {
        case dia.CellView.Highlighting.MAGNET_AVAILABILITY:
            node.classList.add('connection-candidate');
            break;
        case dia.CellView.Highlighting.CONNECTING:
            node.classList.add('connection-target');
            break;
    }
}

function onCellUnhighlight(_app: App, _cellView: dia.CellView, node: SVGElement, { type }: { type: dia.CellView.Highlighting }) {
    switch (type) {
        case dia.CellView.Highlighting.MAGNET_AVAILABILITY:
            node.classList.remove('connection-candidate');
            break;
        case dia.CellView.Highlighting.CONNECTING:
            node.classList.remove('connection-target');
            break;
    }
}

// UI interactions with links

function onLinkPointerClick(app: App, linkView: dia.LinkView, evt: dia.Event) {
    const link = linkView.model;

    if (link instanceof Edge) {
        selectModel(app, link, { cherryPick: evt.ctrlKey || evt.metaKey });
    }
}

function onLinkMouseEnter(app: App, linkView: dia.LinkView) {
    const { paper } = app;
    const link = linkView.model;
    if (!(link instanceof Edge)) return;
    // The pointer is coming back from the wire tools (they are still there)
    if (linkView.hasTools()) return;

    addEdgeHoverTools(app, linkView as dia.LinkView<Edge>, () => hideLinkHover(app, linkView));
    // Highlight the whole net (all wires driven by the same port)
    getNetEdges(app, link).forEach(edge => {
        const edgeView = paper.findViewByModel(edge);
        if (edgeView) addEffect(edgeView, Effect.NetHover);
    });
}

function onLinkMouseLeave(app: App, linkView: dia.LinkView, evt: dia.Event) {
    if (!(linkView.model instanceof Edge)) return;
    // Keep the tools while the pointer is moving to them (e.g. to the insert button)
    if (isToolElement((evt.originalEvent as MouseEvent | undefined)?.relatedTarget)) return;
    hideLinkHover(app, linkView);
}

function hideLinkHover(app: App, linkView: dia.LinkView) {
    const { paper } = app;

    removeCellTools(app, linkView);
    removeEffect(paper, Effect.NetHover);
}

//  UI interactions with the paper background

function onBlankPointerdown(app: App, evt: dia.Event) {
    const { scroller, selection } = app;

    const targetName = evt.target.localName;
    if (targetName === 'textarea' || targetName === 'button') {
        // The user is clicking a button. Do nothing.
        return;
    }

    if (evt.shiftKey) {
        evt.preventDefault();
        // Let user draw a selection region when Shift key is pressed
        selection.startSelecting(evt);
        return;
    }

    // Start panning the paper
    selection.collection.reset();
    scroller.startPanning(evt);
}

function onBlankContextmenu(app: App, evt: dia.Event) {
    const { state } = app;

    if (state.get(State.PointerCaptured)) return;
    openPaperMenu(app, evt);
}

// Zooming and Panning

function onPaperPinch(app: App, _evt: dia.Event, ox: number, oy: number, scale: number) {
    const { scroller } = app;

    const zoom = scroller.zoom();
    scroller.zoom(zoom * scale, {
        min: appConfig.Zoom.Min,
        max: appConfig.Zoom.Max,
        ox,
        oy,
        absolute: true
    });
}

function onPaperPan(app: App, evt: dia.Event, tx: number, ty: number) {
    const { scroller } = app;

    evt.preventDefault();
    scroller.el.scrollLeft += tx;
    scroller.el.scrollTop += ty;
}

function onScrollerPanStart(app: App) {
    const { scroller } = app;

    scroller.setCursor('grabbing');
}

function onScrollerPanStop(app: App) {
    const { scroller } = app;

    scroller.setCursor('default');
}

// Paper transformations

function onPaperTransform(_app: App, _evt: dia.Event) {

    // Close any opened context toolbar so it doesn't appear in a wrong position when paper is transformed, for example when zooming
    ui.ContextToolbar.close();
}

// IO Interactions

function onFileDrop(app: App, json: YosysJSON) {

    loadYosysJSON(app, json);
}

function onFileDropInvalid(app: App) {

    openMessageDialog(app, 'Invalid file', 'The file is not a valid JSON.');
}
