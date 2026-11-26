import { createContext, useContext } from 'react';

/*
 * How the shapes look: the style of a shape (its own color, outline, accent, finish) over the style of the
 * diagram (the defaults of every shape that has none of its own: Auto). The colors of the diagram style are
 * CSS variables (`--style-*` in `shapes.css`); the finish, the outline width and the labels are read by the shapes.
 */

/** Shaded metal, or flat: the color as it is, every surface outlined (the ISA-101 high-performance HMI look). */
export type Finish = 'shaded' | 'flat';

/** The width of the outlines of an outlined shape, and of the borders of the pipes. */
export type OutlineWidth = 'thin' | 'normal' | 'thick';

/** The outline widths to pick: their names and widths (px). */
export const OUTLINE_WIDTHS: Record<OutlineWidth, { readonly name: string; readonly px: number }> = {
    thin: { name: 'Thin', px: 1 },
    normal: { name: 'Normal', px: 2 },
    thick: { name: 'Thick', px: 3 },
};

/** The size of the labels of the shapes. */
export type LabelSize = 'small' | 'medium' | 'large' | 'x-large';

/** The label sizes to pick: their names and font sizes (px). */
export const LABEL_SIZES: Record<LabelSize, { readonly name: string; readonly px: number }> = {
    small: { name: 'Small', px: 12 },
    medium: { name: 'Medium', px: 14 },
    large: { name: 'Large', px: 16 },
    'x-large': { name: 'X-Large', px: 18 },
};

/** What the labels of the shapes show: the names, the IDs (as a P&ID), or both (as an operator display). */
export type LabelContent = 'name' | 'tag' | 'both';

/** The width of a link: its size (a pipe, an arrow), its thickness (a wire). */
export type LineWidth = 'thin' | 'normal' | 'thick';

const FINISHES: readonly Finish[] = ['shaded', 'flat'];
const LABEL_CONTENTS: readonly LabelContent[] = ['name', 'tag', 'both'];
const LINE_WIDTHS: readonly LineWidth[] = ['thin', 'normal', 'thick'];

/** Whether a value is a finish. */
export const isFinish = (value: unknown): value is Finish => FINISHES.some((finish) => finish === value);
/** Whether a value is an outline width. */
export const isOutlineWidth = (value: unknown): value is OutlineWidth => typeof value === 'string' && Object.hasOwn(OUTLINE_WIDTHS, value);
/** Whether a value is a label size. */
export const isLabelSize = (value: unknown): value is LabelSize => typeof value === 'string' && Object.hasOwn(LABEL_SIZES, value);
/** Whether a value says what the labels show. */
export const isLabelContent = (value: unknown): value is LabelContent => LABEL_CONTENTS.some((content) => content === value);
/** Whether a value is a line width. */
export const isLineWidth = (value: unknown): value is LineWidth => LINE_WIDTHS.some((width) => width === value);

/** The font size (px) of a label size: the medium one for an unknown value. */
export const labelSizePx = (size: unknown): number => LABEL_SIZES[isLabelSize(size) ? size : 'medium'].px;

/** The width (px) of an outline width: the normal one for an unknown value. */
export const outlineWidthPx = (width: unknown): number => OUTLINE_WIDTHS[isOutlineWidth(width) ? width : 'normal'].px;

/** The number when it is positive and finite (a font size, a weight of a file); the fallback otherwise. */
export const positiveOr = (value: unknown, fallback: number): number => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback);

/** The text of a value (of a label of a file): empty unless it is a string. */
export const textOf = (value: unknown): string => (typeof value === 'string' ? value : '');

/** The style of one cell; a key it has not: Auto (the diagram's, or the shape's own default). */
export interface CellStyle {
    readonly color?: string;
    readonly outline?: string;
    readonly outlineWidth?: OutlineWidth;
    readonly accent?: string;
    readonly finish?: Finish;
    /** The size of a pipe or an arrow, the thickness of a wire. */
    readonly lineWidth?: LineWidth;
    /** The opacity of an image, of a shape of the background (0 - 1). */
    readonly opacity?: number;
}

/** The style of the diagram: saved with it, the default of every cell without a style of its own. */
export interface DiagramStyle {
    readonly finish?: Finish;
    readonly color?: string;
    readonly outline?: string;
    readonly outlineWidth?: OutlineWidth;
    readonly accent?: string;
    readonly labelSize?: LabelSize;
    readonly labelColor?: string;
    readonly labels?: LabelContent;
    /** The background of the canvas (a color of the shapes too: the line drawings). */
    readonly canvas?: string;
    /** The canvas in a subtle gradient of its color, lighter at the top. */
    readonly canvasGradient?: boolean;
}

/** The style of the diagram, for the shapes that read it. */
export const DiagramStyleContext = createContext<DiagramStyle>({});

/** The style of the diagram the shapes are drawn in. */
export function useDiagramStyle(): DiagramStyle {
    return useContext(DiagramStyleContext);
}

// The CSS variables of the colors of the diagram style (see `shapes.css`).
const STYLE_VARIABLES = {
    color: '--style-color',
    outline: '--style-outline',
    accent: '--style-accent',
    labelColor: '--style-label-color',
    canvas: '--style-canvas',
} as const satisfies Partial<Record<keyof DiagramStyle, string>>;

const STYLE_VARIABLE_KEYS = ['color', 'outline', 'accent', 'labelColor', 'canvas'] as const;

/**
 * The colors of the diagram style on the document, as CSS variables (unset: the defaults of the shapes), and its
 * canvas gradient as an attribute: the canvas, the palette and the previews follow.
 */
export function applyDiagramStyle(style: DiagramStyle, root: HTMLElement = document.documentElement): void {
    for (const key of STYLE_VARIABLE_KEYS) {
        const value = style[key];
        if (value) {
            root.style.setProperty(STYLE_VARIABLES[key], value);
        } else {
            root.style.removeProperty(STYLE_VARIABLES[key]);
        }
    }
    if (isLabelSize(style.labelSize)) {
        root.style.setProperty('--style-label-size', `${labelSizePx(style.labelSize)}px`);
    } else {
        root.style.removeProperty('--style-label-size');
    }
    root.toggleAttribute('data-canvas-gradient', style.canvasGradient === true);
}
