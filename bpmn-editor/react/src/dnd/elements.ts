import type { dia, g } from '@joint/plus';
import type { BpmnSwimlane } from '../shapes/pool/pool-shapes';
import { addEffect, removeEffect, EffectType } from '../effects';
import { isStencilEvent, validateAndReplaceConnections, isBoundaryEvent, snapToParentBoundary, adjustPoolToContainElement, isSwimlane, type EditorEvent } from '../utils';
import { IntermediateBoundary } from '../shapes/event/event-shapes';
import { replaceShape } from '../actions/replace-shape';
import { setBoundarySnapActive } from './boundary-snap';

import type { BpmnElement } from '../shapes/shapes-typing';

/**
 * Where to put a shape of `size` inside the lane: as close to `preferred`
 * as the lane allows, so it lands on screen but never outside its parent.
 */
export function positionInSwimlane(lane: BpmnSwimlane, size: dia.Size, preferred: g.PlainPoint) {

    const bbox = lane.getBBox().moveAndExpand({
        x: lane.getHeaderSize(),
        y: 0,
        width: -lane.getHeaderSize(),
        height: 0
    });
    const margin = lane.getContentMargin();

    // The lane can be smaller than the shape plus its margins.
    const maxX = Math.max(bbox.x, bbox.x + bbox.width - size.width - margin);
    const maxY = Math.max(bbox.y, bbox.y + bbox.height - size.height - margin);

    return {
        x: Math.min(Math.max(preferred.x - size.width / 2, bbox.x + margin), maxX),
        y: Math.min(Math.max(preferred.y - size.height / 2, bbox.y + margin), maxY)
    };
}

/**
 * Puts a new shape into the lane, embedding it and growing the pool.
 *
 * `clampToLane` keeps the shape within the lane's current bounds, which is
 * what a drop aimed at a lane wants. A neighbour added beside an existing
 * shape passes `false`: it has a place of its own to be, and pulling it
 * back inside would drop it on top of the shape it was added from — the
 * pool grows to take it instead.
 *
 * A shape that refuses the lane is placed but left loose. A group is the
 * case that matters: in BPMN it is an artifact, not something a
 * participant contains, and it is meant to be able to span pools and
 * lanes — so `Group.validateEmbedding()` returns false and the pointer
 * path never embeds one either.
 */
export function addElementToSwimlane(
    graph: dia.Graph,
    lane: BpmnSwimlane,
    element: dia.Element,
    point: g.PlainPoint,
    { clampToLane = true }: { clampToLane?: boolean } = {}
) {
    const embeds = (element as BpmnElement).validateEmbedding?.(lane) ?? true;
    const size = element.size();

    // Only a shape that goes into the lane is held to its bounds.
    const { x, y } = (clampToLane && embeds)
        ? positionInSwimlane(lane, size, point)
        : { x: point.x - size.width / 2, y: point.y - size.height / 2 };

    element.position(x, y);
    graph.addCell(element);

    if (embeds) {
        lane.embed(element);
        adjustPoolToContainElement(element);
    }

    return element;
}

/** Which way a new neighbour goes from the shape it is added to. */
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
export function onElementDrag(paper: dia.Paper, elementView: dia.ElementView, evt: EditorEvent, x: number = 0, y: number = 0) {

    const targetParentView = elementView.getTargetParentView(evt);

    const overActivityBorder = !!targetParentView && isBoundaryEvent(elementView, targetParentView);
    setBoundarySnapActive(overActivityBorder);

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
export function onElementDragEnd(paper: dia.Paper, elementView: dia.ElementView, evt: EditorEvent, _x: number, _y: number) {
    removeEffect(paper, EffectType.Shadow);
    setBoundarySnapActive(false);

    const element = elementView.model;

    if (!isStencilEvent(evt)) {
        adjustPoolToContainElement(element);

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
    adjustPoolToContainElement(elementView.model);
}

/**
 * Finalizes an element dropped from the stencil and returns the model to
 * select (the dropped element, or its boundary-event replacement).
 */
export function dropElement(paper: dia.Paper, elementView: dia.ElementView, evt: EditorEvent, x: number, y: number): dia.Element {

    // All diagram elements are app shapes.
    const model = elementView.model as BpmnElement;
    const parentModel = model.getParentCell() as BpmnElement | undefined;
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
