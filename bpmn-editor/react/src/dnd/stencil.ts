import { setStencilEvent, isSwimlane, isPool } from '../utils';
import { onSwimlaneDragStart, onSwimlaneDrag, onSwimlaneDragEnd, dropSwimlane } from './swimlanes';
import { onElementDragStart, onElementDrag, onElementDragEnd, dropElement } from './elements';
import { onPoolDragStart, onPoolDrag, onPoolDrop, onPoolDragEnd } from './pools';

import type { dia } from '@joint/plus';
import type { StencilDragParams, StencilDropParams } from '@joint/react-plus';

// Stencil drag-and-drop pipeline: routes each drag phase to the pool,
// swimlane or plain-element handlers.

export function onStencilElementDragStart({ model, event, dropArea, paper, dragPaper }: StencilDragParams) {
    const cloneView = dragPaper.findViewByModel(model) as dia.ElementView;
    const { x, y } = dropArea.center();

    setStencilEvent(event, true);

    if (isSwimlane(model)) {
        onSwimlaneDragStart(paper, cloneView, event, x, y);
    } else if (isPool(model)) {
        onPoolDragStart(paper, cloneView, event, x, y);
    } else {
        onElementDragStart(paper, cloneView, event, x, y);
    }
}

export function onStencilElementDrag({ model, event, dropArea, paper, dragPaper }: StencilDragParams) {
    const cloneView = dragPaper.findViewByModel(model) as dia.ElementView;
    const { x, y } = dropArea.center();

    if (isSwimlane(model)) {
        onSwimlaneDrag(paper, cloneView, event, x, y);
    } else if (isPool(model)) {
        onPoolDrag(paper, cloneView, event, x, y);
    } else {
        onElementDrag(paper, cloneView, event, dropArea.x, dropArea.y);
    }
}

export function onStencilElementDragEnd({ model, event, dropArea, paper, dragPaper }: StencilDragParams) {
    const cloneView = dragPaper.findViewByModel(model) as dia.ElementView;
    const { x, y } = dropArea.center();

    if (isSwimlane(model)) {
        onSwimlaneDragEnd(paper, cloneView, event, x, y);
    } else if (isPool(model)) {
        onPoolDragEnd(paper, cloneView, event, x, y);
    } else {
        onElementDragEnd(paper, cloneView, event, x, y);
    }
}

// Finalizes the drop and returns the model to select, if any (the dropped
// model may be replaced or removed during the drop).
export function dropStencilElement({ model, event, x, y, paper }: StencilDropParams): dia.Element | undefined {
    const elementView = paper.findViewByModel(model) as dia.ElementView;

    if (isSwimlane(model)) {
        return dropSwimlane(paper, elementView, event, x, y);
    }

    if (isPool(model)) {
        onPoolDrop(paper, elementView, event, x, y);
        return model;
    }

    return dropElement(paper, elementView, event, x, y);
}
