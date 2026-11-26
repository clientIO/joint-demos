/** The sight glass of the fuel tank on its front: its top and its height (parts of the height). */
export const GLASS_Y = 0.2;
export const GLASS_HEIGHT = 0.6;

/** The level (%) as a part of the full glass, 0 - 1: none, or not a number - empty. */
export function levelRatioOf(level: unknown): number {
    return Math.max(0, Math.min(100, Number(level) || 0)) / 100;
}
