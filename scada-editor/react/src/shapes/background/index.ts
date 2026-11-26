import { defineShape } from '../define-shape';
import type { ShapeSpec } from '../types';
import { EllipseDrawing, RectangleDrawing } from './background-shapes';

/** What the shapes of the background have in common: under the plant, no label, an ID only when asked. */
const BACKGROUND_BASE = {
    group: 'Background',
    size: { width: 160, height: 100 },
    layer: 'background',
    overflow: { bottom: 0 },
    label: null,
    tagPrefix: 'BG',
    autoTag: false,
    hasFinish: false,
    colorField: { key: 'color', defaultValue: 'var(--shape-background-fill)', isPart: true },
    // A border of the area: none by default
    outlineField: { key: 'outline', isPart: true },
} as const;

/** A rectangle of the background. */
const RECTANGLE = defineShape({
    ...BACKGROUND_BASE,
    kind: 'Rectangle',
    title: 'Rectangle',
    description: 'A shape of the background (an area, a zone): its color and opacity in the inspector, resized and rotated freely.',
    Drawing: RectangleDrawing,
});

/** An ellipse of the background. */
const ELLIPSE = defineShape({
    ...BACKGROUND_BASE,
    kind: 'Ellipse',
    title: 'Ellipse',
    description: 'A shape of the background (an area, a highlight): its color and opacity in the inspector, resized and rotated freely.',
    Drawing: EllipseDrawing,
});

/** The shapes of the background group of the palette. */
export const BACKGROUND_SHAPES: readonly ShapeSpec[] = [RECTANGLE, ELLIPSE];
