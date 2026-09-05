import { describe, expect, it } from 'vitest';
import { countSolutions } from './solve';

describe('countSolutions', () => {
    it('counts the one solution of an unambiguous board', () => {
        // 2x2, one number: the rectangle can only be the whole grid.
        expect(countSolutions({ cols: 2, rows: 2, clues: [{ x: 0, y: 0, value: 4 }] })).toBe(1);
    });

    it('counts a second solution when the board is ambiguous', () => {
        // 2x2 with a 2 in opposite corners: two rows, or two columns.
        const clues = [
            { x: 0, y: 0, value: 2 },
            { x: 1, y: 1, value: 2 },
        ];
        expect(countSolutions({ cols: 2, rows: 2, clues })).toBe(2);
    });

    it('returns zero when the numbers cannot tile the grid', () => {
        // 3 of the 4 squares are spoken for and nothing can claim the fourth.
        expect(countSolutions({ cols: 2, rows: 2, clues: [{ x: 0, y: 0, value: 3 }] })).toBe(0);
    });

    it('gives up rather than hanging when the search runs past its budget', () => {
        // A budget of one node cannot finish anything non-trivial.
        expect(countSolutions({ cols: 4, rows: 4, clues: [{ x: 0, y: 0, value: 16 }] }, 2, 0)).toBe(
            null
        );
    });
});
