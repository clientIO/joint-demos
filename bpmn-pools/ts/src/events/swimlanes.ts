import type { dia, shapes } from '@joint/plus';
import { addEffect, removeEffect, EffectType } from '../effects';
import { isStencilEvent, findViewFromEvent } from '../utils';
import { showGhostOnNextInteraction } from '../actions/ghost';
import { deselect } from '../actions/selection';
import { VerticalSwimlane, HorizontalSwimlane } from '../shapes';

export function onSwimlaneDragStart(paper: dia.Paper, elementView: dia.ElementView, evt: dia.Event, _x: number, _y: number) {
    deselect(paper);

    if (!isStencilEvent(evt)) {
        // Do not move the swimlane, show the ghost instead.
        elementView.preventDefaultInteraction(evt);
        showGhostOnNextInteraction(paper);
    }

    // Highlight the source swimlane which remains highlighted in the pool
    // until the drag ends.
    addEffect(elementView, EffectType.SourceSwimlane);
}

export function onSwimlaneDrag(paper: dia.Paper, elementView: dia.ElementView, evt: dia.Event, x: number, y: number) {
    removeEffect(paper, EffectType.TargetPool);
    removeEffect(paper, EffectType.PreviewSwimlane);

    const ghostEl = evt.data.ghost;

    const addInvalidEffect = () => {
        if (ghostEl) {
            ghostEl.classList.add('hgl-invalid-drop');
        } else {
            addEffect(elementView, EffectType.InvalidDrop);
        }
    };

    const removeInvalidEffect = () => {
        if (ghostEl) {
            ghostEl.classList.remove('hgl-invalid-drop');
        } else {
            removeEffect(elementView.paper, EffectType.InvalidDrop);
        }
    };

    const poolView = findViewFromEvent(paper, evt, ['custom.HorizontalPool', 'custom.VerticalPool']);
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
    removeEffect(elementView.paper, EffectType.InvalidDrop);

    if (isStencilEvent(evt)) return;

    // The swimlane comes from the same paper and the drag has ended.
    // See if the swimlane has been dropped on a pool.
    checkSwimlaneDrop(elementView.model as shapes.bpmn2.Swimlane, evt.data.poolView?.model, x, y);
}

export function onSwimlaneDrop(_paper: dia.Paper, elementView: dia.ElementView, evt: dia.Event, x: number, y: number) {
    // The swimlane is dropped from the stencil. It's already added into the target paper.
    checkSwimlaneDrop(elementView.model as shapes.bpmn2.Swimlane, evt.data.poolView?.model, x, y);
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
}
