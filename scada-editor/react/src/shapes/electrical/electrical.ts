import type { ShapeData } from '../types';

/*
 * What the electrical shapes share with their specs: the taps of a busbar, the energized look of a load.
 */

/** The reading and the charge bar: the color of the liquid (the vanilla `LIQUID_COLOR`). */
export const LIQUID_COLOR = 'var(--shape-liquid)';

// A tap (a terminal on the top and one on the bottom) every this much of a busbar, from its left end (the first
// half of it from the end): the gap between the taps is the same whatever the length.
const TAP_SPACING = 80;

/** The posts on the lid of a battery (and its terminals): from the left, a part of the width. */
export const BATTERY_MINUS_X = 0.25;
export const BATTERY_PLUS_X = 0.75;

/** How high the blade of a disconnector is (and its terminals): on the grid, the shape is not resized. */
export const DISCONNECTOR_BLADE_Y = 20;

/** The shortest busbar. */
export const BUSBAR_MIN_WIDTH = 120;

/** The shortest a busbar with links connected to the ports can be: long enough for the last connected tap. */
export function busbarMinWidth(connectedPorts: readonly string[]): number {
    const taps = connectedPorts.map((port) => Number(port.replace(/^(top|bottom)/, ''))).filter(Number.isFinite);
    return Math.max(BUSBAR_MIN_WIDTH, ...taps.map((tap) => tap * TAP_SPACING));
}

/** Where a tap of a busbar is along it, from its left end. */
export function busbarTapX(index: number): number {
    return TAP_SPACING / 2 + index * TAP_SPACING;
}

/** How many taps a busbar of the width has on each side: as many as its length takes, one at least. */
export function busbarTapCount(width: number): number {
    return Math.max(1, Math.floor(width / TAP_SPACING));
}

/**
 * Whether the circuit of the shape is live (`data.energized`, set by the plant in run mode): a lamp is lit, a
 * heater glows, the lamps of a cabinet are on. The attribute the stylesheet reads, none when not.
 */
export function energizedOf(data: ShapeData): true | undefined {
    return data.energized === true ? true : undefined;
}
