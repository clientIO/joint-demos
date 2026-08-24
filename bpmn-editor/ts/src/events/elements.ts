import { type dia } from '@joint/plus';
import { addEffect, removeEffect, EffectType } from '../effects';
import { isStencilEvent, validateAndReplaceConnections, isBoundaryEvent, snapToParentBoundary, type EditorEvent } from '../utils';
import { ShapeTypes } from '../shapes/shapes-typing';
import { setBoundarySnapActive } from './boundary-snap';

import type { ui } from '@joint/plus';

import type { shapes } from '@joint/plus';

/**
 * Adds a drop shadow to the dragged element.
 */
export function onElementDragStart(_paper: dia.Paper, elementView: dia.ElementView, _evt: EditorEvent, _x: number, _y: number) {
    addEffect(elementView, EffectType.Shadow);
}

/**
 * Snaps a dragged event to the border of the activity under the pointer
 * (becoming a boundary event) and suppresses the snaplines while it does.
 */
export function onElementDrag(paper: dia.Paper, elementView: dia.ElementView, evt: EditorEvent, x: number = 0, y: number = 0, snaplines?: ui.Snaplines) {

    const targetParentView = elementView.getTargetParentView(evt);

    // Suppress the snaplines while snapping to an activity border, so they
    // don't fight the border snapping.
    const overActivityBorder = !!targetParentView && !!isBoundaryEvent(elementView, targetParentView);
    setBoundarySnapActive(snaplines, overActivityBorder);

    if (!overActivityBorder) return;

    const { clientX = 0, clientY = 0 } = evt;
    const { x: localX, y: localY } = paper.clientToLocalPoint(clientX, clientY);

    const snappedPoint = snapToParentBoundary(elementView.model, targetParentView.model as dia.Element, localX, localY);

    elementView.model.position(snappedPoint.x - x, snappedPoint.y - y);
}

/**
 * Cleans the drag effects up; for in-diagram drags also grows the pool to
 * contain the element and re-validates its connections when the parent
 * changed (or the element was forked from the halo).
 */
export function onElementDragEnd(paper: dia.Paper, elementView: dia.ElementView, evt: EditorEvent, _x: number, _y: number, snaplines?: ui.Snaplines) {
    removeEffect(paper, EffectType.Shadow);
    setBoundarySnapActive(snaplines, false);

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

/**
 * Grows the pool of the swimlane the element was dropped into, if needed.
 */
export function onElementSwimlaneDrop(_paper: dia.Paper, elementView: dia.ElementView, _evt: EditorEvent, _x: number, _y: number) {
    checkElementOverlaps(elementView.model);
}

// Helpers

function checkElementOverlaps(element: dia.Element) {
    const lane = element.getParentCell() as shapes.bpmn2.Swimlane;
    if (!lane) return;
    const pool = lane.getParentCell();
    if (!pool || pool.get('shapeType') !== ShapeTypes.POOL) return;
    (pool as shapes.bpmn2.CompositePool).adjustToContainElements(lane);
}
