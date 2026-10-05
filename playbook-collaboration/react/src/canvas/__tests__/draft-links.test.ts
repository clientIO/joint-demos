import { describe, expect, it } from 'vitest';
import type { CardNode } from '@/model/types';
import { deriveDraftLinks } from '../draft-links';

/**
 * A flow being dragged out of a port by a colleague is shown to everyone
 * while it is still in the air, not only once it lands: a dashed link in the
 * dragger's colour from the port to their pointer.
 */

const card: CardNode = {
    id: 'n-a',
    kind: 'step',
    title: 'A',
    subtitle: '',
    x: 40,
    y: 170,
    owner: 'm-1',
};

describe('deriveDraftLinks', () => {
    it('draws a dashed link from the port to the pointer, in the seat colour', () => {
        const [link] = deriveDraftLinks(
            [{ id: '7', seat: 2, from: 'n-a', fromPort: 'right', x: 400, y: 120 }],
            { 'n-a': card }
        );
        expect(link.type).toBe('link');
        expect(link.source).toEqual({ id: 'n-a', port: 'right' });
        expect(link.target).toEqual({ x: 400, y: 120 });
        expect(link.style?.dasharray).toBeDefined();
        expect(link.style?.color).not.toBe('var(--flow-stroke)');
    });

    it('lands on the port the dragger has snapped to, like their own draft does', () => {
        const [link] = deriveDraftLinks(
            [{ id: '7', seat: 2, from: 'n-a', fromPort: 'right', x: 400, y: 120, to: 'n-b', toPort: 'left' }],
            { 'n-a': card, 'n-b': { ...card, id: 'n-b', x: 400, y: 100 }}
        );
        expect(link.target).toEqual({ id: 'n-b', port: 'left' });
    });

    it('falls back to the pointer when the snapped card is gone', () => {
        const [link] = deriveDraftLinks(
            [{ id: '7', seat: 2, from: 'n-a', fromPort: 'right', x: 400, y: 120, to: 'n-gone', toPort: 'left' }],
            { 'n-a': card }
        );
        expect(link.target).toEqual({ x: 400, y: 120 });
    });

    it('skips a draft whose source card is gone', () => {
        expect(deriveDraftLinks([{ id: '7', seat: 2, from: 'n-gone', fromPort: 'left', x: 0, y: 0 }], { 'n-a': card })).toEqual([]);
    });
});
