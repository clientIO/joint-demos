/**
 * The routing constants both sides of the worker boundary read.
 *
 * The router itself runs in the worker, but the paper draws the links it has no
 * route for yet — and those have to come out the same shape, or every link would
 * visibly jump the moment its route landed. Keeping the numbers in one module is
 * what keeps the two in agreement.
 */

/** Clearance Libavoid keeps around every shape, in px. */
export const SHAPE_BUFFER_DISTANCE = 20;

/** Spacing Libavoid nudges overlapping segments apart by, in px. */
export const IDEAL_NUDGING_DISTANCE = 10;

/** How far a port sticks out of its element, in px. */
export const PORT_OVERFLOW = 8;

/**
 * Clearance for the paper's own orthogonal router — the one that draws a link
 * while its route is pending, and the one Libavoid's route falls back to.
 *
 * Less than Libavoid's buffer by the port overflow: the paper measures its
 * margin from the port's border, Libavoid from the port's centre, and exactly
 * half of the port overlaps the element.
 */
export const FALLBACK_MARGIN = SHAPE_BUFFER_DISTANCE - PORT_OVERFLOW;

/** Corner radius the links are drawn with, in px. */
export const CORNER_RADIUS = 4;
