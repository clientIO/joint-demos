import { createContext, type RefObject } from 'react';
import type { StencilApi } from '@joint/react-plus';
import type { dia } from '@joint/plus';

/**
 * The drag of the palette's stencil, for the canvas (a copy dragged with Cmd / Ctrl): the stencil renders its
 * children once the paper is there, so it can't be around the canvas - its drag is handed over by `StencilDragBridge`.
 */
export const StencilDragContext = createContext<RefObject<StencilApi['startCellDrag'] | null>>({ current: null });

/** Whether a press drags a copy: Cmd / Ctrl held. */
export function isDuplicateEvent(event: dia.Event): boolean {
    return Boolean(event.metaKey || event.ctrlKey);
}
