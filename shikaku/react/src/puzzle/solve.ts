/**
 * Counts a board's solutions, up to a limit.
 *
 * Used by the generator to keep only boards with a single answer — a partition
 * with numbers written on it is always *solvable*, but not necessarily
 * *uniquely* solvable, and a Shikaku with two answers is a bad puzzle.
 *
 * Exact cover by backtracking: every cell must end up in exactly one rectangle,
 * every clue must use exactly one of its candidates. The branching cell is
 * always the uncovered cell with the fewest candidates still available (the
 * usual "most constrained variable" order) — on a dead branch that cell has
 * none, so the search backs out at once instead of filling half the grid first.
 */
import { candidateRects } from './candidates';
import type { Clue, Rect } from './types';

/** Everything the solver needs: the grid and its numbers. */
export interface SolvableBoard {
    readonly cols: number;
    readonly rows: number;
    readonly clues: readonly Clue[];
}

/** Work cap. A pathological board must not hang the generator. */
const DEFAULT_NODE_BUDGET = 200_000;

interface Candidate {
    readonly clueIndex: number;
    readonly rect: Rect;
    /** Cell indices (`y * cols + x`) the rectangle covers. */
    readonly cells: readonly number[];
}

class BudgetExceeded extends Error {}

/**
 * @returns the number of solutions, capped at `limit`, or `null` when the
 * search ran past its node budget without finishing.
 */
export function countSolutions(
    board: SolvableBoard,
    limit = 2,
    nodeBudget = DEFAULT_NODE_BUDGET
): number | null {
    const { cols, rows, clues } = board;
    const cellCount = cols * rows;

    // Candidates per clue, and the reverse index: which candidates cover a cell.
    const byCell: Candidate[][] = Array.from({ length: cellCount }, () => []);
    for (let clueIndex = 0; clueIndex < clues.length; clueIndex++) {
        const rects = candidateRects(clueIndex, board);
        // A clue with nowhere to go means no solution at all.
        if (rects.length === 0) return 0;
        for (const rect of rects) {
            const cells: number[] = [];
            for (let y = rect.y; y < rect.y + rect.h; y++) {
                for (let x = rect.x; x < rect.x + rect.w; x++) cells.push(y * cols + x);
            }
            const candidate: Candidate = { clueIndex, rect, cells };
            for (const cell of cells) byCell[cell].push(candidate);
        }
    }

    const covered = new Uint8Array(cellCount);
    const clueUsed = new Uint8Array(clues.length);
    let remaining = cellCount;
    let solutions = 0;
    let nodes = 0;

    const usable = (candidate: Candidate): boolean => {
        if (clueUsed[candidate.clueIndex]) return false;
        for (const cell of candidate.cells) {
            if (covered[cell]) return false;
        }
        return true;
    };

    const search = (): void => {
        if (remaining === 0) {
            solutions++;
            return;
        }
        if (++nodes > nodeBudget) throw new BudgetExceeded();

        // Most constrained uncovered cell.
        let bestCell = -1;
        let bestOptions: Candidate[] = [];
        for (let cell = 0; cell < cellCount; cell++) {
            if (covered[cell]) continue;
            const options = byCell[cell].filter(usable);
            if (options.length === 0) return; // dead branch
            if (bestCell === -1 || options.length < bestOptions.length) {
                bestCell = cell;
                bestOptions = options;
                if (options.length === 1) break;
            }
        }

        for (const candidate of bestOptions) {
            clueUsed[candidate.clueIndex] = 1;
            for (const cell of candidate.cells) covered[cell] = 1;
            remaining -= candidate.cells.length;

            search();

            remaining += candidate.cells.length;
            for (const cell of candidate.cells) covered[cell] = 0;
            clueUsed[candidate.clueIndex] = 0;

            if (solutions >= limit) return;
        }
    };

    try {
        search();
    } catch (error) {
        if (error instanceof BudgetExceeded) return null;
        throw error;
    }
    return solutions;
}
