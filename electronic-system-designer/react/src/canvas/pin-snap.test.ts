import { describe, expect, it } from 'vitest';
import { snapRouteToPins } from './pin-snap';

// Regression: libavoid nudges shape-attached segments apart, so three wires
// on U2-VOUT ended 0, 8 and 16 px along the body edge instead of on the pin.
describe('snapRouteToPins', () => {
    const anchor = (dx: number, dy: number) => ({ name: 'modelCenter', args: { dx, dy }});

    it('drops the sideways nudge on a right-side pin and aligns the first bend', () => {
        const route = { sourceAnchor: anchor(0, 16), vertices: [{ x: 500, y: 216 }, { x: 500, y: 400 }] };
        const snapped = snapRouteToPins(route, { point: { x: 470, y: 200 }, side: 'right' });
        expect(snapped.sourceAnchor).toEqual(anchor(0, 0));
        expect(snapped.vertices).toEqual([{ x: 500, y: 200 }, { x: 500, y: 400 }]);
    });

    it('aligns a bottom-pin target on x and keeps the route orthogonal', () => {
        const route = { targetAnchor: anchor(-4, 0), vertices: [{ x: 100, y: 300 }, { x: 482, y: 300 }] };
        const snapped = snapRouteToPins(route, undefined, { point: { x: 486, y: 260 }, side: 'bottom' });
        expect(snapped.targetAnchor).toEqual(anchor(0, 0));
        expect(snapped.vertices).toEqual([{ x: 100, y: 300 }, { x: 486, y: 300 }]);
    });

    it('leaves a straight run (no bends) untouched', () => {
        const route = { sourceAnchor: anchor(0, 8), targetAnchor: anchor(0, 8), vertices: [] };
        expect(snapRouteToPins(route, { point: { x: 0, y: 0 }, side: 'right' }, { point: { x: 90, y: 0 }, side: 'left' })).toBe(route);
    });
});
