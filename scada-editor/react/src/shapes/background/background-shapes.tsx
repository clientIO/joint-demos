import { outlineWidthPx } from '../style';
import type { ShapeData, SymbolProps } from '../types';

/** The fill of a shape of the background, of the theme: its color by default. */
const BACKGROUND_FILL = 'var(--shape-background-fill)';
// How much of the canvas shows through a shape of the background, when it has no opacity of its own
const DEFAULT_FILL_OPACITY = 0.3;
const DEFAULT_STROKE_WIDTH = 2;
const CORNER_RADIUS = 8;

/** The presentation of the body of a shape of the background: in its color and outline (none by default). */
function bodyStyle(data: ShapeData, surface: SymbolProps['surface']) {
    const style = data.style;
    return {
        fill: surface.styled('color', BACKGROUND_FILL),
        // Its opacity (of its style, set in the inspector) is of its fill: the outline stays.
        fillOpacity: style?.opacity ?? DEFAULT_FILL_OPACITY,
        stroke: surface.styled('outline', 'none'),
        // Its outline width when it has an outline of its own
        strokeWidth: style?.outline && style.outlineWidth ? outlineWidthPx(style.outlineWidth) : DEFAULT_STROKE_WIDTH,
    };
}

/** A rectangle of the background (an area, a zone of the building), rounded. */
export function RectangleDrawing({ width, height, data, surface }: SymbolProps) {
    return <rect width={width} height={height} rx={CORNER_RADIUS} ry={CORNER_RADIUS} {...bodyStyle(data, surface)} />;
}

/** An ellipse of the background (an area, a highlight). */
export function EllipseDrawing({ width, height, data, surface }: SymbolProps) {
    return <ellipse cx={0.5 * width} cy={0.5 * height} rx={0.5 * width} ry={0.5 * height} {...bodyStyle(data, surface)} />;
}
