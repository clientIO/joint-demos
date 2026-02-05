import { addEffect, removeEffect, EffectType } from '../effects';
import { isStencilEvent, validateAndReplaceConnections, isBoundaryEvent, snapToParentPath } from '../utils';
import { ShapeTypes } from '../shapes/shapes-typing';

export function onElementDragStart(_paper, elementView, _evt, _x, _y) {
    addEffect(elementView, EffectType.Shadow);
}

export function onElementDrag(paper, elementView, evt, x = 0, y = 0) {
    
    const targetParentView = elementView.getTargetParentView(evt);
    
    if (!isBoundaryEvent(elementView, targetParentView) || !targetParentView)
        return;
    
    const { clientX = 0, clientY = 0 } = evt;
    const { x: localX, y: localY } = paper.clientToLocalPoint(clientX, clientY);
    
    const snappedPoint = snapToParentPath(elementView, targetParentView, localX, localY);
    
    if (!snappedPoint)
        return;
    
    elementView.model.position(snappedPoint.x - x, snappedPoint.y - y);
}

export function onElementDragEnd(paper, elementView, evt, _x, _y) {
    removeEffect(paper, EffectType.Shadow);
    
    const element = elementView.model;
    
    if (!isStencilEvent(evt)) {
        checkElementOverlaps(element);
        
        // Embedding is finalized when the element is dropped
        const newParent = element.parent();
        const { initialParentId } = elementView.eventData(evt);
        const isFork = evt.data.fork;
        
        // Validate and replace connection if the parent has changed
        // or the element is being forked
        if (newParent != initialParentId || isFork) {
            validateAndReplaceConnections(element, paper.model);
        }
    }
}

export function onElementSwimlaneDrop(_paper, elementView, _evt, _x, _y) {
    checkElementOverlaps(elementView.model);
}

// Helpers

function checkElementOverlaps(element) {
    const lane = element.getParentCell();
    if (!lane)
        return;
    const pool = lane.getParentCell();
    if (!pool || pool.get('shapeType') !== ShapeTypes.POOL)
        return;
    pool.adjustToContainElements(lane);
}
