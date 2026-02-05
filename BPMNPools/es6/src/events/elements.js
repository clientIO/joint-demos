import { addEffect, removeEffect, EffectType } from '../effects';
import { isStencilEvent, findViewFromEvent } from '../utils';

export function onElementDragStart(_paper, elementView, evt, _x, _y) {
    if (isStencilEvent(evt)) {
        // Add a shadow effect to the element when the drag starts
        // (indicating that the element is above the pool container)
        // Show the shadow as soon as the element is picked up
        // if the element comes from the stencil.
        addEffect(elementView, EffectType.Shadow);
    }
}

export function onElementDrag(paper, elementView, evt, x, y) {
    
    // All elements except pools, swimlanes and phases can be embedded into swimlanes and phases.
    
    const data = evt.data;
    if (!data.hasElementMoved && !isStencilEvent(evt)) {
        // If the element is not from the stencil, we add the shadow effect
        // as soon as the user moves the element.
        addEffect(elementView, EffectType.Shadow);
    }
    data.hasElementMoved = true;
    const poolView = findViewFromEvent(paper, evt, ['custom.HorizontalPool', 'custom.VerticalPool']);
    if (poolView) {
        const pool = poolView.model;
        const swimlanes = pool.getSwimlanes();
        if (swimlanes.length > 0) {
            const coords = (isStencilEvent(evt)) ? { x, y } : elementView.model.getBBox().center();
            const oCoordinate = pool.getPhaseOrthogonalCoordinate();
            const phase = pool.findPhaseFromOrthogonalCoord(coords[oCoordinate]);
            if (phase) {
                if (data.phase === phase) {
                    // the phase is already highlighted
                    return;
                }
                removeEffect(paper, EffectType.TargetPhase);
                data.phase = phase;
                const phaseView = phase.findView(paper);
                addEffect(phaseView, EffectType.TargetPhase);
                return;
            }
        }
    }
    
    removeEffect(paper, EffectType.TargetPhase);
    data.phase = null;
}

export function onElementDragEnd(paper, elementView, evt, _x, _y) {
    removeEffect(paper, EffectType.TargetPhase);
    removeEffect(paper, EffectType.Shadow);
    if (!isStencilEvent(evt)) {
        checkElementOverlaps(elementView.model);
    }
}

export function onElementDrop(_paper, elementView, _evt, _x, _y) {
    checkElementOverlaps(elementView.model);
}

function checkElementOverlaps(element) {
    const lane = element.getParentCell();
    if (!lane)
        return;
    const pool = lane.getParentCell();
    if (!pool)
        return;
    pool.adjustToContainElements(lane);
}
