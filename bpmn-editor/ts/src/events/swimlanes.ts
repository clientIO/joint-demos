import type { dia } from '@joint/plus';
import { shapes } from '@joint/plus';
import { EffectType, addEffect, removeEffect } from '../effects';
import { isStencilEvent } from '../utils';
import { showGhostOnNextInteraction } from '../effects/ghost';
import { HorizontalSwimlane, VerticalSwimlane } from '../shapes/pool/pool-shapes';

export function onSwimlaneDragStart(paper: dia.Paper, elementView: dia.ElementView, evt: dia.Event, _x: number, _y: number) {

    if (!isStencilEvent(evt)) {

        if (!canMoveSwimlane(elementView.model as shapes.bpmn2.Swimlane)) {
            return;
        }

        elementView.preventDefaultInteraction(evt);

        // Do not move the swimlane, show the ghost instead.
        showGhostOnNextInteraction(paper);
    }

    // Highlight the source swimlane which remains highlighted in the pool
    // until the drag ends.
    addEffect(elementView, EffectType.SourceSwimlane);
}

export function onSwimlaneDrag(paper: dia.Paper, elementView: dia.ElementView, evt: dia.Event, x: number, y: number) {

    if (!isStencilEvent(evt) && !canMoveSwimlane(elementView.model as shapes.bpmn2.Swimlane)) {
        elementView.preventDefaultInteraction(evt);
        return;
    }

    removeEffect(paper, EffectType.TargetPool);
    removeEffect(paper, EffectType.PreviewSwimlane);

    const ghostEl = evt.data.ghost;

    const addInvalidEffect = () => {
        if (ghostEl) {
            ghostEl.classList.add('highlighter-error');
        } else {
            addEffect(elementView, EffectType.Error);
        }
    };

    const removeInvalidEffect = () => {
        if (ghostEl) {
            ghostEl.classList.remove('highlighter-error');
        } else {
            removeEffect(elementView.paper!, EffectType.Error);
        }
    };

    const viewInArea = paper
        .findElementViewsAtPoint({ x, y })
        .sort((a, b) => {
            const bZ = b.model.get('z') ?? 0;
            const aZ = a.model.get('z') ?? 0;

            return bZ - aZ;
        });

    // Find the `poolView` that is the top-most pool under the cursor.
    const poolView = viewInArea.find((view) => shapes.bpmn2.CompositePool.isPool(view.model));

    if (!poolView) {
        evt.data.poolView = null;
        addInvalidEffect();
        return;
    }

    const lane = elementView.model as shapes.bpmn2.Swimlane;
    const pool = poolView.model as shapes.bpmn2.CompositePool;

    if (!isStencilEvent(evt) && !lane.isCompatibleWithPool(pool)) {
        // Swimlane orientation is incompatible with pool orientation.
        // If we drag a swimlane from the stencil, we can replace it with a new one on drop.
        evt.data.poolView = null;
        addInvalidEffect();
        return;
    }

    evt.data.poolView = poolView;
    removeInvalidEffect();

    const swimlanes = pool.getSwimlanes();
    if (swimlanes.length === 0) {
        addEffect(poolView, EffectType.TargetPool);
    } else {
        const currentIndex = swimlanes.indexOf(lane);
        const index = pool.getSwimlaneInsertIndexFromPoint({ x, y });
        if (currentIndex === -1 || (currentIndex !== index && currentIndex !== index - 1)) {
            addEffect(poolView, EffectType.PreviewSwimlane, { index });
        }
    }
}

export function onSwimlaneDragEnd(paper: dia.Paper, elementView: dia.ElementView, evt: dia.Event, x: number, y: number) {
    removeEffect(paper, EffectType.TargetPool);
    removeEffect(paper, EffectType.SourceSwimlane);
    removeEffect(paper, EffectType.PreviewSwimlane);
    // The invalid drop effect can be applied to the stencil paper
    removeEffect(elementView.paper!, EffectType.Error);

    if (isStencilEvent(evt)) return;

    // The swimlane comes from the same paper and the drag has ended.
    // See if the swimlane has been dropped on a pool.
    checkSwimlaneDrop(elementView.model as shapes.bpmn2.Swimlane, evt.data.poolView?.model, x, y);
}

export function onSwimlaneDrop(_paper: dia.Paper, elementView: dia.ElementView, evt: dia.Event, x: number, y: number) {
    // The swimlane is dropped from the stencil. It's already added into the target paper.
    return checkSwimlaneDrop(elementView.model as shapes.bpmn2.Swimlane, evt.data.poolView?.model, x, y);
}

// Helpers

function canMoveSwimlane(swimlane: shapes.bpmn2.Swimlane) {
    const pool = swimlane.getParentCell() as shapes.bpmn2.CompositePool;
    // Do not allow to remove the last swimlane from the pool.
    return pool.getSwimlanes().length > 1;
}

function checkSwimlaneDrop(
    swimlane: shapes.bpmn2.Swimlane,
    pool: shapes.bpmn2.CompositePool | null,
    x: number,
    y: number
) {
    if (!pool) {
        // The swimlane is not dropped into a pool.
        if (!swimlane.isEmbedded()) {
            // Remove the swimlane if it is not embedded in any pool.
            swimlane.remove();
        }
        return;
    }

    let compatibleSwimlane = swimlane;
    if (!swimlane.isCompatibleWithPool(pool)) {
        // Swimlane orientation is incompatible with pool orientation.
        // Remove it and replace it with a new one.
        swimlane.remove();
        compatibleSwimlane = pool.isHorizontal()
            ? new HorizontalSwimlane()
            : new VerticalSwimlane();
    }

    const insertIndex = pool.getSwimlaneInsertIndexFromPoint({ x, y });
    pool.addSwimlane(compatibleSwimlane, insertIndex);

    return compatibleSwimlane;
}
