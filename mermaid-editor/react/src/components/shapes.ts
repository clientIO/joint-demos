/**
 * Geometry for every Mermaid flowchart node shape.
 *
 * Each entry answers two questions:
 *
 * - `size` — given the measured bounding box of the label, how big must the
 *   shape be to contain it? This runs as the `transform` of `useMeasureElement`,
 *   so its result becomes the JointJS element size.
 * - `outline` — given that size, what does the shape look like? Returned as SVG
 *   attributes rather than JSX so the renderer stays a single component and
 *   hook order never depends on the shape.
 *
 * Shape ids are the ones Mermaid's `FlowDB.getTypeFromVertex()` produces.
 */

export interface Size {
    readonly width: number;
    readonly height: number;
}

/** An outline is drawn as a `<rect>`, an `<ellipse>` or a `<path>`. */
export type Outline =
    | { readonly kind: 'rect'; readonly rx: number }
    | { readonly kind: 'ellipse' }
    | { readonly kind: 'path'; readonly d: string; readonly inner?: string };

export interface ShapeSpec {
    readonly size: (label: Size) => Size;
    readonly outline: (size: Size) => Outline;
    /**
     * Nudge the label off the element's vertical centre, for shapes whose
     * enclosed area is not centred in their bounding box.
     * @default 0
     */
    readonly textDy?: number;
}

/** Horizontal / vertical breathing room around the label for boxy shapes. */
const PAD_X = 22;
const PAD_Y = 13;

function boxy(padX = PAD_X, padY = PAD_Y) {
    return ({ width, height }: Size): Size => ({
        width: Math.max(width + 2 * padX, 60),
        height: Math.max(height + 2 * padY, 40),
    });
}

function polygon(points: ReadonlyArray<readonly [number, number]>): Outline {
    return {
        kind: 'path',
        d: `M ${points.map(([x, y]) => `${x} ${y}`).join(' L ')} Z`,
    };
}

/** Slant used by the parallelogram and trapezoid family, mirroring Mermaid. */
function slant(height: number) {
    return height / 2;
}

const RECT: ShapeSpec = {
    size: boxy(),
    outline: () => ({ kind: 'rect', rx: 0 }),
};

const ROUNDED: ShapeSpec = {
    size: boxy(),
    outline: () => ({ kind: 'rect', rx: 8 }),
};

const STADIUM: ShapeSpec = {
    size: boxy(28),
    outline: ({ height }) => ({ kind: 'rect', rx: height / 2 }),
};

/** `[[text]]` — a rectangle with an inset rule down each side. */
const SUBROUTINE: ShapeSpec = {
    size: boxy(30),
    outline: ({ width, height }) => {
        // Clamped so the shape still reads at icon sizes, not just node sizes.
        const inset = Math.min(9, width / 6);
        return {
            kind: 'path',
            d: `M 0 0 H ${width} V ${height} H 0 Z`,
            inner: `M ${inset} 0 V ${height} M ${width - inset} 0 V ${height}`,
        };
    },
};

/** Vertical radius of the cylinder's end caps. */
const CYLINDER_RY = 11;

/**
 * `[(text)]` — a database cylinder.
 *
 * The top cap's front arc dips to `2 * ry`, so the enclosed barrel runs from
 * there to the bottom of the lower bulge. Its midpoint is `ry` below the
 * element's centre, which is where the label belongs — centring it in the
 * bounding box instead would ride it up onto the cap.
 */
const CYLINDER: ShapeSpec = {
    size: ({ width, height }) => ({
        width: Math.max(width + 2 * PAD_X, 60),
        // Room for the elliptical cap at the top and the bulge at the bottom.
        height: Math.max(height + 2 * PAD_Y + 2 * CYLINDER_RY, 56),
    }),
    outline: ({ width, height }) => {
        // Clamped so the caps cannot swallow the barrel on a short shape.
        const ry = Math.min(CYLINDER_RY, height / 4);
        const w = width;
        return {
            kind: 'path',
            d: [
                `M 0 ${ry}`,
                `A ${w / 2} ${ry} 0 0 1 ${w} ${ry}`,
                `V ${height - ry}`,
                `A ${w / 2} ${ry} 0 0 1 0 ${height - ry}`,
                'Z',
            ].join(' '),
            inner: `M 0 ${ry} A ${w / 2} ${ry} 0 0 0 ${w} ${ry}`,
        };
    },
    textDy: CYLINDER_RY,
};

/**
 * A circle must contain the label's diagonal, not just its width, so the
 * radius comes from the half-diagonal rather than from `max(width, height)`.
 */
function circleSize(padding: number) {
    return ({ width, height }: Size): Size => {
        const diameter = Math.max(Math.hypot(width, height) + 2 * padding, 56);
        return { width: diameter, height: diameter };
    };
}

const CIRCLE: ShapeSpec = {
    size: circleSize(12),
    outline: () => ({ kind: 'ellipse' }),
};

const DOUBLE_CIRCLE: ShapeSpec = {
    size: circleSize(18),
    outline: ({ width, height }) => ({
        kind: 'path',
        d: ellipsePath(width / 2, height / 2, width / 2, height / 2),
        inner: ellipsePath(width / 2, height / 2, width / 2 - 6, height / 2 - 6),
    }),
};

const ELLIPSE: ShapeSpec = {
    size: ({ width, height }) => ({
        // An inscribed rectangle needs the ellipse axes scaled by √2.
        width: Math.max(width * Math.SQRT2 + 24, 70),
        height: Math.max(height * Math.SQRT2 + 20, 46),
    }),
    outline: () => ({ kind: 'ellipse' }),
};

/**
 * `{text}` — a rhombus. A centred `w × h` label fits a rhombus of `2w × 2h`
 * exactly, so double the padded label box.
 */
const DIAMOND: ShapeSpec = {
    size: ({ width, height }) => ({
        width: Math.max(2 * width + 44, 100),
        height: Math.max(2 * height + 26, 68),
    }),
    outline: ({ width, height }) =>
        polygon([
            [width / 2, 0],
            [width, height / 2],
            [width / 2, height],
            [0, height / 2],
        ]),
};

const HEXAGON: ShapeSpec = {
    size: ({ width, height }) => {
        const box = boxy()({ width, height });
        return { width: box.width + box.height / 2, height: box.height };
    },
    outline: ({ width, height }) => {
        const s = slant(height);
        return polygon([
            [s, 0],
            [width - s, 0],
            [width, height / 2],
            [width - s, height],
            [s, height],
            [0, height / 2],
        ]);
    },
};

/** Shapes whose width grows by the slant: parallelograms and trapezoids. */
function slanted(build: (width: number, height: number, s: number) => ReadonlyArray<readonly [number, number]>): ShapeSpec {
    return {
        size: ({ width, height }) => {
            const box = boxy()({ width, height });
            return { width: box.width + box.height / 2, height: box.height };
        },
        outline: ({ width, height }) => polygon(build(width, height, slant(height))),
    };
}

/** `[/text/]` — bottom edge shifted left, top edge shifted right. */
const LEAN_RIGHT = slanted((w, h, s) => [
    [s, 0],
    [w, 0],
    [w - s, h],
    [0, h],
]);

/** `[\text\]` — the mirror of {@link LEAN_RIGHT}. */
const LEAN_LEFT = slanted((w, h, s) => [
    [0, 0],
    [w - s, 0],
    [w, h],
    [s, h],
]);

/** `[/text\]` — narrow top, wide bottom. */
const TRAPEZOID = slanted((w, h, s) => [
    [s, 0],
    [w - s, 0],
    [w, h],
    [0, h],
]);

/** `[\text/]` — wide top, narrow bottom. */
const INV_TRAPEZOID = slanted((w, h, s) => [
    [0, 0],
    [w, 0],
    [w - s, h],
    [s, h],
]);

/** `>text]` — a rectangle with a notch cut into its left edge. */
const ODD: ShapeSpec = {
    size: boxy(26),
    outline: ({ width, height }) =>
        polygon([
            [0, 0],
            [width, 0],
            [width, height],
            [0, height],
            [Math.min(18, width / 4), height / 2],
        ]),
};

function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
    return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
}

/** Mermaid shape id → geometry. Unknown ids fall back to {@link RECT}. */
const SHAPES: Record<string, ShapeSpec> = {
    squareRect: RECT,
    rect: RECT,
    roundedRect: ROUNDED,
    rounded: ROUNDED,
    stadium: STADIUM,
    subroutine: SUBROUTINE,
    cylinder: CYLINDER,
    circle: CIRCLE,
    doublecircle: DOUBLE_CIRCLE,
    ellipse: ELLIPSE,
    diamond: DIAMOND,
    hexagon: HEXAGON,
    lean_right: LEAN_RIGHT,
    'lean-r': LEAN_RIGHT,
    lean_left: LEAN_LEFT,
    'lean-l': LEAN_LEFT,
    trapezoid: TRAPEZOID,
    'trap-b': TRAPEZOID,
    inv_trapezoid: INV_TRAPEZOID,
    'trap-t': INV_TRAPEZOID,
    odd: ODD,
};

export function getShapeSpec(shape: string): ShapeSpec {
    return SHAPES[shape] ?? RECT;
}
