import type { dia, g, mvc, shapes } from '@joint/plus';

/** The preview of a pool dragged from the stencil. */
export interface PoolPreview {
    node: SVGElement;
    graphBBox: g.Rect | null;
    poolDimensions: g.Rect;
}

/** The state the editor's drag interactions attach to the pointer event. */
export interface EditorEventData {
    /** Set for events originating from a stencil drag. */
    isStencilEvent?: boolean;
    /** Set by the halo fork/connect handles (via the handle `data`). */
    fork?: boolean;
    /** The pool under the dragged swimlane. */
    poolView?: dia.ElementView<shapes.bpmn2.CompositePool> | null;
    /** The preview of a pool dragged from the stencil. */
    poolPreview?: PoolPreview;
    /** Where the dragged pool would be dropped. */
    poolDropCoordinates?: g.PlainPoint;
    /** The drag ghost of an element that does not move itself. */
    ghost?: SVGElement;
    /** The pointer offset from the ghosted element's position. */
    dx?: number;
    dy?: number;
}

/** A pointer event carrying the editor's interaction state. */
export type EditorEvent = mvc.TriggeredEvent<unknown, EditorEventData>;

/**
 * Whether the interaction originates from a stencil drag.
 */
export function isStencilEvent(evt: EditorEvent): boolean {
    return !!evt.data?.isStencilEvent;
}

/**
 * Whether the interaction originates from a halo fork/connect handle.
 */
export function isForkEvent(evt: EditorEvent): boolean {
    return !!evt.data?.fork;
}

/**
 * Marks the interaction as originating from a stencil drag.
 */
export function setStencilEvent(evt: EditorEvent, isStencilEvent: boolean): void {
    evt.data ??= {};
    evt.data.isStencilEvent = isStencilEvent;
}
