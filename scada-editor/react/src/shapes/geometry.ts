import type { ElementPort } from '@joint/react-plus';
import type { Flip, LabelPlacement, LabelPosition, Overflow, ShapeData, ShapePorts, ShapeSpec, Side, Stub, Terminal } from './types';

/*
 * The geometry of a shape, from its kind and its data only (never from the DOM): its ports (the ends of its pipe
 * stubs, its terminals) mirrored by its flip, the area its drawing takes, where its label goes.
 */

/** The thickness of a pipe stub. */
export const STUB_THICKNESS = 30;
/** How far a pipe stub reaches under a piece of equipment, so no gap shows at a round side. */
export const STUB_TUCK = 20;
/** The flange at the outer end of a stub: its thickness along the stub, and how much taller it is than the stub. */
export const FLANGE_WIDTH = 10;
export const FLANGE_OVERHANG = 3;
/** How far an electrical terminal reaches out of a shape, and the radius of its end. */
export const TERMINAL_LENGTH = 12;
export const TERMINAL_RADIUS = 4;
/** The space between a shape and its label. */
export const LABEL_GAP = 8;
/** The height of a line of a label, of its font size. */
export const LINE_HEIGHT = 1.2;
// Most shapes have their label below them: the room it takes.
const DEFAULT_OVERFLOW: Required<Overflow> = { top: 0, right: 0, bottom: 30, left: 0 };
// The share of the font size an average character of a label is wide (a label is measured from its text).
const CHARACTER_WIDTH = 0.6;
// The default label: below the shape, centered.
const BELOW = (width: number, height: number): LabelPlacement => ({ x: width / 2, y: height + 10, anchor: 'middle', verticalAnchor: 'top' });

/** The transform mirroring a part across the middle of the box by the flip; none when not flipped. */
export function flipTransform(flip: Flip | undefined, width: number, height: number): string | undefined {
    if (!flip) {
        return undefined;
    }
    const sx = flip.includes('x') ? -1 : 1;
    const sy = flip.includes('y') ? -1 : 1;
    return `matrix(${sx},0,0,${sy},${sx < 0 ? width : 0},${sy < 0 ? height : 0})`;
}

/** A point. */
export interface Point {
    readonly x: number;
    readonly y: number;
}

/** A rectangle. */
export interface Rect extends Point {
    readonly width: number;
    readonly height: number;
}

/** A size. */
export interface Size {
    readonly width: number;
    readonly height: number;
}

/** The angle of a stub on each side: it points to the right, turned clockwise. */
export const SIDE_ANGLES: Record<Side, number> = { right: 0, bottom: 90, left: 180, top: 270 };

const isAcross = (side: Side): boolean => side === 'left' || side === 'right';

/** The stub mirrored by the flip: on the other side, or the other way along the top and the bottom. */
export function flipStub<T extends Stub | Terminal>(stub: T, flip: Flip | undefined): T {
    if (!flip) {
        return stub;
    }
    let { side, at = 0.5 } = stub;
    const across = isAcross(side);
    if (flip.includes('x')) {
        if (across) {
            side = side === 'left' ? 'right' : 'left';
        } else {
            at = 1 - at;
        }
    }
    if (flip.includes('y')) {
        if (across) {
            at = 1 - at;
        } else {
            side = side === 'top' ? 'bottom' : 'top';
        }
    }
    return { ...stub, side, at };
}

/** The ports of the shape for the data and size: the stubs and the terminals, mirrored by the flip. */
export function shapePortsOf(spec: ShapeSpec, data: ShapeData, size: Size): ShapePorts {
    const ports = typeof spec.ports === 'function' ? spec.ports(data, size) : spec.ports ?? {};
    return {
        ...ports,
        stubs: ports.stubs?.map((stub) => flipStub(stub, data.flip)),
        terminals: ports.terminals?.map((terminal) => flipStub(terminal, data.flip)),
    };
}

/** The point `distance` out of the side, at the part `at` of it, in the element's box. */
export function sidePoint(side: Side, at: number, distance: number, size: Size): Point {
    switch (side) {
        case 'left':
            return { x: -distance, y: at * size.height };
        case 'right':
            return { x: size.width + distance, y: at * size.height };
        case 'top':
            return { x: at * size.width, y: -distance };
        case 'bottom':
            return { x: at * size.width, y: size.height + distance };
    }
}

/** The same point as `calc()` expressions: the ports follow a resize without being rebuilt. */
function sideCalc(side: Side, at: number, distance: number): { readonly cx: number | string; readonly cy: number | string } {
    switch (side) {
        case 'left':
            return { cx: -distance, cy: `calc(${at} * h)` };
        case 'right':
            return { cx: `calc(w + ${distance})`, cy: `calc(${at} * h)` };
        case 'top':
            return { cx: `calc(${at} * w)`, cy: -distance };
        case 'bottom':
            return { cx: `calc(${at} * w)`, cy: `calc(h + ${distance})` };
    }
}

/**
 * The ports of the element as the graph stores them: the flanges at the ends of the stubs and the ends of the
 * terminals - transparent magnets (the shape draws them), passive: a link is connected to them, not drawn from them.
 */
export function portMapOf(ports: ShapePorts): Record<string, ElementPort> {
    const portMap: Record<string, ElementPort> = {};
    const length = ports.stubLength ?? 0;
    for (const { id, side, at = 0.5 } of ports.stubs ?? []) {
        const across = isAcross(side);
        portMap[id] = {
            ...sideCalc(side, at, length - FLANGE_WIDTH / 2),
            shape: 'rect',
            width: across ? FLANGE_WIDTH : STUB_THICKNESS + 2 * FLANGE_OVERHANG,
            height: across ? STUB_THICKNESS + 2 * FLANGE_OVERHANG : FLANGE_WIDTH,
            color: 'transparent',
            className: 'scada-stub-end',
            passive: true,
        };
    }
    for (const { id, side, at = 0.5 } of ports.terminals ?? []) {
        portMap[id] = {
            ...sideCalc(side, at, TERMINAL_LENGTH),
            shape: 'ellipse',
            width: 2 * TERMINAL_RADIUS + 2,
            height: 2 * TERMINAL_RADIUS + 2,
            color: 'transparent',
            className: 'scada-terminal',
            passive: true,
        };
    }
    return portMap;
}

/** Whether the port is an electrical terminal: a wire connects to it, a pipe does not. */
export function isTerminalPort(ports: ShapePorts, port: string | undefined): boolean {
    return port !== undefined && (ports.terminals ?? []).some((terminal) => terminal.id === port);
}

/** The box of the points. */
function boundsOf(points: readonly Point[]): Rect {
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

function union(a: Rect, b: Rect): Rect {
    return boundsOf([a, { x: b.x, y: b.y }, { x: a.x + a.width, y: a.y + a.height }, { x: b.x + b.width, y: b.y + b.height }]);
}

/** The rectangle of a port of the length (along the side) and the thickness, out of the side. */
function portRect(side: Side, at: number, length: number, thickness: number, size: Size): Rect {
    const start = sidePoint(side, at, 0, size);
    const end = sidePoint(side, at, length, size);
    const half = thickness / 2;
    return isAcross(side)
        ? { x: Math.min(start.x, end.x), y: start.y - half, width: length, height: thickness }
        : { x: start.x - half, y: Math.min(start.y, end.y), width: thickness, height: length };
}

/** How far the drawing reaches out of the box, the label below not counted: it starts where the label is. */
function drawingOverflow(spec: ShapeSpec, data: ShapeData, size: Size): Required<Overflow> {
    const overflow = typeof spec.overflow === 'function' ? spec.overflow(data) : spec.overflow ?? {};
    const flip = data.flip ?? '';
    const own: Overflow = {
        ...overflow,
        ...(flip.includes('x') ? { left: overflow.right, right: overflow.left } : {}),
        ...(flip.includes('y') ? { top: overflow.bottom, bottom: overflow.top } : {}),
    };
    const defined = Object.fromEntries(Object.entries(own).filter(([, value]) => value !== undefined));
    const drawing: Required<Overflow> = { ...DEFAULT_OVERFLOW, ...defined };
    if (spec.label === null) {
        return drawing;
    }
    const placement = (spec.label ?? BELOW)(size.width, size.height);
    if (placement.verticalAnchor === 'top' && placement.y > size.height) {
        return { ...drawing, bottom: Math.min(drawing.bottom, placement.y - size.height) };
    }
    return drawing;
}

/** The area the drawing of the element takes in its own box (not rotated): the box, the stubs, the overflow. */
export function footprintOf(spec: ShapeSpec, data: ShapeData, size: Size): Rect {
    const ports = shapePortsOf(spec, data, size);
    let footprint: Rect = { x: 0, y: 0, width: size.width, height: size.height };
    for (const { side, at = 0.5 } of ports.stubs ?? []) {
        footprint = union(footprint, portRect(side, at, ports.stubLength ?? 0, STUB_THICKNESS + 2 * FLANGE_OVERHANG, size));
    }
    for (const { side, at = 0.5 } of ports.terminals ?? []) {
        footprint = union(footprint, portRect(side, at, TERMINAL_LENGTH + TERMINAL_RADIUS, 2 * TERMINAL_RADIUS, size));
    }
    const { top, right, bottom, left } = drawingOverflow(spec, data, size);
    return { x: footprint.x - left, y: footprint.y - top, width: footprint.width + left + right, height: footprint.height + top + bottom };
}

/** The point rotated about the center by the angle (degrees, clockwise as the paper turns). */
export function rotatePoint(point: Point, center: Point, angle: number): Point {
    const radians = (angle * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    return { x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos };
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

/** Where a label is drawn: its point, its anchors, and the rotation turning it back to horizontal. */
export interface LabelLayout extends LabelPlacement {
    /** The rotation (degrees) about its point: the element's turned back. */
    readonly rotation: number;
}

/** The side of a label, the bottom if none. */
export function labelSideOf(position: unknown): LabelPosition {
    return position === 'top' || position === 'left' || position === 'right' ? position : 'bottom';
}

/** The size a label of these lines takes in the font size. */
export function labelSizeOf(lines: readonly string[], fontSize: number): Size {
    const longest = Math.max(0, ...lines.map((line) => line.length));
    return { width: longest * fontSize * CHARACTER_WIDTH, height: lines.length * fontSize * LINE_HEIGHT };
}

/**
 * The layout of the label of the element: on its side as the element is seen, clear of its drawing, kept
 * horizontal on a rotated element - in the element's own (rotated) coordinates. Below an element not rotated,
 * where the shape draws it (moved down by the offset).
 */
export function labelLayoutOf(
    spec: ShapeSpec,
    data: ShapeData,
    size: Size,
    angle: number,
    textSize: Size,
): LabelLayout {
    const side = labelSideOf(data.label?.position);
    const offset = Math.max(0, Number(data.label?.offset) || 0);
    const ports = shapePortsOf(spec, data, size);
    const pointsDown = (ports.stubs ?? []).some((stub) => stub.side === 'bottom');
    const isUpright = angle % 360 === 0;
    if (side === 'bottom' && isUpright && !(data.flip ?? '').includes('y') && !pointsDown) {
        const placement = (spec.label ?? BELOW)(size.width, size.height);
        return { ...placement, y: placement.y + offset, rotation: 0 };
    }
    const footprint = footprintOf(spec, { ...data, label: undefined }, size);
    const center = { x: size.width / 2, y: size.height / 2 };
    const corners = [
        { x: footprint.x, y: footprint.y },
        { x: footprint.x + footprint.width, y: footprint.y },
        { x: footprint.x + footprint.width, y: footprint.y + footprint.height },
        { x: footprint.x, y: footprint.y + footprint.height },
    ].map((corner) => rotatePoint(corner, center, angle));
    const isHorizontal = side === 'left' || side === 'right';
    const half = (isHorizontal ? textSize.height : textSize.width) / 2;
    const band = isHorizontal ? [center.y - half, center.y + half] : [center.x - half, center.x + half];
    const gap = LABEL_GAP + offset;
    const reach = extentInBand(corners, isHorizontal, band[0], band[1], side === 'right' || side === 'bottom' ? 1 : -1);
    const seen: Point = {
        x: isHorizontal ? reach + (side === 'right' ? gap : -gap) : center.x,
        y: isHorizontal ? center.y : reach + (side === 'bottom' ? gap : -gap),
    };
    // Back into the element's coordinates: the element's rotation undone.
    const point = rotatePoint(seen, center, -angle);
    const anchors = {
        bottom: { anchor: 'middle', verticalAnchor: 'top' },
        top: { anchor: 'middle', verticalAnchor: 'bottom' },
        left: { anchor: 'end', verticalAnchor: 'middle' },
        right: { anchor: 'start', verticalAnchor: 'middle' },
    } as const;
    return { ...point, ...anchors[side], rotation: -angle };
}
