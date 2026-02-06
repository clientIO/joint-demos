import { addEffect, removeEffect, EffectType } from '../effects';
import { isStencilEvent, findViewFromEvent } from '../utils';
import { deselect } from '../actions/selection';
import { VerticalPhase, HorizontalPhase } from '../shapes';

export function onPhaseDragStart(paper, _elementView, evt, _x, _y) {
    if (isStencilEvent(evt)) {
        deselect(paper);
    }
}

export function onPhaseDrag(paper, elementView, evt, x, y) {
    if (!isStencilEvent(evt))
        return;
    
    removeEffect(paper, EffectType.TargetPool);
    removeEffect(paper, EffectType.PreviewPhase);
    
    const data = evt.data;
    const poolView = findViewFromEvent(paper, evt, ['custom.HorizontalPool', 'custom.VerticalPool']);
    data.poolView = poolView;
    if (poolView) {
        removeEffect(elementView.paper, EffectType.InvalidDrop);
        
        const coords = { x, y };
        const pool = poolView.model;
        const oCoordinate = pool.getPhaseOrthogonalCoordinate();
        const oDimension = pool.getPhaseOrthogonalDimension();
        const phase = pool.findPhaseFromOrthogonalCoord(coords[oCoordinate]);
        if (phase) {
            const phaseView = phase.findView(paper);
            
            // Re-apply the effect only if the phase has changed
            if (data.phase !== phase) {
                removeEffect(paper, EffectType.TargetPhase);
                addEffect(phaseView, EffectType.TargetPhase);
                data.phase = phase;
            }
            
            // The phase is dropped into another phase
            addEffect(phaseView, EffectType.PreviewPhase, coords);
            removeEffect(paper, EffectType.TargetPhaseElement);
            
            // Highlight the elements that will be part of the phase
            const phaseBBox = phase.getBBox();
            const phaseElements = pool.getElementsInOrthogonalRange(coords[oCoordinate], phaseBBox[oCoordinate] + phaseBBox[oDimension], { partial: false });
            phaseElements.forEach((element) => {
                addEffect(element.findView(paper), EffectType.TargetPhaseElement);
            });
            
            return;
            
        }
        else {
            // There is no phase in the pool yet
            addEffect(poolView, EffectType.TargetPool);
        }
        
    }
    else {
        // There is no pool, so the phase cannot be dropped.
        addEffect(elementView, EffectType.InvalidDrop);
    }
    
    // The phase is not dropped into another phase
    removeEffect(paper, EffectType.TargetPhaseElement);
    removeEffect(paper, EffectType.TargetPhase);
    
    data.phase = null;
}

export function onPhaseDragEnd(paper, _elementView, evt, _x, _y) {
    
    // The phase is dragged from the stencil
    if (!isStencilEvent(evt))
        return;
    
    removeEffect(paper, EffectType.InvalidDrop);
    removeEffect(paper, EffectType.TargetPhaseElement);
    removeEffect(paper, EffectType.TargetPhase);
    removeEffect(paper, EffectType.TargetPool);
    removeEffect(paper, EffectType.PreviewPhase);
}

export function onPhaseDrop(_paper, phaseView, evt, x, y) {
    const phase = phaseView.model;
    const poolView = evt.data.poolView;
    
    if (!poolView) {
        // The phase is not dropped into a pool
        if (!phase.isEmbedded()) {
            // Remove the phase if it is not embedded in any pool.
            phase.remove();
        }
        return;
    }
    
    const pool = poolView.model;
    
    let compatiblePhase = phase;
    if (!phase.isCompatibleWithPool(pool)) {
        // Phase orientation is incompatible with pool orientation.
        // Remove it and replace it with a new one.
        phase.remove();
        compatiblePhase = pool.isHorizontal()
            ? new VerticalPhase()
            : new HorizontalPhase();
    }
    const oCoordinate = pool.getPhaseOrthogonalCoordinate();
    const overlappedPhase = pool.findPhaseFromOrthogonalCoord(oCoordinate === 'x' ? x : y);
    const phases = pool.getPhases();
    if (phases.length > 0 && !overlappedPhase) {
        // This is not the first phase to be added, but no overlapped phase found
        // Would cause `pool.addPhase()` to throw an error
        phase.remove();
    }
    else {
        pool.addPhase(compatiblePhase, oCoordinate === 'x' ? x : y);
    }
}
