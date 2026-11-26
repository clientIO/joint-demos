import type { CSSProperties } from 'react';

/** Where the boxes are drawn on the belt (parts of its width): they ride from its start to its end. */
export const BOX_POSITIONS = [0.2, 0.6];
/** How wide a box is. */
export const BOX_WIDTH = 28;
// How fast the boxes ride (px/s).
const BELT_SPEED = 60;

/** The style of a box riding: the custom properties of its ride (see `bulk.css`), with an inline style's own. */
export type RideStyle = CSSProperties & Record<`--${string}`, string>;

/**
 * The ride of each box on a belt of the size: from over the first roller to the last, relative to where the box is
 * drawn, each half of the ride behind the other (the belt never empty); none on a belt too short to ride.
 */
export function ridesOf(width: number, height: number): readonly (RideStyle | undefined)[] {
    const start = height / 2;
    const end = width - height / 2 - BOX_WIDTH;
    if (end <= start) {
        return BOX_POSITIONS.map(() => undefined);
    }
    const duration = ((end - start) / BELT_SPEED) * 1000;
    return BOX_POSITIONS.map((position, index) => {
        const x = position * width;
        return {
            '--scada-ride-from': `${start - x}px`,
            '--scada-ride-to': `${end - x}px`,
            '--scada-ride-duration': `${duration}ms`,
            '--scada-ride-delay': `${(-duration * index) / BOX_POSITIONS.length}ms`,
        };
    });
}
