import { ui } from '@joint/plus';
import { Controller } from '../system/controllers';
// Diagram
import { State } from '../const';
import { appConfig } from '../configs';
import { Action, Node, Note, Edge } from '../diagram/models';
import { addEffect, removeEffect, Effect } from '../diagram/effects';
// Actions
import { openButtonMenu, openPlaceholderMenu, openPaperMenu } from '../actions/menu-actions';
import { openProviderRegistryDialog } from '../actions/registry-actions';
import { addNodeHoverTools, addEdgeHoverTools, removeCellTools } from '../actions/tools-actions';
import { openNoteEditor } from '../actions/notes-actions';
import { selectModel } from '../actions/selection-actions';
import { loadDiagram } from '../actions/diagram-actions';

/**
 * DiagramController manages user interactions with the diagram nodes,
 * edges, and the paper background.
 */
export default class DiagramController extends Controller {
    
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
            'trigger:add-criteria:pointerclick': onTriggerAddCriteriaPointerClick,
            'trigger:remove-criteria:pointerclick': onTriggerRemoveCriteriaPointerClick,
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

function onElementMouseEnter(app, elementView) {
    
    addEffect(elementView, Effect.NodeHover);
    if (elementView.model instanceof Node) {
        addNodeHoverTools(app, elementView);
    }
}

function onElementMouseLeave(app, elementView) {
    const { paper } = app;
    
    removeEffect(paper, Effect.NodeHover);
    removeCellTools(app, elementView);
}

function onButtonPointerClick(app, elementView) {
    openButtonMenu(app, elementView.model);
}

function onPlaceholderPointerClick(app, elementView) {
    openPlaceholderMenu(app, elementView.model);
}

function onNodePointerClick(app, elementView, evt) {
    const node = elementView.model;
    
    selectModel(app, node, { cherryPick: evt.ctrlKey || evt.metaKey });
    
    if (node instanceof Action) {
        // Let the user set the action/trigger provider
        // if the node is not configured yet
        if (!node.isConfigured()) {
            openProviderRegistryDialog(app, node);
        }
    }
}

function onNodePointerDblClick(app, elementView) {
    const node = elementView.model;
    
    if (node instanceof Note) {
        openNoteEditor(app, node);
        return;
    }
    
    if (node instanceof Action) {
        openProviderRegistryDialog(app, node);
        return;
    }
}

function onTriggerAddCriteriaPointerClick(app, triggerView) {
    const trigger = triggerView.model;
    openProviderRegistryDialog(app, trigger);
}

function onTriggerRemoveCriteriaPointerClick(app, triggerView, evt, criteriaId) {
    const trigger = triggerView.model;
    // Data are updated in `NodesController` after the model change
    trigger.removeCriteria(criteriaId, { ui: true });
}

// UI interactions with links

function onLinkPointerClick(app, linkView, evt) {
    const link = linkView.model;
    
    if (link instanceof Edge) {
        selectModel(app, link, { cherryPick: evt.ctrlKey || evt.metaKey });
    }
}

function onLinkMouseEnter(app, linkView) {
    if (linkView.model instanceof Edge) {
        addEdgeHoverTools(app, linkView);
    }
}

function onLinkMouseLeave(app, linkView) {
    if (linkView.model instanceof Edge) {
        removeCellTools(app, linkView);
    }
}

//  UI interactions with the paper background

function onBlankPointerdown(app, evt) {
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

function onBlankContextmenu(app, evt) {
    const { state } = app;
    
    if (state.get(State.PointerCaptured))
        return;
    openPaperMenu(app, evt);
}

// Paper transformations

function onPaperTransform(_app, _evt) {
    
    // Close any opened context toolbar so it doesn't appear in a wrong position when paper is transformed, for example when zooming
    ui.ContextToolbar.close();
}

// Zooming and Panning

function onPaperPinch(app, evt, ox, oy, scale) {
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

function onPaperPan(app, evt, tx, ty) {
    const { scroller } = app;
    
    evt.preventDefault();
    scroller.el.scrollLeft += tx;
    scroller.el.scrollTop += ty;
}

function onScrollerPanStart(app) {
    const { scroller } = app;
    
    scroller.setCursor('grabbing');
}

function onScrollerPanStop(app) {
    const { scroller } = app;
    
    scroller.setCursor('default');
}

// IO Interactions

function onFileDrop(app, json) {
    
    loadDiagram(app, json);
}

// Effects

function onEffectRequested(app, cellView, effect) {
    addEffect(cellView, effect);
}

function onEffectRemovalRequested(app, effect) {
    const { paper } = app;
    
    removeEffect(paper, effect);
}
