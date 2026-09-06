/**
 * What lives on the graph: the board's squares, and a card for each rectangle.
 *
 * Two kinds of element, told apart by `data.kind`:
 *
 * - A **square** is seeded once per board and never touched again. It draws the
 *   empty grid and the number written in it.
 * - A **rectangle** is added when the player places one and removed when they
 *   take it away, and it sits above the squares. It is inset by half a `GAP`,
 *   so two rectangles that meet on a grid line are drawn a gap apart rather
 *   than sharing an edge, and it draws its own number — a placed rectangle is
 *   opaque, so the square underneath is no longer visible.
 *
 * Making a rectangle an element rather than paint on the squares it covers is
 * what buys the rounded corners and the gap: they belong to the shape, and a
 * shape made of squares has neither.
 */
import type { ElementRecord } from '@joint/react-plus';
import type { Puzzle, Rect } from '@/puzzle/types';
import { CELL, cellId, clueOffset, rectToBox } from './grid';

/** Painted below everything, one per square. */
const Z_SQUARE = 1;
/** Placed rectangles, over the squares. */
const Z_REGION = 2;
/** The rectangle being dragged out, over everything. */
const Z_PENDING = 3;

export interface SquareData {
    readonly kind: 'square';
    /** Grid coordinates. The element's position is these times {@link CELL}. */
    readonly gx: number;
    readonly gy: number;
    /** The number written in this square, if any. */
    readonly clue: number | null;
}

export interface RegionData {
    readonly kind: 'region';
    /** Palette index. What it looks like is a theme's business, see `index.css`. */
    readonly color: number;
    /**
     * The rectangle in grid units, and the clue it claims.
     *
     * The element *is* the rectangle — undo and redo put it back exactly as it
     * was — so everything the game needs to know about a placement travels on
     * the cell rather than in a React array alongside it. `clueIndex` is `null`
     * only while a rectangle is being dragged and has not claimed anything.
     */
    readonly rect: Rect;
    readonly clueIndex: number | null;
    /**
     * A rectangle the board came with rather than one the player drew.
     *
     * Only the 1s: a clue of 1 has exactly one rectangle it can ever be, so
     * there is no decision in it. Drawn gray and without its number, and the
     * player cannot take it away.
     */
    readonly given: boolean;
    /** True while the rectangle is still being dragged out. */
    readonly pending: boolean;
    /**
     * True for a drag that cannot be placed. The reject color is a red, and so
     * is one of the eight palette entries, so the outline is dashed as well —
     * color alone would ask the player to tell two reds apart mid-drag.
     */
    readonly rejected: boolean;
    readonly width: number;
    readonly height: number;
    /**
     * The number this rectangle claims, drawn by the rectangle itself. Only a
     * placed rectangle has one: a pending rectangle is translucent, so the
     * numbers of the squares under it show through, and drawing another on top
     * would double them.
     */
    readonly clue: { readonly value: number; readonly x: number; readonly y: number } | null;
}

export type CellData = SquareData | RegionData;

export type BoardElement = ElementRecord<CellData>;

/** The id of the element that previews the drag. Only ever one at a time. */
export const PENDING_ID = 'pending';

/**
 * A rectangle's element id, from where it sits.
 *
 * Placed rectangles never overlap, so no two can share a top-left square: the
 * corner names the rectangle. That beats a counter, because the id has to
 * survive undo and redo, and a counter would hand a rectangle a different id
 * every time it came back.
 */
export function regionId(rect: Rect): string {
    return `r:${rect.x}:${rect.y}`;
}

export function isRegionData(data: CellData | undefined): data is RegionData {
    return data?.kind === 'region';
}

/**
 * Everything the board starts with: a square per cell, and a rectangle for
 * every clue of 1.
 *
 * The givens are seeded rather than placed, which is what keeps them off the
 * undo stack — `<Diagram history>` records what happens after the graph is
 * created, not what it was created with.
 */
export function buildBoard(puzzle: Puzzle, fillOnes: boolean): BoardElement[] {
    const givens = puzzle.clues.flatMap((clue, clueIndex) => {
        if (!fillOnes || clue.value !== 1) return [];
        const rect = { x: clue.x, y: clue.y, w: 1, h: 1 };
        return [
            buildRegionCell({
                id: regionId(rect),
                rect,
                clueIndex,
                given: true,
                // Givens are gray, so the palette index is never read. -1 keeps
                // it out of the neighbor comparison `pickColor` runs.
                color: -1,
                pending: false,
            }),
        ];
    });
    return [...buildSquares(puzzle, fillOnes), ...givens];
}

/** One element per square, in reading order. */
function buildSquares(puzzle: Puzzle, fillOnes: boolean): BoardElement[] {
    const clueAt = new Map<string, number>();
    for (const clue of puzzle.clues) {
        // A filled-in 1 is drawn by its given rectangle, which carries no
        // number; left unfilled it is an ordinary clue like any other.
        if (fillOnes && clue.value === 1) continue;
        clueAt.set(cellId(clue.x, clue.y), clue.value);
    }

    const squares: BoardElement[] = [];
    for (let y = 0; y < puzzle.rows; y++) {
        for (let x = 0; x < puzzle.cols; x++) {
            const id = cellId(x, y);
            squares.push({
                id,
                type: 'element',
                z: Z_SQUARE,
                position: { x: x * CELL, y: y * CELL },
                size: { width: CELL, height: CELL },
                data: { kind: 'square', gx: x, gy: y, clue: clueAt.get(id) ?? null },
            });
        }
    }
    return squares;
}

export interface RegionCellOptions {
    readonly id: string;
    readonly rect: Rect;
    readonly color: number;
    readonly pending: boolean;
    readonly rejected?: boolean;
    /** Index into `Puzzle.clues`, for a placed rectangle. */
    readonly clueIndex?: number;
    /** See {@link RegionData.given}. */
    readonly given?: boolean;
    /** Grid position and value of the number inside, for a placed rectangle. */
    readonly clue?: { readonly value: number; readonly x: number; readonly y: number };
}

export function buildRegionCell({
    id,
    rect,
    color,
    pending,
    rejected = false,
    clueIndex,
    given = false,
    clue,
}: RegionCellOptions): BoardElement {
    const box = rectToBox(rect);
    const offset = clue ? clueOffset(rect, clue.x, clue.y) : null;
    return {
        id,
        type: 'element',
        z: pending ? Z_PENDING : Z_REGION,
        position: { x: box.x, y: box.y },
        size: { width: box.width, height: box.height },
        data: {
            kind: 'region',
            color,
            rect,
            clueIndex: clueIndex ?? null,
            given,
            pending,
            rejected,
            width: box.width,
            height: box.height,
            clue: clue && offset ? { value: clue.value, x: offset.x, y: offset.y } : null,
        },
    };
}
