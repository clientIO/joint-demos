import { type dia } from '@joint/plus';

/**
 * Whether the interaction originates from a stencil drag.
 */
export function isStencilEvent(evt: dia.Event): boolean {
    return !!evt.data?.isStencilEvent;
}

/**
 * Whether the interaction originates from a halo fork/connect handle.
 */
export function isForkEvent(evt: dia.Event): boolean {
    return !!evt.data?.fork;
}

/**
 * Marks the interaction as originating from a stencil drag.
 */
export function setStencilEvent(evt: dia.Event, isStencilEvent: boolean): void {
    if (!evt.data) {
        evt.data = {};
    }
    evt.data.isStencilEvent = isStencilEvent;
}
