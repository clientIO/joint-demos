import { type dia } from '@joint/plus';
import { addEffect, removeEffect, EffectType } from '../effects';
import { isStencilEvent, validateAndReplaceConnections, isBoundaryEvent, snapToParentPath } from '../utils';
import { ShapeTypes } from '../shapes/shapes-typing';
import { IntermediateBoundary } from '../shapes/event/event-shapes';
import { replaceShape } from '../editor/replace-shape';

import type { shapes } from '@joint/plus';
import type { AppShape } from '../shapes/shapes-typing';

export function onElementDragStart(_paper: dia.Paper, elementView: dia.ElementView, _evt: dia.Event, _x: number, _y: number) {
    addEffect(elementView, EffectType.Shadow);
}

export function onElementDrag(paper: dia.Paper, elementView: dia.ElementView, evt: dia.Event, x: number = 0, y: number = 0) {

    const targetParentView = elementView.getTargetParentView(evt);

    if (!isBoundaryEvent(elementView, targetParentView) || !targetParentView) return;

    const { clientX = 0, clientY = 0 } = evt;
    const { x: localX, y: localY } = paper.clientToLocalPoint(clientX, clientY);

    const snappedPoint = snapToParentPath(elementView, targetParentView as dia.ElementView, localX, localY);

    if (!snappedPoint) return;

    elementView.model.position(snappedPoint.x - x, snappedPoint.y - y);
}

export function onElementDragEnd(paper: dia.Paper, elementView: dia.ElementView, evt: dia.Event, _x: number, _y: number) {
    removeEffect(paper, EffectType.Shadow);

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

    let model = elementView.model;

    const parentView = elementView.model.getParentCell()?.findView(paper);
    if (!parentView) return model;

    if (!isBoundaryEvent(elementView, parentView)) {
        onElementSwimlaneDrop(paper, elementView, evt, x, y);
        return model;
    }

    const snappedPoint = snapToParentPath(elementView, parentView as dia.ElementView, x, y);

    elementView.model.position(snappedPoint.x, snappedPoint.y);

    // An element dropped on an activity border becomes a boundary event.
    model = new IntermediateBoundary({ id: model.id });
    replaceShape(paper.model, elementView.model as unknown as AppShape, model as unknown as AppShape);

    return model;
}

// Helpers

function checkElementOverlaps(element: dia.Element) {
    const lane = element.getParentCell() as shapes.bpmn2.Swimlane;
    if (!lane) return;
    const pool = lane.getParentCell();
    if (!pool || pool.get('shapeType') !== ShapeTypes.POOL) return;
    (pool as shapes.bpmn2.CompositePool).adjustToContainElements(lane);
}
