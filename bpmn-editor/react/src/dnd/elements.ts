import { type dia } from '@joint/plus';
import { addEffect, removeEffect, EffectType } from '../effects';
import { isStencilEvent, validateAndReplaceConnections, isBoundaryEvent, snapToParentBoundary, isPool, isSwimlane } from '../utils';
import { IntermediateBoundary } from '../shapes/event/event-shapes';
import { replaceShape } from '../actions/replace-shape';
import { setBoundarySnapActive } from './boundary-snap';

import type { shapes } from '@joint/plus';
import type { AppElement } from '../shapes/shapes-typing';

export function onElementDragStart(_paper: dia.Paper, elementView: dia.ElementView, _evt: dia.Event, _x: number, _y: number) {
    addEffect(elementView, EffectType.Shadow);
}

export function onElementDrag(paper: dia.Paper, elementView: dia.ElementView, evt: dia.Event, x: number = 0, y: number = 0) {

    const targetParentView = elementView.getTargetParentView(evt);

    const overActivityBorder = !!targetParentView && isBoundaryEvent(elementView, targetParentView);
    setBoundarySnapActive(overActivityBorder);

    if (!overActivityBorder) return;

    const { clientX = 0, clientY = 0 } = evt;
    const { x: localX, y: localY } = paper.clientToLocalPoint(clientX, clientY);

    const snappedPoint = snapToParentBoundary(elementView.model, targetParentView.model as dia.Element, localX, localY);

    elementView.model.position(snappedPoint.x - x, snappedPoint.y - y);
}

export function onElementDragEnd(paper: dia.Paper, elementView: dia.ElementView, evt: dia.Event, _x: number, _y: number) {
    removeEffect(paper, EffectType.Shadow);
    setBoundarySnapActive(false);

    const element = elementView.model;

    if (!isStencilEvent(evt)) {
        checkElementOverlaps(element);

        // Embedding is finalized when the element is dropped
        const newParent = element.parent();
        const { initialParentId } = elementView.eventData(evt) as { initialParentId?: string };
        const isFork = evt.data.fork;

        // Validate and replace connection if the parent has changed
        // or the element is being forked
        if (newParent != initialParentId || isFork) {
            validateAndReplaceConnections(element, paper.model);
        }
    }
}

export function onElementSwimlaneDrop(_paper: dia.Paper, elementView: dia.ElementView, _evt: dia.Event, _x: number, _y: number) {
    checkElementOverlaps(elementView.model);
}

// Finalizes an element dropped from the stencil and returns the model to
// select (the dropped element, or its boundary-event replacement).
export function dropElement(paper: dia.Paper, elementView: dia.ElementView, evt: dia.Event, x: number, y: number): dia.Element {

    // All diagram elements are app shapes.
    const model = elementView.model as AppElement;
    const parentModel = model.getParentCell() as AppElement | undefined;
    if (!parentModel || parentModel.isLink()) return model;
    const parentView = parentModel.findView(paper);
    if (!parentView) return model;

    if (!isBoundaryEvent(elementView, parentView)) {
        // The embedding rules only allow other parents for boundary events,
        // so the element was dropped into a swimlane.
        if (isSwimlane(parentModel)) {
            onElementSwimlaneDrop(paper, elementView, evt, x, y);
        }
        return model;
    }

    const snappedPoint = snapToParentBoundary(model, parentModel, x, y);
    model.position(snappedPoint.x, snappedPoint.y);

    // An element dropped on an activity border becomes a boundary event.
    const boundaryEvent = new IntermediateBoundary({ id: model.id });
    replaceShape(paper.model, model, boundaryEvent);

    return boundaryEvent;
}

// Helpers

function checkElementOverlaps(element: dia.Element) {
    const lane = element.getParentCell() as shapes.bpmn2.Swimlane;
    if (!lane) return;
    const pool = lane.getParentCell();
    if (!pool || !isPool(pool)) return;
    (pool as shapes.bpmn2.CompositePool).adjustToContainElements(lane);
}
