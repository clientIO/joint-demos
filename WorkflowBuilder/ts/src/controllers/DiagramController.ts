import { dia, ui } from '@joint/plus';
import { Controller } from '../system/controllers';
// Diagram
import { State } from '../const';
import { appConfig } from '../configs';
import { Action, Trigger, Node, Note, Edge, Control  } from '../diagram/models';
import { addEffect, removeEffect, Effect } from '../diagram/effects';
// Actions
import { openPortMenu, openPaperMenu } from '../actions/menu-actions';
import { openRegistryDialog } from '../actions/registry-actions';
import { addNodeHoverTools, addEdgeHoverTools, removeCellTools } from '../actions/tools-actions';
import { openNoteEditor } from '../actions/notes-actions';
import { selectModel } from '../actions/selection-actions';
import { loadDiagram } from '../actions/diagram-actions';

import type { App } from '../app';
import type { DiagramFileJSON } from '../diagram/types';
import type DiagramNode from '../diagram/models/DiagramNode';

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
        });

        this.listenTo(scroller, {
            'pan:start': onScrollerPanStart,
            'pan:stop': onScrollerPanStop,
        });
    }
}

// UI interactions with elements

function onElementMouseEnter(app: App, elementView: dia.ElementView) {
    addEffect(elementView, Effect.NodeHover);
    if (elementView.model instanceof Node) {
        addNodeHoverTools(app, elementView as dia.ElementView<Node>);
    }
}

function onElementMouseLeave(app: App, elementView: dia.ElementView) {
    const { paper } = app;

    removeEffect(paper, Effect.NodeHover);
    removeCellTools(app, elementView);
}

function onPortClick(app: App, elementView: dia.ElementView, _evt: dia.Event, portId: string) {
    openPortMenu(app, elementView.model as DiagramNode, { portId: portId });
}

function onNodePointerClick(app: App, elementView: dia.ElementView<Node>, evt: dia.Event) {
    const node = elementView.model;

    selectModel(app, node, { cherryPick: evt.ctrlKey || evt.metaKey });

    if (node instanceof Action || node instanceof Trigger || node instanceof Control) {
        // Let the user set the action/trigger provider
        // if the node is not configured yet
        if (!node.isConfigured()) {
            openRegistryDialog(app, node);
        }
    }
}

function onNodePointerDblClick(app: App, elementView: dia.ElementView<Node>) {
    const node = elementView.model;

    if (node instanceof Note) {
        openNoteEditor(app, node);
        return;
    }

    if (node instanceof Action || node instanceof Trigger || node instanceof Control) {
        openRegistryDialog(app, node);
        return;
    }
}

function onCellHighlight(app: App, cellView: dia.CellView, _node: SVGElement, { type }: { type: dia.CellView.Highlighting }) {
    switch (type) {
        case dia.CellView.Highlighting.ELEMENT_AVAILABILITY:
            addEffect(cellView, Effect.ConnectionCandidate);
            break;
        case dia.CellView.Highlighting.CONNECTING:
            addEffect(cellView, Effect.ConnectionTarget);
            break;
    }
}

function onCellUnhighlight(app: App, _cellView: dia.CellView, _node: SVGElement, { type }: { type: dia.CellView.Highlighting }) {
    const { paper } = app;

    switch (type) {
        case dia.CellView.Highlighting.ELEMENT_AVAILABILITY:
            removeEffect(paper, Effect.ConnectionCandidate);
            break;
        case dia.CellView.Highlighting.CONNECTING:
            removeEffect(paper, Effect.ConnectionTarget);
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
    if (linkView.model instanceof Edge) {
        addEdgeHoverTools(app, linkView as dia.LinkView<Edge>);
    }
}

function onLinkMouseLeave(app: App, linkView: dia.LinkView) {
    if (linkView.model instanceof Edge) {
        removeCellTools(app, linkView as dia.LinkView<Edge>);
    }
}

//  UI interactions with the paper background

function onBlankPointerdown(app: App, evt: dia.Event) {
    const { scroller, selection } = app;

    const targetName = evt.target.localName;
    if (targetName === 'textarea' || targetName === 'button') {
        // The user is editing a note, or clicking a button. Do nothing.
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

function onFileDrop(app: App, json: DiagramFileJSON) {

    loadDiagram(app, json);
}
