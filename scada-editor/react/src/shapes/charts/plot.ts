import type { Rect } from '../geometry';
import type { PlantValues } from '../types';

/*
 * What the charts have in common: the plot of a line or a bar chart in its screen (the scale on the left), the
 * scale of the values (`min`, `max` of the plant values), an arc of a dial.
 */

// The margins of the plot in the screen: the scale on the left
const PLOT_MARGIN = { left: 34, right: 14, top: 14, bottom: 14 };

/** The left edge of the plot: the scale is right-aligned to it. */
export const PLOT_LEFT = PLOT_MARGIN.left;

/** The parts of the height of the plot with a line of the grid, and with a value of the scale. */
export const GRID = [0, 0.25, 0.5, 0.75, 1];
export const SCALE = [0, 0.5, 1];

/** How many values a line chart keeps (the newest on the right). */
export const CHART_POINTS = 12;

/** The area of the plot in a line or a bar chart of the size. */
export function plotArea(width: number, height: number): Rect {
    const { left, right, top, bottom } = PLOT_MARGIN;
    return { x: left, y: top, width: width - left - right, height: height - top - bottom };
}

/** The range of the values a chart shows. */
export interface Scale {
    readonly min: number;
    readonly max: number;
}

/** The scale of the chart: a max not above the min (or none) taken as the min and one more. */
export function scaleOf(plant: PlantValues | undefined): Scale {
    const min = Number(plant?.min) || 0;
    // None (`null` in a saved diagram too): NaN
    const max = Number(plant?.max ?? NaN);
    return { min, max: Number.isFinite(max) && max > min ? max : min + 1 };
}

/** How far the value is in the scale (0 - 1, clamped). */
export function scaleFraction({ min, max }: Scale, value: number): number {
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

/** The y of a value on the scale in the plot. */
export function plotY(plot: Rect, value: number, scale: Scale): number {
    return plot.y + plot.height * (1 - scaleFraction(scale, value));
}

/** The horizontal lines of the plot at the parts of its height. */
export function gridPath(plot: Rect, fractions: readonly number[]): string {
    return fractions.map((fraction) => `M ${plot.x} ${plot.y + plot.height * (1 - fraction)} H ${plot.x + plot.width}`).join(' ');
}

/** A number of the scale: without the decimals unless it needs them. */
export function formatScale(value: number): string {
    return String(Number(value.toFixed(Math.abs(value) < 10 ? 1 : 0)));
}

/** The numbers of the plant values (`values`), the others (a text, nothing) as 0. */
export function chartValues(plant: PlantValues | undefined): number[] {
    return Array.isArray(plant?.values) ? plant.values.map((value) => Number(value) || 0) : [];
}

/** An arc of a circle from one angle to another (degrees, clockwise from the right), as an open path. */
export function arcPath(center: { readonly x: number; readonly y: number }, radius: number, from: number, to: number): string {
    const point = (angle: number) => {
        const radians = (angle * Math.PI) / 180;
        return `${Number((center.x + radius * Math.cos(radians)).toFixed(2))} ${Number((center.y + radius * Math.sin(radians)).toFixed(2))}`;
    };
    const isLarge = Math.abs(to - from) > 180 ? 1 : 0;
    return `M ${point(from)} A ${radius} ${radius} 0 ${isLarge} 1 ${point(to)}`;
}
