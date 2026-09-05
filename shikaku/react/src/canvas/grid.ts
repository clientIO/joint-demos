/**
 * Grid units in, pixels out.
 *
 * The board is laid out one graph element per square, so the conversion is a
 * multiplication — the only fiddly part is turning the pixel rectangle the
 * rubber band hands back into the squares it covers.
 */
import type { g } from '@joint/plus';
import type { Rect } from '@/puzzle/types';

/** Side of one square, in paper units. */
export const CELL = 44;

/**
 * The gap left around a rectangle, in paper units.
 *
 * A rectangle is inset by half of this on every side, so two rectangles that
 * share a grid line end up a whole `GAP` apart with the board showing through
 * between them. That gap, and not a border color, is what separates them.
 */
export const GAP = 5;

/** Corner radius of a placed rectangle. */
export const REGION_RADIUS = 7;

/** Corner radius of an empty square. */
export const SQUARE_RADIUS = 2;

export function cellId(x: number, y: number): string {
    return `c:${x}:${y}`;
}

export interface PixelBox {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
}

/** Where a rectangle's element sits, inset by half the gap on every side. */
export function rectToBox(rect: Rect): PixelBox {
    return {
        x: rect.x * CELL + GAP / 2,
        y: rect.y * CELL + GAP / 2,
        width: rect.w * CELL - GAP,
        height: rect.h * CELL - GAP,
    };
}

/** Where a clue sits inside its rectangle's element, in the element's own space. */
export function clueOffset(rect: Rect, x: number, y: number): { x: number; y: number } {
    return {
        x: (x - rect.x) * CELL + CELL / 2 - GAP / 2,
        y: (y - rect.y) * CELL + CELL / 2 - GAP / 2,
    };
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

/**
 * The squares a pixel rectangle covers, clamped to the board.
 *
 * A square counts as covered when the rectangle overlaps it by more than
 * nothing, so a band dragged one pixel into the next column takes that column.
 * The epsilon keeps a band that stops exactly *on* a grid line from claiming
 * the square on the far side of it.
 *
 * The caller has already unioned the band with its anchor square, so the input
 * always covers at least one whole square and the result is never empty.
 */
export function snapToGrid(bbox: g.Rect, cols: number, rows: number): Rect {
    const epsilon = 1e-6;
    const x0 = clamp(Math.floor(bbox.x / CELL + epsilon), 0, cols - 1);
    const y0 = clamp(Math.floor(bbox.y / CELL + epsilon), 0, rows - 1);
    const x1 = clamp(Math.ceil((bbox.x + bbox.width) / CELL - epsilon) - 1, 0, cols - 1);
    const y1 = clamp(Math.ceil((bbox.y + bbox.height) / CELL - epsilon) - 1, 0, rows - 1);
    return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
