import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EDGE_MARGIN, placeToolbar } from './toolbar-placement.ts';

// The visible canvas in the reported bug: source pane on the left, canvas
// from x=380 to the window edge, header above.
const VISIBLE = { top: 52, bottom: 813, left: 380, right: 1400 };
const WIDTH = 403;

describe('placeToolbar', () => {
    it('slides right so a toolbar near the left canvas edge is not hidden under the source pane', () => {
        // Node centred at 561: the toolbar would start at 359.5, under the pane.
        const { dx } = placeToolbar({ top: 400, bottom: 440, centerX: 561 }, WIDTH, VISIBLE);
        assert.equal(561 - WIDTH / 2 + dx, VISIBLE.left + EDGE_MARGIN);
    });

    it('slides left at the right canvas edge', () => {
        const { dx } = placeToolbar({ top: 400, bottom: 440, centerX: 1350 }, WIDTH, VISIBLE);
        assert.equal(1350 + WIDTH / 2 + dx, VISIBLE.right - EDGE_MARGIN);
    });

    it('does not move a toolbar that already fits', () => {
        assert.deepEqual(placeToolbar({ top: 400, bottom: 440, centerX: 900 }, WIDTH, VISIBLE), { side: 'top', dx: 0 });
    });

    it('flips below a node that sits just under the header', () => {
        assert.equal(placeToolbar({ top: 80, bottom: 120, centerX: 900 }, WIDTH, VISIBLE).side, 'bottom');
    });

    it('stays above when there is no more room below than above', () => {
        const cramped = { ...VISIBLE, bottom: 400 };
        assert.equal(placeToolbar({ top: 220, bottom: 260, centerX: 900 }, WIDTH, cramped).side, 'top');
    });
});
