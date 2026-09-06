import { describe, expect, it } from 'vitest';
import { validatePlacement, coveredCells } from './rules';
import type { Clue, Region } from './types';

const CLUES: Clue[] = [
    { x: 0, y: 0, value: 4 },
    { x: 3, y: 0, value: 2 },
];

const PLACED: Region[] = [
    { id: 'r0', rect: { x: 0, y: 0, w: 2, h: 2 }, clueIndex: 0, color: 0, given: false },
];

describe('validatePlacement', () => {
    it('accepts a rectangle whose area matches its one number', () => {
        expect(validatePlacement({ x: 0, y: 0, w: 2, h: 2 }, CLUES, [])).toEqual({
            ok: true,
            clueIndex: 0,
        });
    });

    it('rejects a rectangle with no number in it', () => {
        expect(validatePlacement({ x: 1, y: 2, w: 1, h: 1 }, CLUES, [])).toEqual({
            ok: false,
            reason: 'no-clue',
        });
    });

    it('rejects a rectangle holding two numbers', () => {
        expect(validatePlacement({ x: 0, y: 0, w: 4, h: 1 }, CLUES, [])).toEqual({
            ok: false,
            reason: 'many-clues',
        });
    });

    it('rejects a rectangle whose area is not its number', () => {
        expect(validatePlacement({ x: 0, y: 0, w: 1, h: 2 }, CLUES, [])).toEqual({
            ok: false,
            reason: 'wrong-area',
        });
    });

    it('rejects a rectangle that runs into one already on the board', () => {
        expect(validatePlacement({ x: 1, y: 1, w: 2, h: 1 }, CLUES, PLACED)).toEqual({
            ok: false,
            reason: 'overlap',
        });
    });

    it('reports overlap before anything else', () => {
        // The rectangle is wrong twice over — no number *and* on top of one that
        // is already there. Overlap is the more useful thing to say.
        expect(validatePlacement({ x: 1, y: 1, w: 1, h: 1 }, CLUES, PLACED)).toEqual({
            ok: false,
            reason: 'overlap',
        });
    });
});

describe('coveredCells', () => {
    it('adds up the areas of the placed rectangles', () => {
        expect(coveredCells(PLACED)).toBe(4);
        expect(coveredCells([])).toBe(0);
    });
});
