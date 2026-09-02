import { EffectType, addEffect, removeEffect } from '../effects';
import { canMoveSwimlane, findPoolViewAtPoint, isStencilEvent, type EditorEvent } from '../utils';
import { showGhostOnNextInteraction } from '../effects/ghost';
import { dropSwimlaneIntoPool } from '../actions/insert-swimlane';

import type { dia, g, shapes } from '@joint/plus';

/**
 * Highlights the source swimlane; in-diagram drags don't move the lane
 * itself — a drag ghost is shown instead.
 */
export function onSwimlaneDragStart(paper: dia.Paper, elementView: dia.ElementView, evt: EditorEvent, x: number, y: number) {

    if (!isStencilEvent(evt)) {

        if (!canMoveSwimlane(elementView.model as shapes.bpmn2.Swimlane)) {
            return;
        }

        elementView.preventDefaultInteraction(evt);

        // Do not move the swimlane, show the ghost instead.
        showGhostOnNextInteraction(paper, x, y);
    }

    // Highlight the source swimlane which remains highlighted in the pool
    // until the drag ends.
    addEffect(elementView, EffectType.SourceSwimlane);
}

/**
 * Tracks the pool under the dragged swimlane: highlights the insertion
 * preview (or the whole pool when empty) and marks incompatible or missing
 * drop targets as invalid.
 */
export function onSwimlaneDrag(paper: dia.Paper, elementView: dia.ElementView, evt: EditorEvent, x: number, y: number) {

    if (!isStencilEvent(evt) && !canMoveSwimlane(elementView.model as shapes.bpmn2.Swimlane)) {
        elementView.preventDefaultInteraction(evt);
        return;
    }

    removeEffect(paper, EffectType.TargetPool);
    removeEffect(paper, EffectType.PreviewSwimlane);

    const lane = elementView.model as shapes.bpmn2.Swimlane;
    const poolView = findPoolViewAtPoint(paper, { x, y });

    // A lane dragged from the stencil is replaced on drop by one the pool
    // accepts, so only an in-diagram drag can be refused for its orientation.
    const accepted = !!poolView && (isStencilEvent(evt) || lane.isCompatibleWithPool(poolView.model));

    evt.data.poolView = accepted ? poolView : null;
    setInvalidDropEffect(elementView, evt.data.ghost, !accepted);

    if (!accepted) return;

    previewSwimlaneInsertion(poolView, lane, { x, y });
}

/**
 * Cleans the drag effects up; for in-diagram drags moves the swimlane into
 * the pool it was dropped on.
 */
export function onSwimlaneDragEnd(paper: dia.Paper, elementView: dia.ElementView, evt: EditorEvent, x: number, y: number) {
    removeEffect(paper, EffectType.TargetPool);
    removeEffect(paper, EffectType.SourceSwimlane);
    removeEffect(paper, EffectType.PreviewSwimlane);
    // The invalid drop effect can be applied to the stencil paper
    removeEffect(elementView.paper!, EffectType.Error);

    if (isStencilEvent(evt)) return;

    // The swimlane comes from the same paper and the drag has ended.
    // See if the swimlane has been dropped on a pool.
    dropSwimlaneIntoPool(elementView.model as shapes.bpmn2.Swimlane, evt.data.poolView?.model ?? null, x, y);
}

/**
 * Finalizes a swimlane dropped from the stencil and returns the model to
 * select: the swimlane, its orientation-compatible replacement, or nothing
 * when the swimlane was dropped outside of a pool and removed.
 */
export function dropSwimlane(_paper: dia.Paper, elementView: dia.ElementView, evt: EditorEvent, x: number, y: number): dia.Element | undefined {
    // The swimlane is dropped from the stencil. It's already added into the target paper.
    return dropSwimlaneIntoPool(elementView.model as shapes.bpmn2.Swimlane, evt.data.poolView?.model ?? null, x, y);
}

// The drag ghost wears the invalid state as a class: it is a plain node, not
// a cell view, so the effect highlighters cannot reach it.
function setInvalidDropEffect(elementView: dia.ElementView, ghost: SVGElement | undefined, invalid: boolean) {

    if (ghost) {
        ghost.classList.toggle('highlighter-error', invalid);
        return;
    }

    if (invalid) {
        addEffect(elementView, EffectType.Error);
    } else {
        removeEffect(elementView.paper!, EffectType.Error);
    }
}

// Where the lane would be inserted: the whole pool while it holds no lane to
// insert between, and the boundary otherwise — but not where the lane already
// sits, since dropping it back is no move at all.
function previewSwimlaneInsertion(
    poolView: dia.ElementView<shapes.bpmn2.CompositePool>,
    lane: shapes.bpmn2.Swimlane,
    point: g.PlainPoint
) {

    const pool = poolView.model;
    const swimlanes = pool.getSwimlanes();

    if (swimlanes.length === 0) {
        addEffect(poolView, EffectType.TargetPool);
        return;
    }

    const currentIndex = swimlanes.indexOf(lane);
    const index = pool.getSwimlaneInsertIndexFromPoint(point);

    if (currentIndex === -1 || (currentIndex !== index && currentIndex !== index - 1)) {
        addEffect(poolView, EffectType.PreviewSwimlane, { index });
    }
}
