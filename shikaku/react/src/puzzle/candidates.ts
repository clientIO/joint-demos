/**
 * "Every rectangle this clue could legally be given."
 *
 * The one definition of a legal rectangle in the demo. Both the uniqueness
 * solver (`solve.ts`) and the placement check the player's drag runs through
 * (`rules.ts`) are phrased in terms of it, so the rule the generator guarantees
 * and the rule the board enforces cannot drift apart.
 *
 * A rectangle is legal for a clue when it
 *   1. has exactly `clue.value` cells,
 *   2. covers the clue,
 *   3. lies inside the grid, and
 *   4. covers no *other* clue.
 */
import type { Clue, Rect } from './types';

interface Board {
    readonly cols: number;
    readonly rows: number;
    readonly clues: readonly Clue[];
}

/** The `w x h` shapes with exactly `area` cells, narrowest first. */
export function shapesOfArea(area: number): { w: number; h: number }[] {
    const shapes: { w: number; h: number }[] = [];
    for (let w = 1; w <= area; w++) {
        if (area % w === 0) shapes.push({ w, h: area / w });
    }
    return shapes;
}

/**
 * Whether `rect` covers exactly one clue, and that clue is the one at
 * `clueIndex`. Cheap enough to run per candidate: boards carry a few dozen
 * clues at most.
 */
export function coversOnlyClue(rect: Rect, clueIndex: number, clues: readonly Clue[]): boolean {
    for (let i = 0; i < clues.length; i++) {
        if (i === clueIndex) continue;
        const clue = clues[i];
        const inside =
            clue.x >= rect.x &&
            clue.x < rect.x + rect.w &&
            clue.y >= rect.y &&
            clue.y < rect.y + rect.h;
        if (inside) return false;
    }
    return true;
}

/** Every legal rectangle for `clues[clueIndex]`. */
export function candidateRects(clueIndex: number, board: Board): Rect[] {
    const { cols, rows, clues } = board;
    const clue = clues[clueIndex];
    const rects: Rect[] = [];
    for (const { w, h } of shapesOfArea(clue.value)) {
        if (w > cols || h > rows) continue;
        // The rectangle has to cover the clue, so its top-left corner runs from
        // "clue in the bottom-right cell" to "clue in the top-left cell",
        // clamped to the grid.
        const minX = Math.max(0, clue.x - w + 1);
        const maxX = Math.min(clue.x, cols - w);
        const minY = Math.max(0, clue.y - h + 1);
        const maxY = Math.min(clue.y, rows - h);
        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                const rect = { x, y, w, h };
                if (coversOnlyClue(rect, clueIndex, clues)) rects.push(rect);
            }
        }
    }
    return rects;
}
