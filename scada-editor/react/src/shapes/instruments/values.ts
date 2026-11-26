/*
 * What the instruments and the charts read from the plant values and draw their texts with: the colors of the
 * liquid, a value clamped to a scale, the warning thresholds, the vertical anchors of a text (as JointJS sets them).
 */

/** The liquid in range, and its warning colors: too much, too little. */
export const LIQUID_COLOR = 'var(--shape-liquid)';
export const MAX_LIQUID_COLOR = 'var(--shape-liquid-max)';
export const MIN_LIQUID_COLOR = 'var(--shape-liquid-min)';
/** The color of the labels, of a text on the canvas. */
export const LABEL_COLOR = 'var(--shape-label)';
/** The ink on a surface: a unit, a scale. */
export const SURFACE_INK = 'var(--shape-surface-ink)';
/** The dark screen of a meter, a display, a chart, and its edge. */
export const SCREEN_COLOR = '#1e272e';
export const SCREEN_EDGE = '#111';

/** Where a text is from its `y`: below it, around it, above it. */
export type VerticalAnchor = 'top' | 'middle' | 'bottom';

/** The shift of a line of text from its `y` by its vertical anchor (em), as JointJS anchors a text. */
export const VERTICAL_SHIFT: Record<VerticalAnchor, string> = { top: '0.8em', middle: '0.3em', bottom: '-0.2em' };

/** A number of the plant (a text, nothing: 0). */
export function numberOf(value: unknown): number {
    return Number(value) || 0;
}

/** A value of the plant on a scale of 0 - 100. */
export function percentOf(value: unknown): number {
    return Math.max(0, Math.min(100, numberOf(value)));
}

/** The warning levels of a gauge or a chart; one not set - none. */
export interface Thresholds {
    readonly low?: number;
    readonly high?: number;
}

/** A threshold as a number: none when it is not set (`null`, empty - not zero). */
function thresholdValue(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '') {
        return undefined;
    }
    const number = Number(value);
    return Number.isFinite(number) ? number : undefined;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/**
 * The thresholds of the plant values: `[low, high]`, or `{ low, high }` as a diagram of the TypeScript editor saves
 * them; none - the defaults.
 */
export function thresholdsOf(value: unknown, defaults: Thresholds): Thresholds {
    if (Array.isArray(value)) {
        return { low: thresholdValue(value[0]), high: thresholdValue(value[1]) };
    }
    if (isRecord(value)) {
        return { ...defaults, ...('low' in value ? { low: thresholdValue(value.low) } : {}), ...('high' in value ? { high: thresholdValue(value.high) } : {}) };
    }
    return defaults;
}

/** The thresholds on a scale of 0 - 100, the low one never above the high one. */
export function percentThresholds(value: unknown, defaults: Required<Thresholds>): Required<Thresholds> {
    const { low = defaults.low, high = defaults.high } = thresholdsOf(value, defaults);
    const clampedLow = percentOf(low);
    return { low: clampedLow, high: Math.max(clampedLow, percentOf(high)) };
}
