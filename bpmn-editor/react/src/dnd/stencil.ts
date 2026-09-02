import { setStencilEvent, isSwimlane, isPool } from '../utils';
import { onSwimlaneDragStart, onSwimlaneDrag, onSwimlaneDragEnd, dropSwimlane } from './swimlanes';
import { onElementDragStart, onElementDrag, onElementDragEnd, dropElement } from './elements';
import { onPoolDragStart, onPoolDrag, onPoolDrop, onPoolDragEnd } from './pools';

import type { dia } from '@joint/plus';
import type { StencilDragParams, StencilDropParams } from '@joint/react-plus';

// Stencil drag-and-drop pipeline: routes each drag phase to the pool,
// swimlane or plain-element handlers.

/**
 * Starts the drag of a stencil clone.
 */
export function onStencilElementDragStart({ model, event, dropArea, paper, dragPaper }: StencilDragParams) {
    const cloneView = dragPaper.findViewByModel(model) as dia.ElementView;
    const { x, y } = dropArea.center();

    showDragPaper(dragPaper);
    setStencilEvent(event, true);

    if (isSwimlane(model)) {
        onSwimlaneDragStart(paper, cloneView, event, x, y);
    } else if (isPool(model)) {
        onPoolDragStart(paper, cloneView, event, x, y);
    } else {
        onElementDragStart(paper, cloneView, event, x, y);
    }
}

/**
 * Puts the drag paper in the top layer.
 *
 * Works around a bug in `@joint/react-plus` (clientIO/joint-plus#803): the
 * drag paper is given `popover="manual"` and its UA popover styling is
 * neutralised, but nothing ever calls `showPopover()` on the React drag path,
 * so it is not in the top layer. It renders as an ordinary absolutely
 * positioned child of the body at `z-index: auto`, which the stencil
 * container paints over — the clone disappears behind the palette.
 *
 * Delete this once the library shows it itself.
 */
function showDragPaper(dragPaper: dia.Paper) {
    const { el } = dragPaper;

    // The types promise `showPopover`; a browser without the API is the case
    // this guards.
    if (typeof el.showPopover !== 'function') return;
    if (!el.hasAttribute('popover') || el.matches(':popover-open')) return;

    el.showPopover();
}

/**
 * Updates the drag preview of a stencil clone.
 */
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

/**
 * Cleans up when the drag of a stencil clone ends.
 */
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

/**
 * Finalizes the drop and returns the model to select, if any (the dropped
 * model may be replaced or removed during the drop).
 */
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
