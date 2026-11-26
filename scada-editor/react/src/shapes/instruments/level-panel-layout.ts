import { LIQUID_COLOR, MAX_LIQUID_COLOR, MIN_LIQUID_COLOR, type Thresholds } from './values';

/*
 * The layout of the level panel: a screen in a bezel, the level as a number above a rounded track, the scale on its
 * right, the threshold arrows on its left. The track takes the height between fixed margins.
 */

/** The margins of the track: below the number, above the bottom of the screen. */
export const WINDOW_TOP = 50;
const WINDOW_BOTTOM = 18;
/** The screen inside the bezel, as the charts. */
export const SCREEN_INSET = 6;
/** The same gap from the edge of the screen to the arrows, and to the values. */
export const SIDE_GAP = 8;
// The threshold arrows: this wide, this far from the track
const ARROW_WIDTH = 6;
const ARROW_GAP = 3;
/** The left of the track, right of the arrows; its width, a part of the width of the panel. */
export const TRACK_LEFT = SCREEN_INSET + SIDE_GAP + ARROW_WIDTH + ARROW_GAP;
export const TRACK_WIDTH = 0.3;
/** The default thresholds: almost empty, almost full. */
export const PANEL_THRESHOLDS = { low: 20, high: 80 };

// The scale: a tick every 10 %, a value every 50 %
const STEPS = 10;
const LABELED = [0, 5, 10];

/** The y at a part of the height of the track (0 - the top, 1 - the bottom). */
export function windowY(height: number, ratio: number): number {
    return WINDOW_TOP + ratio * (height - WINDOW_TOP - WINDOW_BOTTOM);
}

/** A part (0 - 1) of the height of the track. */
export function windowHeight(height: number, ratio: number): number {
    return ratio * (height - WINDOW_TOP - WINDOW_BOTTOM);
}

/** The ticks on the right of the track: longer at the values. */
export function panelTicks(width: number, height: number): string {
    return Array.from({ length: STEPS + 1 }, (_, index) => `M ${TRACK_WIDTH * width + TRACK_LEFT + 5} ${windowY(height, index / STEPS)} h ${LABELED.includes(index) ? 7 : 4}`).join(' ');
}

/** The values of the scale: their text and the part of the height of the track they are at. */
export const PANEL_VALUES = LABELED.map((index) => ({ text: String(100 - (index * 100) / STEPS), ratio: index / STEPS }));

/** The marker of a threshold at the level (0 - 100): an arrow left of the track, pointing at it. */
export function thresholdMarker(height: number, level: number): string {
    return `M ${TRACK_LEFT - ARROW_GAP} ${windowY(height, 1 - level / 100)} l -${ARROW_WIDTH} -4.5 v 9 z`;
}

/** The color of the liquid at the level: the warnings almost empty or full, the accent in range. */
export function liquidColor(level: number, { low = PANEL_THRESHOLDS.low, high = PANEL_THRESHOLDS.high }: Thresholds, accent: string | undefined): string {
    if (level > high) {
        return MAX_LIQUID_COLOR;
    }
    return level < low ? MIN_LIQUID_COLOR : accent || LIQUID_COLOR;
}
