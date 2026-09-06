import { describe, expect, it } from 'vitest';
import { PALETTE_SIZE, pickColor } from './colors';
import type { Region } from './types';

function region(id: string, x: number, y: number, w: number, h: number, color: number): Region {
    return { id, rect: { x, y, w, h }, clueIndex: 0, color, given: false };
}

describe('pickColor', () => {
    it('avoids the colors of the rectangles it touches', () => {
        const placed = [region('a', 0, 0, 2, 2, 0), region('b', 0, 2, 2, 2, 1)];
        // Shares an edge with both.
        expect(pickColor({ x: 2, y: 0, w: 1, h: 4 }, placed)).toBe(2);
    });

    it('reuses a color from a rectangle it only meets at a corner', () => {
        const placed = [region('a', 0, 0, 1, 1, 0)];
        expect(pickColor({ x: 1, y: 1, w: 1, h: 1 }, placed)).toBe(0);
    });

    it('reuses a color from a rectangle that is nowhere near', () => {
        const placed = [region('a', 0, 0, 1, 1, 0)];
        expect(pickColor({ x: 5, y: 5, w: 1, h: 1 }, placed)).toBe(0);
    });

    it('always returns a palette entry', () => {
        const ring = Array.from({ length: PALETTE_SIZE }, (_, index) =>
            region(`r${index}`, index, 0, 1, 1, index)
        );
        expect(pickColor({ x: 0, y: 1, w: PALETTE_SIZE, h: 1 }, ring)).toBeLessThan(PALETTE_SIZE);
    });
});
