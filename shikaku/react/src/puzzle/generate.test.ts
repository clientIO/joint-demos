import { describe, expect, it } from 'vitest';
import { generatePuzzle } from './generate';
import { countSolutions } from './solve';
import { rectCells, type Difficulty, type Puzzle } from './types';

const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard'];
const SIZES = [
    { cols: 5, rows: 5 },
    { cols: 8, rows: 6 },
    { cols: 10, rows: 10 },
];
const SEEDS = [1, 7, 42, 1234, 90210];

function boards(): Puzzle[] {
    const generated: Puzzle[] = [];
    for (const size of SIZES) {
        for (const difficulty of DIFFICULTIES) {
            for (const seed of SEEDS) generated.push(generatePuzzle({ ...size, seed, difficulty }));
        }
    }
    return generated;
}

describe('generatePuzzle', () => {
    it('cuts the grid into rectangles that cover every square exactly once', () => {
        for (const puzzle of boards()) {
            const counts = new Map<string, number>();
            for (const rect of puzzle.solution) {
                for (const { x, y } of rectCells(rect)) {
                    const key = `${x}:${y}`;
                    counts.set(key, (counts.get(key) ?? 0) + 1);
                }
            }
            expect(counts.size).toBe(puzzle.cols * puzzle.rows);
            for (const count of counts.values()) expect(count).toBe(1);
        }
    });

    it('writes each rectangle\'s area into exactly one square inside it', () => {
        for (const puzzle of boards()) {
            expect(puzzle.clues).toHaveLength(puzzle.solution.length);
            puzzle.solution.forEach((rect, index) => {
                const clue = puzzle.clues[index];
                expect(clue.value).toBe(rect.w * rect.h);
                expect(clue.x).toBeGreaterThanOrEqual(rect.x);
                expect(clue.x).toBeLessThan(rect.x + rect.w);
                expect(clue.y).toBeGreaterThanOrEqual(rect.y);
                expect(clue.y).toBeLessThan(rect.y + rect.h);
            });

            // No rectangle may hold a second number.
            for (const rect of puzzle.solution) {
                const inside = puzzle.clues.filter(
                    (clue) =>
                        clue.x >= rect.x &&
                        clue.x < rect.x + rect.w &&
                        clue.y >= rect.y &&
                        clue.y < rect.y + rect.h
                );
                expect(inside).toHaveLength(1);
            }
        }
    });

    it('reports a single solution for the boards it flags as unique', () => {
        for (const puzzle of boards()) {
            if (!puzzle.unique) continue;
            expect(countSolutions(puzzle, 2)).toBe(1);
        }
    });

    it('finds a unique board for every size and difficulty it is asked for', () => {
        // Not a guarantee of the API — `unique: false` is a legal answer — but a
        // generator that could not manage it on ordinary boards would be broken.
        for (const puzzle of boards()) expect(puzzle.unique).toBe(true);
    });

    it('is a pure function of its seed', () => {
        const options = { cols: 9, rows: 7, seed: 314159, difficulty: 'hard' as const };
        expect(generatePuzzle(options)).toEqual(generatePuzzle(options));
    });

    it('reports the seed the board actually came from', () => {
        for (const puzzle of boards()) {
            expect(generatePuzzle({ ...puzzle, seed: puzzle.seed })).toEqual(puzzle);
        }
    });
});
