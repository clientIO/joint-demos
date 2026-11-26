import { percentOf } from './values';

/*
 * The scale of the pressure gauge, in the coordinates of its dial (drawn for a 60 px gauge, scaled to its size).
 */

/** The size the dial is drawn for. */
export const DIAL_SIZE = 60;
/** How wide the metal ring around the dial is, of the size. */
export const BEZEL = 1 / 12;
/** The default warning zones: none low, red above 75 %. */
export const GAUGE_THRESHOLDS = { low: 0, high: 75 };

// 270° from the bottom left (0 %) to the bottom right (100 %), clockwise
const SCALE_START = 135;
const SCALE_SWEEP = 270;
const ZONE_RADIUS = 22;
const TICK_COUNT = 7;
const TICK_INNER = 17;
const TICK_OUTER = 22;
// The needle is drawn pointing up: at this angle of the scale
const NEEDLE_ANGLE = 270;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/** The angle (degrees) of a value (0 - 100) on the scale. */
const scaleAngle = (value: number): number => SCALE_START + (value / 100) * SCALE_SWEEP;

/** The ticks on the scale. */
export const GAUGE_TICKS = Array.from({ length: TICK_COUNT }, (_, index) => {
    const angle = toRadians(SCALE_START + (index * SCALE_SWEEP) / (TICK_COUNT - 1));
    const point = (radius: number) => `${(radius * Math.cos(angle)).toFixed(2)} ${(radius * Math.sin(angle)).toFixed(2)}`;
    return `M ${point(TICK_INNER)} L ${point(TICK_OUTER)}`;
}).join(' ');

/** An arc of the scale between two values; nothing when they are the same. */
export function gaugeZone(from: number, to: number): string {
    if (to <= from) {
        return 'M 0 0';
    }
    const point = (value: number) => {
        const angle = toRadians(scaleAngle(value));
        return `${(ZONE_RADIUS * Math.cos(angle)).toFixed(2)} ${(ZONE_RADIUS * Math.sin(angle)).toFixed(2)}`;
    };
    const isLarge = scaleAngle(to) - scaleAngle(from) > 180 ? 1 : 0;
    return `M ${point(from)} A ${ZONE_RADIUS} ${ZONE_RADIUS} 0 ${isLarge} 1 ${point(to)}`;
}

/** How far the needle is turned from up (degrees) to point to the value. */
export function needleRotation(value: unknown): number {
    return Number((scaleAngle(percentOf(value)) - NEEDLE_ANGLE).toFixed(1));
}
