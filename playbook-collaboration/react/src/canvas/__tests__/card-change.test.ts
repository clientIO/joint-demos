import { describe, expect, it } from 'vitest';
import type { ElementRecord } from '@joint/react-plus';
import { createChangeClock } from '../card-change';
import type { CardData } from '../derive-cells';

/**
 * A card clocks the moment a COLLEAGUE changes it, read off the cell alone:
 * the first sight of the card is not a change, my own changes are skipped
 * but still remembered, and any later difference in position, size or text
 * is clocked.
 */

function card(overrides: Partial<{ x: number; width: number; title: string }> = {}): ElementRecord<CardData> {
    return {
        id: 'n-1',
        type: 'element',
        position: { x: overrides.x ?? 10, y: 20 },
        size: { width: overrides.width ?? 252, height: 96 },
        data: {
            kind: 'step',
            title: overrides.title ?? 'Enrich',
            subtitle: 'detail',
            ownerSeat: 0,
            ownerDept: 'Marketing',
        },
    };
}

describe('createChangeClock', () => {
    it('clocks only changes made by others', () => {
        let mine = false;
        let now = 1000;
        const changedAt = createChangeClock(() => mine, () => now);

        expect(changedAt(card())).toBeUndefined();
        expect(changedAt(card())).toBeUndefined();

        now = 2000;
        expect(changedAt(card({ x: 40 }))).toBe(2000);

        // My own resize is remembered as the new baseline but not clocked.
        mine = true;
        now = 3000;
        expect(changedAt(card({ x: 40, width: 400 }))).toBe(2000);
        mine = false;
        expect(changedAt(card({ x: 40, width: 400 }))).toBe(2000);

        now = 4000;
        expect(changedAt(card({ x: 40, width: 400, title: 'Renamed' }))).toBe(4000);
    });
});
