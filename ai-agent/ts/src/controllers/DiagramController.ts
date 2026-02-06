import { type dia, ui } from '@joint/plus';
import { Controller } from '../system/controllers';
// Diagram
import { State } from '../const';
import { appConfig } from '../configs';
import { Action, Agent, Trigger, Node, Note, Edge  } from '../diagram/models';
import { addEffect, removeEffect, Effect } from '../diagram/effects';
// Actions
import { openButtonMenu, openPlaceholderMenu, openPaperMenu } from '../actions/menu-actions';
import { openProviderRegistryDialog } from '../actions/registry-actions';
import { addNodeHoverTools, addEdgeHoverTools, removeCellTools } from '../actions/tools-actions';
import { openNoteEditor } from '../actions/notes-actions';
import { selectModel } from '../actions/selection-actions';
import { loadDiagram } from '../actions/diagram-actions';

import type { App } from '../app';
import type { AgentView } from '../diagram/views';
import type { DiagramJSON } from '../diagram/types';
import type { SystemButton, SystemPlaceholder } from '../system/diagram/models';

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
            'button:pointerclick': onButtonPointerClick,
            'placeholder:pointerclick': onPlaceholderPointerClick,
            'node:pointerclick': onNodePointerClick,
            'node:pointerdblclick': onNodePointerDblClick,
            'agent:add-skill:pointerclick': onAgentAddSkillPointerClick,
            'agent:remove-skill:pointerclick': onAgentRemoveSkillPointerClick,
            // Paper
            'transform': onPaperTransform,
            'blank:pointerdown': onBlankPointerdown,
            'blank:contextmenu': onBlankContextmenu,
            'paper:pinch': onPaperPinch,
            'paper:pan': onPaperPan,
            // IO (see features/file-drop.ts)
            'file:drop': onFileDrop,
            // Effects (see system/diagram/effects.ts)
            'effect:add': onEffectRequested,
            'effect:remove': onEffectRemovalRequested,
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

function onButtonPointerClick(app: App, elementView: dia.ElementView<SystemButton>) {
    openButtonMenu(app, elementView.model);
}

function onPlaceholderPointerClick(app: App, elementView: dia.ElementView<SystemPlaceholder>) {
    openPlaceholderMenu(app, elementView.model);
}

function onNodePointerClick(app: App, elementView: dia.ElementView<Node>, evt: dia.Event) {
    const node = elementView.model;

    selectModel(app, node, { cherryPick: evt.ctrlKey || evt.metaKey });

    if (node instanceof Action || node instanceof Trigger) {
        // Let the user set the action/trigger provider
        // if the node is not configured yet
        if (!node.isConfigured()) {
            openProviderRegistryDialog(app, node);
        }
    }
}

function onNodePointerDblClick(app: App, elementView: dia.ElementView<Node>) {
    const node = elementView.model;

    if (node instanceof Note) {
        openNoteEditor(app, node);
        return;
    }

    if (node instanceof Agent || node instanceof Action || node instanceof Trigger) {
        openProviderRegistryDialog(app, node);
        return;
    }
}

function onAgentAddSkillPointerClick(app: App, agentView: AgentView) {
    const agent = agentView.model;

    openProviderRegistryDialog(app, agent);
}

function onAgentRemoveSkillPointerClick(app: App, agentView: AgentView, evt: dia.Event, skillId: string) {
    const agent = agentView.model;
    // Data are updated in `NodesController` after the model change
    agent.removeSkill(skillId, { ui: true });
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

// Paper transformations

function onPaperTransform(_app: App, _evt: dia.Event) {

    // Close any opened context toolbar so it doesn't appear in a wrong position when paper is transformed, for example when zooming
    ui.ContextToolbar.close();
}

// Zooming and Panning

function onPaperPinch(app: App, evt: dia.Event, ox: number, oy: number, scale: number) {
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

// IO Interactions

function onFileDrop(app: App, json: DiagramJSON) {

    loadDiagram(app, json);
}

// Effects

function onEffectRequested(app: App, cellView: dia.CellView, effect: typeof Effect[keyof typeof Effect]) {
    addEffect(cellView, effect);
}

function onEffectRemovalRequested(app: App, effect: typeof Effect[keyof typeof Effect]) {
    const { paper } = app;

    removeEffect(paper, effect);
}
