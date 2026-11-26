import type { PlantValues } from '../types';

/*
 * The slices of a donut chart and their geometry: the ring on the left of the screen, the legend on its right.
 */

/** A slice of a donut chart: what it is, how much of it, its color. */
export interface Slice {
    readonly label: string;
    readonly value: number;
    readonly color: string;
}

/** The most slices a donut shows. */
export const MAX_SLICES = 6;
// The lines of the legend this far apart
const LEGEND_LINE = 20;
// The hole of the donut, a part of its radius; the space around it
const HOLE = 0.55;
const PADDING = 14;
// A whole ring is drawn a hair short of the full circle: an arc can't end where it starts
const WHOLE = 0.9999;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/** The slices of the plant values (at most `MAX_SLICES`): a value not a positive number counts as none. */
export function slicesOf(plant: PlantValues | undefined): readonly Slice[] {
    const slices = Array.isArray(plant?.slices) ? plant.slices.slice(0, MAX_SLICES) : [];
    return slices.map((slice) => {
        const value = isRecord(slice) ? Number(slice.value) : NaN;
        return {
            label: isRecord(slice) && typeof slice.label === 'string' ? slice.label : '',
            value: Number.isFinite(value) ? Math.max(0, value) : 0,
            color: isRecord(slice) && typeof slice.color === 'string' ? slice.color : '',
        };
    });
}

/** The shares of the slices (0 - 1), in their order. */
export function sharesOf(slices: readonly Slice[]): number[] {
    const total = slices.reduce((sum, slice) => sum + slice.value, 0) || 1;
    return slices.map((slice) => slice.value / total);
}

/** The center and the radius of the donut in a chart of the height. */
function donutOf(height: number): { readonly cx: number; readonly cy: number; readonly radius: number } {
    const radius = height / 2 - PADDING;
    return { cx: PADDING + radius, cy: height / 2, radius };
}

/** The ring segment of the slice: from the top, clockwise, after the slices before it. */
export function slicePath(shares: readonly number[], index: number, height: number): string {
    if (!shares[index]) {
        return 'M 0 0';
    }
    const { cx, cy, radius } = donutOf(height);
    const inner = radius * HOLE;
    const start = shares.slice(0, index).reduce((sum, share) => sum + share, 0);
    const end = Math.min(start + shares[index], start + WHOLE);
    const point = (r: number, ratio: number) => {
        const angle = ratio * 2 * Math.PI - Math.PI / 2;
        return `${Number((cx + r * Math.cos(angle)).toFixed(2))} ${Number((cy + r * Math.sin(angle)).toFixed(2))}`;
    };
    const isLarge = end - start > 0.5 ? 1 : 0;
    return [`M ${point(radius, start)}`, `A ${radius} ${radius} 0 ${isLarge} 1 ${point(radius, end)}`, `L ${point(inner, end)}`, `A ${inner} ${inner} 0 ${isLarge} 0 ${point(inner, start)}`, 'Z'].join(' ');
}

/** The y of the line of the legend of a slice: the lines centered on the height. */
export function legendY(count: number, index: number, height: number): number {
    return height / 2 + (index - (count - 1) / 2) * LEGEND_LINE;
}
