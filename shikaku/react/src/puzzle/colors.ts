/**
 * Region colors.
 *
 * The point of coloring at all is to make the boundary between two finished
 * rectangles readable at a glance, so the only property that matters is that
 * neighbors differ. Each new rectangle takes the lowest palette entry that
 * none of its neighbors is using — rectangles never overlap, so this greedy
 * pick always finds one (four colors would already be enough for any planar
 * arrangement; the palette has eight, which also keeps the board from looking
 * like it is made of four repeating tiles).
 *
 * A rectangle keeps its color for as long as it is on the board: removing a
 * neighbor can never create a clash.
 *
 * What a palette index *looks* like is not decided here. The board draws with
 * `var(--region-fill-N)` / `var(--region-stroke-N)`, defined per theme in
 * `index.css`, so switching to the dark palette is a stylesheet swap rather
 * than a repaint of every element.
 */
import { rectsAdjacent, type Rect, type Region } from './types';

/** How many distinct colors a board can draw on. */
export const PALETTE_SIZE = 8;

/**
 * The palette index for a rectangle about to be placed among `regions`.
 *
 * Called on every pointer move as well as on commit, so the color under the
 * cursor is already the color the rectangle will keep.
 */
export function pickColor(rect: Rect, regions: readonly Region[]): number {
    const taken = new Set<number>();
    for (const region of regions) {
        if (rectsAdjacent(rect, region.rect)) taken.add(region.color);
    }
    for (let i = 0; i < PALETTE_SIZE; i++) {
        if (!taken.has(i)) return i;
    }
    // Unreachable for a planar layout, but a defined answer beats an exception.
    return 0;
}
