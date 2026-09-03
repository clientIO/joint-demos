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

/**
 * An outline is drawn as a `<rect>`, an `<ellipse>`, a `<path>` — or nothing
 * (`none`), for the `text` shape that is just its label.
 *
 * `filled` paints the body in the stroke colour (fork bars, junctions);
 * `open` leaves it unfilled (braces, which are not closed shapes).
 */
export type Outline =
    | { readonly kind: 'none' }
    | { readonly kind: 'rect'; readonly rx: number }
    | { readonly kind: 'ellipse' }
    | {
        readonly kind: 'path';
        readonly d: string;
        readonly inner?: string;
        readonly filled?: boolean;
        readonly open?: boolean;
    };

export interface ShapeSpec {
    readonly size: (label: Size) => Size;
    readonly outline: (size: Size) => Outline;
    /**
     * Nudge the label off the element's vertical centre — for shapes whose
     * enclosed area is not centred in their bounding box, and for the icon
     * shapes (fork, junction, bolt, …) whose label sits underneath.
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

// ---------------------------------------------------------------------------
// Mermaid v11 `@{ shape: … }` shapes.
//
// Same two-question contract as above. The icon shapes (fork, junction, bolt,
// small/framed/filled circles, hourglass, person, …) are fixed-size glyphs in
// Mermaid, with the label set underneath — `size` ignores the label and
// `textDy` pushes it below the outline.
// ---------------------------------------------------------------------------

/** The label alone: Mermaid's `text` block. */
const TEXT_BLOCK: ShapeSpec = {
    size: ({ width, height }) => ({ width: width + 16, height: height + 12 }),
    outline: () => ({ kind: 'none' }),
};

/** `card` — a rectangle with its top-left corner cut off. */
const NOTCH_RECT: ShapeSpec = {
    size: boxy(),
    outline: ({ width, height }) => {
        const notch = Math.min(14, height / 3);
        return polygon([
            [notch, 0],
            [width, 0],
            [width, height],
            [0, height],
            [0, notch],
        ]);
    },
};

/** `lined-process` — a rule inset along each vertical edge would be the
 * subroutine; Mermaid's lined process keeps just the left one. */
const LINED_RECT: ShapeSpec = {
    size: boxy(26),
    outline: ({ width, height }) => ({
        kind: 'path',
        d: `M 0 0 H ${width} V ${height} H 0 Z`,
        inner: `M 9 0 V ${height}`,
    }),
};

/** `processes` — the front rectangle with two sheets stacked behind it. */
const STACKED_RECT: ShapeSpec = {
    size: ({ width, height }) => {
        const box = boxy()({ width, height });
        return { width: box.width + 8, height: box.height + 8 };
    },
    outline: ({ width, height }) => ({
        kind: 'path',
        d: `M 0 8 H ${width - 8} V ${height} H 0 Z`,
        inner: [
            `M 4 8 V 4 H ${width - 4} V ${height - 4} H ${width - 8}`,
            `M 8 4 V 0 H ${width} V ${height - 8} H ${width - 4}`,
        ].join(' '),
    }),
    textDy: 4,
};

/** `tagged-process` — a rectangle with a tag across its bottom-right corner. */
const TAGGED_RECT: ShapeSpec = {
    size: boxy(),
    outline: ({ width, height }) => ({
        kind: 'path',
        d: `M 0 0 H ${width} V ${height} H 0 Z`,
        inner: `M ${width - 14} ${height} L ${width} ${height - 14}`,
    }),
};

/** `divided-process` — a rectangle with a rule under a slim header band. */
const DIVIDED_RECT: ShapeSpec = {
    size: ({ width, height }) => {
        const box = boxy()({ width, height });
        return { width: box.width, height: box.height + 14 };
    },
    outline: ({ width, height }) => ({
        kind: 'path',
        d: `M 0 0 H ${width} V ${height} H 0 Z`,
        inner: `M 0 14 H ${width}`,
    }),
    textDy: 7,
};

/** `internal-storage` — a rectangle ruled into a window pane. */
const WINDOW_PANE: ShapeSpec = {
    size: ({ width, height }) => {
        const box = boxy()({ width, height });
        return { width: box.width + 14, height: box.height + 14 };
    },
    outline: ({ width, height }) => ({
        kind: 'path',
        d: `M 0 0 H ${width} V ${height} H 0 Z`,
        inner: `M 0 14 H ${width} M 14 0 V ${height}`,
    }),
    textDy: 7,
};

/** `manual-input` — a rectangle whose top edge slopes up to the right. */
const SLOPED_RECT: ShapeSpec = {
    size: ({ width, height }) => {
        const box = boxy()({ width, height });
        return { width: box.width, height: box.height + 14 };
    },
    outline: ({ width, height }) =>
        polygon([
            [0, 14],
            [width, 0],
            [width, height],
            [0, height],
        ]),
    textDy: 7,
};

/** `stored-data` — both vertical edges bowed toward the right. */
const BOW_RECT: ShapeSpec = {
    size: boxy(26),
    outline: ({ width, height }) => ({
        kind: 'path',
        d: [
            `M 10 0 H ${width - 10}`,
            `C ${width + 3} ${height * 0.25} ${width + 3} ${height * 0.75} ${width - 10} ${height}`,
            'H 10',
            `C ${23} ${height * 0.75} ${23} ${height * 0.25} 10 0`,
            'Z',
        ].join(' '),
    }),
};

/** `fork` / `join` — a small filled bar; any label sits underneath. */
const FORK: ShapeSpec = {
    size: () => ({ width: 64, height: 12 }),
    outline: ({ width, height }) => ({
        kind: 'path',
        d: `M 2 0 H ${width - 2} Q ${width} 0 ${width} 2 V ${height - 2} Q ${width} ${height} ${width - 2} ${height} H 2 Q 0 ${height} 0 ${height - 2} V 2 Q 0 0 2 0 Z`,
        filled: true,
    }),
    textDy: 20,
};

/** `start` — a small filled-less circle, label underneath. */
const SMALL_CIRCLE: ShapeSpec = {
    size: () => ({ width: 20, height: 20 }),
    outline: ({ width, height }) => ({
        kind: 'path',
        d: ellipsePath(width / 2, height / 2, width / 2, height / 2),
    }),
    textDy: 24,
};

/** `stop` — a circle with an inner ring, label underneath. */
const FRAMED_CIRCLE: ShapeSpec = {
    size: () => ({ width: 26, height: 26 }),
    outline: ({ width, height }) => ({
        kind: 'path',
        d: ellipsePath(width / 2, height / 2, width / 2, height / 2),
        inner: ellipsePath(width / 2, height / 2, width / 2 - 4.5, height / 2 - 4.5),
    }),
    textDy: 28,
};

/** `junction` — a small filled circle, label underneath. */
const FILLED_CIRCLE: ShapeSpec = {
    size: () => ({ width: 18, height: 18 }),
    outline: ({ width, height }) => ({
        kind: 'path',
        d: ellipsePath(width / 2, height / 2, width / 2, height / 2),
        filled: true,
    }),
    textDy: 23,
};

/** `summary` — a circle quartered by its diagonals, label underneath. */
const CROSSED_CIRCLE: ShapeSpec = {
    size: () => ({ width: 34, height: 34 }),
    outline: ({ width, height }) => {
        const r = width / 2;
        const offset = r / Math.SQRT2;
        const cx = width / 2;
        const cy = height / 2;
        return {
            kind: 'path',
            d: ellipsePath(cx, cy, r, height / 2),
            inner: [
                `M ${cx - offset} ${cy - offset} L ${cx + offset} ${cy + offset}`,
                `M ${cx - offset} ${cy + offset} L ${cx + offset} ${cy - offset}`,
            ].join(' '),
        };
    },
    textDy: 32,
};

/** `collate` — an hourglass: two triangles meeting in a point. */
const HOURGLASS: ShapeSpec = {
    size: () => ({ width: 40, height: 44 }),
    outline: ({ width, height }) =>
        polygon([
            [0, 0],
            [width, 0],
            [0, height],
            [width, height],
        ]),
    textDy: 37,
};

/** `com-link` — a lightning bolt, label underneath. */
const BOLT: ShapeSpec = {
    size: () => ({ width: 38, height: 50 }),
    outline: ({ width, height }) =>
        polygon([
            [width * 0.62, 0],
            [0, height * 0.58],
            [width * 0.4, height * 0.58],
            [width * 0.3, height],
            [width, height * 0.36],
            [width * 0.52, height * 0.36],
        ]),
    textDy: 40,
};

/** `extract` — a triangle pointing up; the label rides in the wide half. */
const TRIANGLE: ShapeSpec = {
    size: ({ width, height }) => ({
        width: Math.max(2 * width + 34, 84),
        height: Math.max(2 * height + 26, 62),
    }),
    outline: ({ width, height }) =>
        polygon([
            [width / 2, 0],
            [width, height],
            [0, height],
        ]),
    textDy: 13,
};

/** `manual-file` — the same triangle flipped to point down. */
const FLIPPED_TRIANGLE: ShapeSpec = {
    size: TRIANGLE.size,
    outline: ({ width, height }) =>
        polygon([
            [0, 0],
            [width, 0],
            [width / 2, height],
        ]),
    textDy: -13,
};

/** `loop-limit` — a rectangle with both top corners notched. */
const NOTCHED_PENTAGON: ShapeSpec = {
    size: boxy(24),
    outline: ({ width, height }) => {
        const notch = Math.min(12, height / 3);
        return polygon([
            [notch, 0],
            [width - notch, 0],
            [width, notch],
            [width, height],
            [0, height],
            [0, notch],
        ]);
    },
};

/** `paper-tape` — a flag: both horizontal edges waved. */
const FLAG: ShapeSpec = {
    size: ({ width, height }) => {
        const box = boxy()({ width, height });
        return { width: box.width, height: box.height + 16 };
    },
    outline: ({ width, height }) => ({
        kind: 'path',
        d: [
            `M 0 8 Q ${width * 0.25} -8 ${width * 0.5} 8 T ${width} 8`,
            `V ${height - 8}`,
            `Q ${width * 0.75} ${height + 8} ${width * 0.5} ${height - 8} T 0 ${height - 8}`,
            'Z',
        ].join(' '),
    }),
};

/** Bottom edge of every document shape: a gentle double wave. */
function documentBottom(width: number, height: number): string {
    return `V ${height - 8} Q ${width * 0.75} ${height + 7} ${width * 0.5} ${height - 6} T 0 ${height - 6} Z`;
}

/** `document` — a rectangle whose bottom edge is a wave. */
const DOC: ShapeSpec = {
    size: ({ width, height }) => {
        const box = boxy()({ width, height });
        return { width: box.width, height: box.height + 12 };
    },
    outline: ({ width, height }) => ({
        kind: 'path',
        d: `M 0 0 H ${width} ${documentBottom(width, height)}`,
    }),
    textDy: -4,
};

/** `documents` — the front document with two sheets stacked behind it. */
const DOCS: ShapeSpec = {
    size: ({ width, height }) => {
        const box = boxy()({ width, height });
        return { width: box.width + 8, height: box.height + 20 };
    },
    outline: ({ width, height }) => ({
        kind: 'path',
        d: `M 0 8 H ${width - 8} ${documentBottom(width - 8, height)}`,
        inner: [
            `M 4 8 V 4 H ${width - 4} V ${height - 14}`,
            `M 8 4 V 0 H ${width} V ${height - 18}`,
        ].join(' '),
    }),
    textDy: 0,
};

/** `lined-document` — a document with a rule inset along its left edge. */
const LINED_DOC: ShapeSpec = {
    size: DOC.size,
    outline: ({ width, height }) => ({
        kind: 'path',
        d: `M 0 0 H ${width} ${documentBottom(width, height)}`,
        inner: `M 9 0 V ${height - 6.5}`,
    }),
    textDy: -4,
};

/** `tagged-document` — a document with a tag across its bottom-right corner. */
const TAGGED_DOC: ShapeSpec = {
    size: DOC.size,
    outline: ({ width, height }) => ({
        kind: 'path',
        d: `M 0 0 H ${width} ${documentBottom(width, height)}`,
        inner: `M ${width - 14} ${height - 7} L ${width} ${height - 16}`,
    }),
    textDy: -4,
};

/** `delay` — a rectangle whose right edge is a semicircle. */
const DELAY: ShapeSpec = {
    size: boxy(24),
    outline: ({ width, height }) => ({
        kind: 'path',
        d: `M 0 0 H ${width - height / 2} A ${height / 2} ${height / 2} 0 0 1 ${width - height / 2} ${height} H 0 Z`,
    }),
};

/** Horizontal radius of the horizontal cylinder's end caps. */
const H_CYLINDER_RX = 11;

/** `das` — a cylinder lying on its side; the cap faces left. */
const HORIZONTAL_CYLINDER: ShapeSpec = {
    size: ({ width, height }) => ({
        width: Math.max(width + 2 * PAD_X + 2 * H_CYLINDER_RX, 72),
        height: Math.max(height + 2 * PAD_Y, 40),
    }),
    outline: ({ width, height }) => {
        const rx = Math.min(H_CYLINDER_RX, width / 4);
        return {
            kind: 'path',
            d: [
                `M ${rx} 0`,
                `H ${width - rx}`,
                `A ${rx} ${height / 2} 0 0 1 ${width - rx} ${height}`,
                `H ${rx}`,
                `A ${rx} ${height / 2} 0 0 1 ${rx} 0`,
                'Z',
            ].join(' '),
            inner: `M ${rx} 0 A ${rx} ${height / 2} 0 0 1 ${rx} ${height}`,
        };
    },
};

/** `disk` — the upright cylinder with a second groove under the cap. */
const LINED_CYLINDER: ShapeSpec = {
    size: CYLINDER.size,
    outline: ({ width, height }) => {
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
            inner: [
                `M 0 ${ry} A ${w / 2} ${ry} 0 0 0 ${w} ${ry}`,
                `M 0 ${ry + 6} A ${w / 2} ${ry} 0 0 0 ${w} ${ry + 6}`,
            ].join(' '),
        };
    },
    textDy: CYLINDER_RY + 3,
};

/** `display` — rounded right side, concave left edge. */
const CURVED_TRAPEZOID: ShapeSpec = {
    size: boxy(26),
    outline: ({ width, height }) => ({
        kind: 'path',
        d: [
            `M 14 0 H ${width - 10}`,
            `A 10 10 0 0 1 ${width} 10`,
            `V ${height - 10}`,
            `A 10 10 0 0 1 ${width - 10} ${height}`,
            'H 14',
            `Q 3 ${height / 2} 14 0`,
            'Z',
        ].join(' '),
    }),
};

/** Width one curly brace column takes, label padding included. */
const BRACE_GUTTER = 18;

function bracePath(x: number, height: number, opensLeft: boolean): string {
    const bow = opensLeft ? -7 : 7;
    const tip = opensLeft ? -11 : 11;
    return [
        `M ${x + bow} 0`,
        `C ${x} 2 ${x + bow * 0.4} ${height * 0.32} ${x} ${height / 2 - 4}`,
        `L ${x + tip * 0.35} ${height / 2}`,
        `L ${x} ${height / 2 + 4}`,
        `C ${x + bow * 0.4} ${height * 0.68} ${x} ${height - 2} ${x + bow} ${height}`,
    ].join(' ');
}

/** `comment` — a curly brace on the left of the note text. */
const BRACE_LEFT: ShapeSpec = {
    size: ({ width, height }) => ({
        width: width + 2 * BRACE_GUTTER,
        height: Math.max(height + 18, 46),
    }),
    outline: ({ height }) => ({
        kind: 'path',
        d: bracePath(11, height, false),
        open: true,
    }),
};

/** The same comment with the brace on the right. */
const BRACE_RIGHT: ShapeSpec = {
    size: BRACE_LEFT.size,
    outline: ({ width, height }) => ({
        kind: 'path',
        d: bracePath(width - 11, height, true),
        open: true,
    }),
};

/** Braces on both sides. */
const BRACES: ShapeSpec = {
    size: BRACE_LEFT.size,
    outline: ({ width, height }) => ({
        kind: 'path',
        d: `${bracePath(11, height, false)} ${bracePath(width - 11, height, true)}`,
        open: true,
    }),
};

/** Points along an ellipse with radii alternating in and out: a bang. */
function starburst(width: number, height: number, spikes: number): Outline {
    const cx = width / 2;
    const cy = height / 2;
    const points: Array<readonly [number, number]> = [];
    for (let index = 0; index < spikes * 2; index += 1) {
        const angle = (Math.PI * index) / spikes;
        const scale = index % 2 === 0 ? 1 : 0.82;
        points.push([
            cx + Math.cos(angle) * cx * scale,
            cy + Math.sin(angle) * cy * scale,
        ]);
    }
    return polygon(points);
}

/** `bang` — a starburst around the label. */
const BANG: ShapeSpec = {
    size: ({ width, height }) => ({
        width: Math.max(width * Math.SQRT2 + 34, 92),
        height: Math.max(height * Math.SQRT2 + 30, 64),
    }),
    outline: ({ width, height }) => starburst(width, height, 14),
};

/** `cloud` — arcs bulging around the label box. */
const CLOUD: ShapeSpec = {
    size: ({ width, height }) => ({
        width: Math.max(width + 52, 104),
        height: Math.max(height + 40, 62),
    }),
    outline: ({ width, height }) => {
        const w = width;
        const h = height;
        return {
            kind: 'path',
            d: [
                `M ${w * 0.16} ${h * 0.82}`,
                `A ${w * 0.13} ${h * 0.2} 0 1 1 ${w * 0.12} ${h * 0.42}`,
                `A ${w * 0.18} ${h * 0.26} 0 1 1 ${w * 0.42} ${h * 0.2}`,
                `A ${w * 0.2} ${h * 0.28} 0 1 1 ${w * 0.74} ${h * 0.24}`,
                `A ${w * 0.15} ${h * 0.22} 0 1 1 ${w * 0.88} ${h * 0.6}`,
                `A ${w * 0.12} ${h * 0.18} 0 1 1 ${w * 0.7} ${h * 0.84}`,
                `A ${w * 0.4} ${h * 0.4} 0 0 1 ${w * 0.16} ${h * 0.82}`,
                'Z',
            ].join(' '),
        };
    },
};

/** `person` — head and shoulders, label underneath. */
const PERSON: ShapeSpec = {
    size: () => ({ width: 42, height: 46 }),
    outline: ({ width, height }) => {
        const headRadius = height * 0.23;
        return {
            kind: 'path',
            d: [
                `M 4 ${height}`,
                `C 4 ${height * 0.58} ${width - 4} ${height * 0.58} ${width - 4} ${height}`,
                'Z',
            ].join(' '),
            inner: ellipsePath(width / 2, headRadius + 2, headRadius, headRadius),
        };
    },
    textDy: 34,
};

/** `folder` — a rectangle with a tab over its top-left. */
const FOLDER: ShapeSpec = {
    size: ({ width, height }) => {
        const box = boxy()({ width, height });
        return { width: box.width, height: box.height + 12 };
    },
    outline: ({ width, height }) => ({
        kind: 'path',
        d: [
            'M 0 12 V 4 Q 0 0 4 0',
            `H ${width * 0.3}`,
            `L ${width * 0.38} 8`,
            `H ${width - 4}`,
            `Q ${width} 8 ${width} 12`,
            `V ${height} H 0 Z`,
        ].join(' '),
    }),
    textDy: 5,
};

/** `bucket` — an open top, sides tapering to a rounded bottom. */
const BUCKET: ShapeSpec = {
    size: ({ width, height }) => ({
        width: Math.max(width + 2 * PAD_X + 8, 76),
        height: Math.max(height + 2 * PAD_Y + 18, 60),
    }),
    outline: ({ width, height }) => {
        const ry = Math.min(10, height / 5);
        return {
            kind: 'path',
            d: [
                `M 0 ${ry}`,
                `A ${width / 2} ${ry} 0 0 1 ${width} ${ry}`,
                `L ${width - 12} ${height - 5}`,
                `Q ${width - 14} ${height} ${width - 19} ${height}`,
                'H 19',
                `Q 14 ${height} 12 ${height - 5}`,
                'Z',
            ].join(' '),
            inner: `M 0 ${ry} A ${width / 2} ${ry} 0 0 0 ${width} ${ry}`,
        };
    },
    textDy: 6,
};

/** `console` — a terminal window: title bar with its three dots. */
const CONSOLE: ShapeSpec = {
    size: ({ width, height }) => {
        const box = boxy(26)({ width, height });
        return { width: Math.max(box.width, 92), height: box.height + 16 };
    },
    outline: ({ width, height }) => ({
        kind: 'path',
        d: `M 6 0 H ${width - 6} Q ${width} 0 ${width} 6 V ${height - 6} Q ${width} ${height} ${width - 6} ${height} H 6 Q 0 ${height} 0 ${height - 6} V 6 Q 0 0 6 0 Z`,
        inner: [
            `M 0 16 H ${width}`,
            'M 8 8 a 2.4 2.4 0 1 0 0.01 0',
            'M 17 8 a 2.4 2.4 0 1 0 0.01 0',
            'M 26 8 a 2.4 2.4 0 1 0 0.01 0',
        ].join(' '),
    }),
    textDy: 8,
};

/** `browser` — the console's sibling with an address slot instead of dots. */
const BROWSER: ShapeSpec = {
    size: CONSOLE.size,
    outline: ({ width, height }) => ({
        kind: 'path',
        d: `M 4 0 H ${width - 4} Q ${width} 0 ${width} 4 V ${height - 4} Q ${width} ${height} ${width - 4} ${height} H 4 Q 0 ${height} 0 ${height - 4} V 4 Q 0 0 4 0 Z`,
        inner: [
            `M 0 16 H ${width}`,
            'M 8 8 a 2.4 2.4 0 1 0 0.01 0',
            `M 18 5.5 H ${width - 8} V 10.5 H 18 Z`,
        ].join(' '),
    }),
    textDy: 8,
};

/** Mermaid shape id → geometry. Unknown ids fall back to {@link RECT}. */
const SHAPES: Record<string, ShapeSpec> = {
    squareRect: RECT,
    rect: RECT,
    proc: RECT,
    process: RECT,
    rectangle: RECT,
    roundedRect: ROUNDED,
    rounded: ROUNDED,
    event: ROUNDED,
    stadium: STADIUM,
    terminal: STADIUM,
    pill: STADIUM,
    subroutine: SUBROUTINE,
    'fr-rect': SUBROUTINE,
    subproc: SUBROUTINE,
    subprocess: SUBROUTINE,
    'framed-rectangle': SUBROUTINE,
    cylinder: CYLINDER,
    cyl: CYLINDER,
    db: CYLINDER,
    database: CYLINDER,
    datastore: CYLINDER,
    'data-store': CYLINDER,
    circle: CIRCLE,
    circ: CIRCLE,
    doublecircle: DOUBLE_CIRCLE,
    'dbl-circ': DOUBLE_CIRCLE,
    'double-circle': DOUBLE_CIRCLE,
    ellipse: ELLIPSE,
    diamond: DIAMOND,
    diam: DIAMOND,
    decision: DIAMOND,
    question: DIAMOND,
    hexagon: HEXAGON,
    hex: HEXAGON,
    prepare: HEXAGON,
    lean_right: LEAN_RIGHT,
    'lean-r': LEAN_RIGHT,
    'lean-right': LEAN_RIGHT,
    'in-out': LEAN_RIGHT,
    lean_left: LEAN_LEFT,
    'lean-l': LEAN_LEFT,
    'lean-left': LEAN_LEFT,
    'out-in': LEAN_LEFT,
    trapezoid: TRAPEZOID,
    'trap-b': TRAPEZOID,
    priority: TRAPEZOID,
    'trapezoid-bottom': TRAPEZOID,
    inv_trapezoid: INV_TRAPEZOID,
    'trap-t': INV_TRAPEZOID,
    manual: INV_TRAPEZOID,
    'trapezoid-top': INV_TRAPEZOID,
    'inv-trapezoid': INV_TRAPEZOID,
    odd: ODD,
    text: TEXT_BLOCK,
    'notch-rect': NOTCH_RECT,
    card: NOTCH_RECT,
    'notched-rectangle': NOTCH_RECT,
    'lin-rect': LINED_RECT,
    'lined-rectangle': LINED_RECT,
    'lined-process': LINED_RECT,
    'lin-proc': LINED_RECT,
    'shaded-process': LINED_RECT,
    'st-rect': STACKED_RECT,
    procs: STACKED_RECT,
    processes: STACKED_RECT,
    'stacked-rectangle': STACKED_RECT,
    'tag-rect': TAGGED_RECT,
    'tagged-rectangle': TAGGED_RECT,
    'tag-proc': TAGGED_RECT,
    'tagged-process': TAGGED_RECT,
    'div-rect': DIVIDED_RECT,
    'div-proc': DIVIDED_RECT,
    'divided-rectangle': DIVIDED_RECT,
    'divided-process': DIVIDED_RECT,
    'win-pane': WINDOW_PANE,
    'internal-storage': WINDOW_PANE,
    'window-pane': WINDOW_PANE,
    'sl-rect': SLOPED_RECT,
    'manual-input': SLOPED_RECT,
    'sloped-rectangle': SLOPED_RECT,
    'bow-rect': BOW_RECT,
    'stored-data': BOW_RECT,
    'bow-tie-rectangle': BOW_RECT,
    fork: FORK,
    join: FORK,
    'sm-circ': SMALL_CIRCLE,
    start: SMALL_CIRCLE,
    'small-circle': SMALL_CIRCLE,
    'fr-circ': FRAMED_CIRCLE,
    stop: FRAMED_CIRCLE,
    'framed-circle': FRAMED_CIRCLE,
    'f-circ': FILLED_CIRCLE,
    junction: FILLED_CIRCLE,
    'filled-circle': FILLED_CIRCLE,
    'cross-circ': CROSSED_CIRCLE,
    summary: CROSSED_CIRCLE,
    'crossed-circle': CROSSED_CIRCLE,
    hourglass: HOURGLASS,
    collate: HOURGLASS,
    bolt: BOLT,
    'com-link': BOLT,
    'lightning-bolt': BOLT,
    tri: TRIANGLE,
    extract: TRIANGLE,
    triangle: TRIANGLE,
    'flip-tri': FLIPPED_TRIANGLE,
    'manual-file': FLIPPED_TRIANGLE,
    'flipped-triangle': FLIPPED_TRIANGLE,
    'notch-pent': NOTCHED_PENTAGON,
    'loop-limit': NOTCHED_PENTAGON,
    'notched-pentagon': NOTCHED_PENTAGON,
    flag: FLAG,
    'paper-tape': FLAG,
    doc: DOC,
    document: DOC,
    docs: DOCS,
    documents: DOCS,
    'st-doc': DOCS,
    'stacked-document': DOCS,
    'lin-doc': LINED_DOC,
    'lined-document': LINED_DOC,
    'tag-doc': TAGGED_DOC,
    'tagged-document': TAGGED_DOC,
    delay: DELAY,
    'half-rounded-rectangle': DELAY,
    'h-cyl': HORIZONTAL_CYLINDER,
    das: HORIZONTAL_CYLINDER,
    'horizontal-cylinder': HORIZONTAL_CYLINDER,
    'lin-cyl': LINED_CYLINDER,
    disk: LINED_CYLINDER,
    'lined-cylinder': LINED_CYLINDER,
    'curv-trap': CURVED_TRAPEZOID,
    'curved-trapezoid': CURVED_TRAPEZOID,
    display: CURVED_TRAPEZOID,
    brace: BRACE_LEFT,
    comment: BRACE_LEFT,
    'brace-l': BRACE_LEFT,
    'brace-r': BRACE_RIGHT,
    braces: BRACES,
    bang: BANG,
    cloud: CLOUD,
    person: PERSON,
    folder: FOLDER,
    directory: FOLDER,
    bucket: BUCKET,
    console: CONSOLE,
    browser: BROWSER,
};

export function getShapeSpec(shape: string): ShapeSpec {
    return SHAPES[shape] ?? RECT;
}
