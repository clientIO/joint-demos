import { dia } from '@joint/plus';
import Controller from './Controller';
import { Attribute } from '../diagram/const';
// Diagram
import { SystemButton, SystemPlaceholder } from '../diagram/models';
import { Effect, triggerEffect, triggerEffectRemoval } from '../diagram/effects';
// Actions
import { showOrderPreviewOnNextInteraction } from '../actions/order-preview';
import { trackPositionOnNextInteraction } from '../actions/track-position';

/**
 * UIController manages user interactions and UI-related events for the diagram.
 */
export default class UIController extends Controller {
    
    startListening() {
        const { paper } = this.context;
        
        this.listenTo(paper, {
            'link:connect': onLinkConnect,
            'cell:highlight': onCellHighlight,
            'cell:unhighlight': onCellUnhighlight,
            'element:pointerdown': onElementPointerdown,
            'element:pointerclick': onElementPointerClick,
            'element:pointerdblclick': onElementPointerDblClick,
        });
    }
}

function onElementPointerdown(ctx, elementView, evt) {
    const element = elementView.model;
    if (SystemButton.isButton(element)) {
        // Create a link from the button parent
        return;
    }
    if (element.get(Attribute.CustomPosition)) {
        // Move an element with custom position
        trackPositionOnNextInteraction(ctx);
        return;
    }
    // Sibling re-ordering
    showOrderPreviewOnNextInteraction(ctx);
    elementView.preventDefaultInteraction(evt);
}

function onLinkConnect(ctx, linkView) {
    const { diagramData } = ctx;
    const link = linkView.model;
    
    diagramData.addEdge(link.source().id, link.target().id, {
        disableOptimalOrderHeuristic: false
    });
}

function onElementPointerClick(ctx, elementView, evt, x, y) {
    const { paper } = ctx;
    const element = elementView.model;
    
    if (SystemPlaceholder.isPlaceholder(element)) {
        paper.trigger('placeholder:pointerclick', elementView, evt, x, y);
        return;
    }
    
    if (SystemButton.isButton(element)) {
        paper.trigger('button:pointerclick', elementView, evt, x, y);
        return;
    }
    
    paper.trigger('node:pointerclick', elementView, evt, x, y);
}

function onElementPointerDblClick(ctx, elementView, evt, x, y) {
    const { paper } = ctx;
    const element = elementView.model;
    
    if (SystemPlaceholder.isPlaceholder(element)) {
        paper.trigger('placeholder:pointerdblclick', elementView, evt, x, y);
        return;
    }
    
    if (SystemButton.isButton(element)) {
        paper.trigger('button:pointerdblclick', elementView, evt, x, y);
        return;
    }
    
    paper.trigger('node:pointerdblclick', elementView, evt, x, y);
}

function onCellHighlight(ctx, cellView, _node, { type }) {
    const { paper } = ctx;
    switch (type) {
        case dia.CellView.Highlighting.ELEMENT_AVAILABILITY:
            if (SystemPlaceholder.isPlaceholder(cellView.model))
                break;
            triggerEffect(paper, cellView.model, Effect.ConnectionAvailableTarget);
            break;
        case dia.CellView.Highlighting.CONNECTING:
            triggerEffect(paper, cellView.model, Effect.ConnectionTarget);
            break;
    }
}

function onCellUnhighlight(ctx, _cellView, _node, { type }) {
    const { paper } = ctx;
    switch (type) {
        case dia.CellView.Highlighting.ELEMENT_AVAILABILITY:
            triggerEffectRemoval(paper, Effect.ConnectionAvailableTarget);
            break;
        case dia.CellView.Highlighting.CONNECTING:
            triggerEffectRemoval(paper, Effect.ConnectionTarget);
            break;
    }
}
