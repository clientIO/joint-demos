/**
 * What counts as a board size.
 *
 * Shared by the toolbar's inputs and the URL / environment overrides, so a
 * board asked for in a query string is held to exactly the limits the inputs
 * enforce.
 */
export const MIN_SIDE = 5;
export const MAX_SIDE = 25;

/** Nearest whole side within the limits. Anything unusable becomes `MIN_SIDE`. */
export function clampSide(value: number): number {
    if (!Number.isFinite(value)) return MIN_SIDE;
    return Math.min(MAX_SIDE, Math.max(MIN_SIDE, Math.round(value)));
}
