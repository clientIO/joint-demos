/**
 * The routing constants both the router and the paper read.
 *
 * The routing itself runs in `@joint/router-avoid`'s worker — the first two
 * constants are handed to `initAvoidRouter` — while the paper only draws the
 * vertices the router service writes.
 */

/** Clearance Libavoid keeps around every shape, in px. */
export const SHAPE_BUFFER_DISTANCE = 20;

/** Spacing Libavoid nudges overlapping segments apart by, in px. */
export const IDEAL_NUDGING_DISTANCE = 10;

/** Corner radius the links are drawn with, in px. */
export const CORNER_RADIUS = 4;
