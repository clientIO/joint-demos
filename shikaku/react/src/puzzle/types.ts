/**
 * The puzzle model, in grid units.
 *
 * Nothing in `src/puzzle` knows about pixels, React or JointJS: a cell is an
 * `(x, y)` pair with `0 <= x < cols`, and a rectangle is a top-left corner plus
 * a width and a height. The canvas converts to pixels on its way in and out.
 */

/** An axis-aligned rectangle of grid cells. */
export interface Rect {
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
}

/** A numbered cell. Its rectangle has to cover it and have exactly `value` cells. */
export interface Clue {
    readonly x: number;
    readonly y: number;
    readonly value: number;
}

/** How adventurous the generator's rectangles are. See `AREA_BANDS` in `generate.ts`. */
export type Difficulty = 'easy' | 'medium' | 'hard';

/** A generated board. `solution[i]` is the rectangle belonging to `clues[i]`. */
export interface Puzzle {
    readonly cols: number;
    readonly rows: number;
    /** The seed the board was actually generated from — see `generatePuzzle`. */
    readonly seed: number;
    readonly difficulty: Difficulty;
    readonly clues: readonly Clue[];
    readonly solution: readonly Rect[];
    /**
     * Whether the uniqueness check confirmed a single solution. `false` only
     * when the generator ran out of attempts or the solver ran out of budget;
     * the board is still solvable (it was built from a partition), it just may
     * admit more than one answer.
     */
    readonly unique: boolean;
}

/** One rectangle the player has placed. */
export interface Region {
    readonly id: string;
    readonly rect: Rect;
    /** Index into `Puzzle.clues` of the clue this rectangle claims. */
    readonly clueIndex: number;
    /** Index into the palette in `colors.ts`. `-1` for a given, which is gray. */
    readonly color: number;
    /** True for a rectangle the board came with — its 1s. */
    readonly given: boolean;
}

/** Every cell of `rect`, row by row. */
export function* rectCells(rect: Rect): Generator<{ x: number; y: number }> {
    for (let y = rect.y; y < rect.y + rect.h; y++) {
        for (let x = rect.x; x < rect.x + rect.w; x++) yield { x, y };
    }
}

/** Whether `rect` covers the cell at `(x, y)`. */
export function rectContains(rect: Rect, x: number, y: number): boolean {
    return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
}

/** Whether the two rectangles share at least one cell. */
export function rectsOverlap(a: Rect, b: Rect): boolean {
    return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/**
 * Whether the two rectangles share a border — they do not overlap, but a full
 * edge of one runs along an edge of the other. This is the adjacency the color
 * picker works with: two regions that only meet at a corner may share a color.
 */
export function rectsAdjacent(a: Rect, b: Rect): boolean {
    const horizontallyTouching =
        (a.x + a.w === b.x || b.x + b.w === a.x) && a.y < b.y + b.h && b.y < a.y + a.h;
    const verticallyTouching =
        (a.y + a.h === b.y || b.y + b.h === a.y) && a.x < b.x + b.w && b.x < a.x + a.w;
    return horizontallyTouching || verticallyTouching;
}
