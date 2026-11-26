import { footprintOf, LABEL_GAP, labelSideOf, LINE_HEIGHT, rotatePoint, type Point, type Rect, type Size } from '../shapes/geometry';
import { labelLinesOf } from '../shapes/label-text';
import { labelSizePx, type DiagramStyle } from '../shapes/style';
import type { ControlKind, LabelPosition, ShapeData, ShapeSpec } from '../shapes/types';

/*
 * Where the things of run mode are beside an element, as it is seen (rotated, flipped): its control, the arrow of
 * the marker. In the coordinates of the element as it is seen - its position the origin, not rotated - so they
 * stay upright: moved with the element, not rotated with it.
 */

/** An element as the placement reads it: its kind, its data, its size and rotation. */
export interface ElementShape {
    readonly spec: ShapeSpec;
    readonly data: ShapeData;
    readonly size: Size;
    readonly angle: number;
}

// The sizes of the controls (the switch and the slider beside the element, the checkbox in its corner)
export const TOGGLE_SIZE: Size = { width: 100, height: 30 };
export const SLIDER_SIZE: Size = { width: 100, height: 42 };
export const CHECKBOX_SIZE = 20;
// The space between a control and the drawing; how far the checkbox is in from the corner
const CONTROL_GAP = 6;
const CORNER_INSET = 5;

/** The corners of a rectangle of the element as they are seen: rotated about its center. */
function seenCorners(rect: Rect, { size, angle }: ElementShape): Point[] {
    const center = { x: size.width / 2, y: size.height / 2 };
    return [
        { x: rect.x, y: rect.y },
        { x: rect.x + rect.width, y: rect.y },
        { x: rect.x + rect.width, y: rect.y + rect.height },
        { x: rect.x, y: rect.y + rect.height },
    ].map((corner) => rotatePoint(corner, center, angle));
}

function boundsOf(points: readonly Point[]): Rect {
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

/** The box of the element as it is seen (rotated). */
export function seenBox(shape: ElementShape): Rect {
    return boundsOf(seenCorners({ x: 0, y: 0, ...shape.size }, shape));
}

/** The box of the drawing as it is seen: the element, its stubs, its overflow (its label not). */
export function seenDrawing(shape: ElementShape): Rect {
    const footprint = footprintOf(shape.spec, { ...shape.data, label: undefined }, shape.size);
    return boundsOf(seenCorners(footprint, shape));
}

/**
 * How far the outline reaches within a band: of its points with the coordinate across from `low` to `high`, the
 * furthest coordinate along - the largest (`direction` 1) or the smallest (-1).
 */
function extentInBand(corners: readonly Point[], isHorizontal: boolean, low: number, high: number, direction: 1 | -1): number {
    const across = (point: Point) => (isHorizontal ? point.y : point.x);
    const along = (point: Point) => (isHorizontal ? point.x : point.y);
    const values: number[] = [];
    corners.forEach((a, index) => {
        const b = corners[(index + 1) % corners.length];
        if (across(a) >= low && across(a) <= high) {
            values.push(along(a));
        }
        for (const line of [low, high]) {
            const from = across(a);
            const to = across(b);
            if ((from - line) * (to - line) >= 0 || from === to) {
                continue;
            }
            const t = (line - from) / (to - from);
            values.push(along(a) + t * (along(b) - along(a)));
        }
    });
    if (values.length === 0) {
        return 0;
    }
    return direction === 1 ? Math.max(...values) : Math.min(...values);
}

/**
 * Where a box of the size is beside the element, on the side as it is seen - clear of its drawing by the gap: the
 * middle of the edge of the box towards the element. Across the side the box is centered on the center of the
 * element; along it, as far as the drawing reaches in its band.
 */
function besideElement(shape: ElementShape, side: LabelPosition, box: Size, gap: number): Point {
    const footprint = footprintOf(shape.spec, { ...shape.data, label: undefined }, shape.size);
    const corners = seenCorners(footprint, shape);
    const [cx, cy] = [shape.size.width / 2, shape.size.height / 2];
    const isHorizontal = side === 'left' || side === 'right';
    const half = (isHorizontal ? box.height : box.width) / 2;
    const band = isHorizontal ? [cy - half, cy + half] : [cx - half, cx + half];
    const reach = extentInBand(corners, isHorizontal, band[0], band[1], side === 'right' || side === 'bottom' ? 1 : -1);
    return {
        x: isHorizontal ? reach + (side === 'right' ? gap : -gap) : cx,
        y: isHorizontal ? cy : reach + (side === 'bottom' ? gap : -gap),
    };
}

/** The size of the control of the kind. */
export function controlSizeOf(kind: ControlKind): Size {
    if (kind === 'power') {
        return { width: CHECKBOX_SIZE, height: CHECKBOX_SIZE };
    }
    return kind === 'toggle' ? TOGGLE_SIZE : SLIDER_SIZE;
}

/**
 * The top left corner of the control of the element: a checkbox in the top left corner of the element as it is
 * seen (flipped: the top right one), a switch or a slider beside it on its side (`controlPosition`, below unless
 * set), clear of the drawing.
 */
export function controlCornerOf(kind: ControlKind, shape: ElementShape): Point {
    const { width, height } = controlSizeOf(kind);
    if (kind === 'power') {
        const box = seenBox(shape);
        const isFlipped = (shape.data.flip ?? '').includes('x');
        return { x: isFlipped ? box.x + box.width - CORNER_INSET - width : box.x + CORNER_INSET, y: box.y + CORNER_INSET };
    }
    const side = labelSideOf(shape.data.controlPosition);
    const { x, y } = besideElement(shape, side, { width, height }, CONTROL_GAP);
    switch (side) {
        case 'top':
            return { x: x - width / 2, y: y - height };
        case 'left':
            return { x: x - width, y: y - height / 2 };
        case 'right':
            return { x, y: y - height / 2 };
        default:
            return { x: x - width / 2, y };
    }
}

/**
 * How far the control of the element reaches out of its drawing on the side (with the gap), if it is there: a
 * switch, a slider beside the element (a checkbox is in its corner); 0 otherwise.
 */
export function controlReach(shape: ElementShape, side: 'top' | 'bottom'): number {
    const kind = shape.spec.control;
    if (!kind || kind === 'power' || shape.data.controls === false || labelSideOf(shape.data.controlPosition) !== side) {
        return 0;
    }
    return controlSizeOf(kind).height + CONTROL_GAP;
}


/** How far the label of the element reaches out of its drawing on the side (with its gap), if it is there. */
export function labelReach(shape: ElementShape, side: 'top' | 'bottom', style: DiagramStyle): number {
    const { spec, data } = shape;
    if (spec.label === null || labelSideOf(data.label?.position) !== side) {
        return 0;
    }
    const tag = typeof data.tag === 'string' ? data.tag : undefined;
    const lines = labelLinesOf(data.label?.text ?? '', tag, style.labels);
    if (lines.length === 0) {
        return 0;
    }
    const fontSize = labelSizePx(style.labelSize);
    const offset = Math.max(0, Number(data.label?.offset) || 0);
    return lines.length * fontSize * LINE_HEIGHT + LABEL_GAP + offset;
}
