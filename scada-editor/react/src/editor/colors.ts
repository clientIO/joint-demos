/** The colors of the theme to pick (they adapt to light and dark). */
export const THEME_COLORS: ReadonlyArray<readonly [name: string, color: string]> = [
    ['Blue', 'var(--color-blue)'],
    ['Green', 'var(--color-green)'],
    ['Violet', 'var(--color-violet)'],
    ['Slate', 'var(--color-slate)'],
    ['Amber', 'var(--color-amber)'],
    ['Red', 'var(--color-red)'],
];

/** The canvases to pick: each a light and a dark tone. */
export const CANVAS_COLORS: ReadonlyArray<readonly [name: string, color: string]> = [
    ['White / Black', 'var(--canvas-white)'],
    ['Blue', 'var(--canvas-blue)'],
    ['Green', 'var(--canvas-green)'],
    ['Violet', 'var(--canvas-violet)'],
    ['Gray (ISA-101)', 'var(--canvas-gray)'],
    ['Sand', 'var(--canvas-sand)'],
];
