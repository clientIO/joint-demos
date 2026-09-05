/**
 * Board generation.
 *
 * There is no npm package that generates Shikaku boards, and the job is small:
 * cut the grid into rectangles, then write each rectangle's area into one of its
 * cells. Every board is therefore solvable by construction — the partition it
 * was cut from is an answer.
 *
 * The part that takes work is making that answer the *only* one, which is what
 * the retry loop at the bottom is for.
 */
import { countSolutions } from './solve';
import { mulberry32, type Rng } from './rng';
import type { Clue, Difficulty, Puzzle, Rect } from './types';

/**
 * The largest rectangle the generator will cut, per difficulty.
 *
 * This is the difficulty knob, and it is the honest one: the bigger a
 * rectangle may be, the more places each number could sit, and the more of the
 * board a player has to hold in their head. It scales with the board — a 25x25
 * grid cut into 4-cell pieces is not an easy puzzle, it is a long one — and is
 * clamped so that even the smallest board keeps three distinguishable settings.
 */
const AREA_LIMITS: Record<Difficulty, { divisor: number; min: number; max: number }> = {
    easy: { divisor: 16, min: 5, max: 12 },
    medium: { divisor: 11, min: 8, max: 16 },
    hard: { divisor: 7, min: 12, max: 20 },
};

/**
 * How much longer a rectangle is than it is wide, as a weight.
 *
 * Long rectangles are what make a Shikaku work. A square block of four can
 * usually be re-cut somewhere else on the board without breaking any number,
 * which is exactly what a second solution is; a 1x4 strip pins down a whole row
 * of squares. Boards cut only from blocks are almost never uniquely solvable —
 * measurably so: on a 20x20 grid, a square-biased partition produced a unique
 * board in under 3% of attempts, a strip-biased one in about a third.
 *
 * The exponent keeps the bias mild, so boards still get their share of blocks.
 */
const ASPECT_BIAS = 0.6;

/** Single squares are legal, but a board made of them would be a chore. */
const SINGLE_CELL_WEIGHT = 0.15;

/**
 * How many boards to cut before settling for one that may not be unique.
 *
 * An attempt is a partition plus one run of the solver — well under 2 ms even
 * on the largest board the toolbar offers — and the share of attempts that come
 * out unique ranges from about half on a 10x10 to about one in six on a 25x25.
 * A hundred-odd attempts therefore costs a fraction of a second and makes
 * falling back to an ambiguous board vanishingly unlikely.
 */
const MAX_ATTEMPTS = 120;

function largestArea(cols: number, rows: number, difficulty: Difficulty): number {
    const { divisor, min, max } = AREA_LIMITS[difficulty];
    return Math.min(max, Math.max(min, Math.round((cols * rows) / divisor)));
}

function shapeWeight(w: number, h: number): number {
    const aspect = Math.max(w, h) / Math.min(w, h);
    const single = w * h === 1 ? SINGLE_CELL_WEIGHT : 1;
    return single * Math.pow(aspect, ASPECT_BIAS);
}

/**
 * Cuts the whole grid into rectangles.
 *
 * Walks the cells in random order; the first cell that is still uncovered
 * anchors the next rectangle. Every rectangle that covers the anchor, fits the
 * grid, sits entirely on free cells and is no larger than `maxArea` is a
 * candidate, and one is drawn by weight. A 1x1 always qualifies — the anchor
 * cell itself is free — so the loop can never stall, and it ends with every
 * cell covered exactly once.
 */
function partition(cols: number, rows: number, maxArea: number, rng: Rng): Rect[] {
    const covered = new Uint8Array(cols * rows);
    const anchors = rng.shuffle(Array.from({ length: cols * rows }, (_, index) => index));
    const rects: Rect[] = [];

    const isFree = (rect: Rect): boolean => {
        for (let y = rect.y; y < rect.y + rect.h; y++) {
            for (let x = rect.x; x < rect.x + rect.w; x++) {
                if (covered[y * cols + x]) return false;
            }
        }
        return true;
    };

    for (const anchor of anchors) {
        if (covered[anchor]) continue;
        const ax = anchor % cols;
        const ay = Math.floor(anchor / cols);

        const options: Rect[] = [];
        const weights: number[] = [];
        for (let w = 1; w <= Math.min(maxArea, cols); w++) {
            for (let h = 1; h <= Math.min(maxArea, rows); h++) {
                if (w * h > maxArea) continue;
                for (let x = Math.max(0, ax - w + 1); x <= Math.min(ax, cols - w); x++) {
                    for (let y = Math.max(0, ay - h + 1); y <= Math.min(ay, rows - h); y++) {
                        const rect = { x, y, w, h };
                        if (!isFree(rect)) continue;
                        options.push(rect);
                        weights.push(shapeWeight(w, h));
                    }
                }
            }
        }

        // Nothing fits into the hole that is left — take the cell on its own.
        // (The anchor is free, so a 1x1 is always among the options; this
        // branch only ever runs when `maxArea` is somehow below 1.)
        const rect = options.length > 0 ? options[rng.weighted(weights)] : { x: ax, y: ay, w: 1, h: 1 };
        for (let y = rect.y; y < rect.y + rect.h; y++) {
            for (let x = rect.x; x < rect.x + rect.w; x++) covered[y * cols + x] = 1;
        }
        rects.push(rect);
    }
    return rects;
}

/** Puts each rectangle's number on a random cell inside it. */
function placeClues(rects: readonly Rect[], rng: Rng): Clue[] {
    return rects.map((rect) => ({
        x: rect.x + rng.int(rect.w),
        y: rect.y + rng.int(rect.h),
        value: rect.w * rect.h,
    }));
}

export interface GenerateOptions {
    readonly cols: number;
    readonly rows: number;
    readonly seed: number;
    readonly difficulty: Difficulty;
}

/**
 * Generates a board, preferring one with a single solution.
 *
 * A partition alone is not enough: the same numbers often admit a second
 * arrangement. So each attempt is checked with `countSolutions`, and a board
 * that is ambiguous — or that the solver could not settle inside its node
 * budget — is thrown away and the next seed tried. After `MAX_ATTEMPTS` the
 * last board is returned anyway, flagged `unique: false`; it is still solvable,
 * so the demo stays playable rather than spinning.
 *
 * The seed that actually produced the board is returned on the puzzle, so the
 * value the toolbar shows always reproduces what is on screen.
 */
export function generatePuzzle({ cols, rows, seed, difficulty }: GenerateOptions): Puzzle {
    const maxArea = largestArea(cols, rows, difficulty);
    let attempt: Puzzle | null = null;

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
        const attemptSeed = (seed + i) >>> 0;
        const rng = mulberry32(attemptSeed);
        const solution = partition(cols, rows, maxArea, rng);
        const clues = placeClues(solution, rng);
        const solutions = countSolutions({ cols, rows, clues }, 2);
        const unique = solutions === 1;
        attempt = { cols, rows, seed: attemptSeed, difficulty, clues, solution, unique };
        if (unique) return attempt;
    }

    // Non-null: MAX_ATTEMPTS is at least 1, so the loop always ran.
    return attempt as Puzzle;
}
