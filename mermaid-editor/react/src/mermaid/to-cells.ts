import { linkMarkerArrow, linkMarkerCircle, linkMarkerCross } from '@joint/react-plus';
import type { CellRecord, ElementRecord, LinkLabel, LinkMarker, LinkRecord } from '@joint/react-plus';
import type { CSSProperties } from 'react';
import type { FlowArrow, FlowDirection, FlowGraph, FlowShape } from './types';

/** Inline styling from a Mermaid `style` / `classDef` directive. */
export interface NodeStyle {
    readonly body?: CSSProperties;
    readonly text?: CSSProperties;
}

/** Data carried by every element cell; `renderElement` receives exactly this. */
export interface NodeData {
    readonly label: string;
    readonly shape: FlowShape;
    readonly style?: NodeStyle;
    /**
     * Whether the node's own `style` line sets a fill. A fill inherited from a
     * `classDef` is not the node's to remove, so the toolbar's clear control
     * uses this to know when it would do nothing.
     */
    readonly hasOwnFill?: boolean;
}

/**
 * Mermaid's `color` styles the label; everything else styles the shape. Both
 * `style x fill:#eee` and `classDef` arrive as the same `"prop:value"` strings,
 * so one pass handles both.
 */
const TEXT_PROPERTIES = new Set(['color']);

/**
 * Label colours for a node that carries its own `fill`. Deliberately fixed
 * rather than themed: the text has to be readable against *that* fill, which
 * the author picked, in either theme.
 */
const DARK_LABEL = '#1f2430';
const LIGHT_LABEL = '#f8fafc';

/** Parses `#abc`, `#aabbcc` and `rgb()/rgba()`; anything else gives up. */
function parseColor(value: string): [number, number, number] | null {
    const hex = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(value);
    if (hex) {
        const digits = hex[1];
        const full = digits.length === 3
            ? [...digits].map((digit) => digit + digit).join('')
            : digits;
        return [0, 2, 4].map((at) => Number.parseInt(full.slice(at, at + 2), 16)) as
            [number, number, number];
    }
    const rgb = /^rgba?\(([^)]+)\)$/i.exec(value);
    if (!rgb) return null;
    const channels = rgb[1].split(/[\s,/]+/).filter(Boolean).slice(0, 3).map(Number);
    if (channels.length !== 3 || channels.some((channel) => !Number.isFinite(channel))) return null;
    return channels as [number, number, number];
}

/**
 * A readable label colour for a given background, by WCAG relative luminance.
 *
 * A `style` directive routinely sets `fill` and leaves `color` alone. Without
 * this the label would keep the theme default, so a pale fill would carry
 * near-white text in dark mode — invisible.
 * @param fill - The shape's background colour.
 * @returns A label colour, or `null` when the fill cannot be parsed.
 */
function readableLabel(fill: string): string | null {
    const rgb = parseColor(fill.trim());
    if (!rgb) return null;
    const [red, green, blue] = rgb.map((channel) => {
        const ratio = channel / 255;
        return ratio <= 0.039_28 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
    });
    const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    return luminance > 0.45 ? DARK_LABEL : LIGHT_LABEL;
}

/** `stroke-width` → `strokeWidth`, since React wants camelCase style keys. */
function toCamelCase(property: string): string {
    return property.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

/** Splits `"prop:value"` declarations into shape styles and a label colour. */
function resolveLayer(declarations: readonly string[]) {
    const body: Record<string, string> = {};
    let color: string | undefined;

    for (const declaration of declarations) {
        const separator = declaration.indexOf(':');
        if (separator === -1) continue;
        const property = declaration.slice(0, separator).trim().toLowerCase();
        const value = declaration.slice(separator + 1).trim();
        if (property === '' || value === '') continue;
        // Mermaid's `color` is the label colour, which on an SVG `<text>` is
        // `fill`; anything else describes the shape.
        if (TEXT_PROPERTIES.has(property)) color = value;
        else body[toCamelCase(property)] = value;
    }

    return { body, color };
}

/**
 * Merge a node's `classDef` styling with its own `style` line.
 *
 * Per-property, the node's own line wins. The label colour needs more care
 * than that: a class picks its `color` to suit the class's own `fill`, so when
 * the node overrides the fill and inherits only the colour, that pairing is no
 * longer the author's intent — a dark `style` fill under a class's dark `color`
 * comes out unreadable. In that case the colour is derived from the fill that
 * actually won instead.
 * @param classDeclarations - Declarations from `classDef`, via `class`.
 * @param ownDeclarations - Declarations from the node's own `style` line.
 * @returns Styles to apply, or `undefined` when there are none.
 */
function toNodeStyle(
    classDeclarations: readonly string[],
    ownDeclarations: readonly string[]
): NodeStyle | undefined {
    const fromClass = resolveLayer(classDeclarations);
    const own = resolveLayer(ownDeclarations);
    const body = { ...fromClass.body, ...own.body };

    let color = own.color;
    if (color === undefined && own.body.fill === undefined) color = fromClass.color;
    if (color === undefined && body.fill !== undefined) {
        color = readableLabel(body.fill) ?? undefined;
    }

    const style: NodeStyle = {
        ...(Object.keys(body).length > 0 ? { body } : {}),
        ...(color === undefined ? {} : { text: { fill: color }}),
    };
    // Undefined rather than an empty object, so an unstyled node's `data` stays
    // identical between parses and nothing re-renders needlessly.
    return Object.keys(style).length > 0 ? style : undefined;
}

/** Data carried by every link cell. */
export interface EdgeData {
    /** Minimum rank distance, honored by the directed-graph layout. */
    readonly minLen: number;
}

export type MermaidCell = CellRecord<NodeData, EdgeData>;

/**
 * Markers are hoisted: each factory builds a fresh markup object, and creating
 * them per link would defeat JointJS' attribute diffing.
 *
 * `context-stroke` makes each arrow head take the colour of the path that
 * references it, rather than baking one in. JointJS keeps a single `<marker>`
 * definition shared by every link with matching attributes, so a hard-coded
 * colour could not follow a link whose stroke changes — which is exactly what
 * happens when a link is selected and CSS repaints it.
 */
const CONTEXT_COLOR = 'context-stroke';
const MARKERS: Record<FlowArrow, LinkMarker> = {
    none: 'none',
    arrow_point: linkMarkerArrow({ fill: CONTEXT_COLOR, stroke: CONTEXT_COLOR }),
    arrow_circle: linkMarkerCircle({ fill: 'none', stroke: CONTEXT_COLOR }),
    arrow_cross: linkMarkerCross({ stroke: CONTEXT_COLOR }),
};

/**
 * Which axis a link end attaches on, per flowchart direction: the top/bottom
 * sides for a vertical chart, the left/right sides for a horizontal one.
 *
 * Deliberately the axis rather than a directional pair like `'bottom-top'`.
 * A pair pins the source to one side and the target to the opposite one no
 * matter where they sit, which is wrong for the back-edges a flowchart is full
 * of — a retry loop running up the page would still leave from the bottom.
 * `'vertical'` lets each end pick the side facing the other one.
 */
const ANCHOR_MODE: Record<FlowDirection, string> = {
    TB: 'vertical',
    BT: 'vertical',
    LR: 'horizontal',
    RL: 'horizontal',
};

/**
 * The anchor rides on the link end rather than on the paper's `defaultAnchor`,
 * so a change of direction is just a new cell record and JointJS re-routes on
 * the next sync — no imperative nudge of the link views.
 *
 * `useModelGeometry` resolves the side from the cell's model bbox instead of
 * the magnet's rendered box, which also means it never reads a shape that React
 * has not committed its measured size to yet.
 */
function endAnchor(mode: string) {
    return { name: 'midSide', args: { mode, useModelGeometry: true, rotate: true }};
}

/**
 * One source of truth for the link colour.
 *
 * It has to be the `style.color` property rather than a CSS rule on the line:
 * the arrow heads are separate SVG markers, and `linkStyle` paints them from
 * `color`, falling back to JointJS' own `--jj-link-color` when it is unset. A
 * CSS-only line colour would leave the heads on that fallback.
 */
const LINK_COLOR = 'var(--link-stroke)';

/** Soften the corners where dagre's vertices turn the line. */
const CONNECTOR = { name: 'rounded', args: { radius: 8 }};

const LABEL_BASE: Omit<LinkLabel, 'text'> = {
    position: 0.5,
    fontSize: 12,
    className: 'mermaid-link-label-text',
    backgroundClassName: 'mermaid-link-label-body',
    backgroundBorderRadius: 3,
    backgroundPadding: { horizontal: 10, vertical: 6 },
};

/**
 * Convert a parsed Mermaid flowchart into JointJS cell records.
 *
 * Elements are emitted with **no `position` and no `size`**: each shape measures
 * its own label and reports the size back, and the directed-graph layout then
 * assigns positions. See `components/diagram.tsx`.
 * @param flow - The parsed flowchart.
 * @returns Cells ready to hand to `GraphProvider`.
 */
export function toCells(flow: FlowGraph): MermaidCell[] {
    const elements: Array<ElementRecord<NodeData>> = flow.nodes.map((node) => {
        const style = toNodeStyle(node.classStyles, node.styles);
        const hasOwnFill = node.styles.some((entry) => /^\s*fill\s*:/i.test(entry));
        return {
            id: node.id,
            type: 'element',
            data: {
                label: node.label,
                shape: node.shape,
                ...(style ? { style } : {}),
                ...(hasOwnFill ? { hasOwnFill } : {}),
            },
        };
    });

    const anchor = endAnchor(ANCHOR_MODE[flow.direction]);
    const links: Array<LinkRecord<EdgeData>> = flow.edges.map((edge) => ({
        id: edge.id,
        type: 'link',
        // Behind the elements, so a link never crosses over a node body.
        z: -1,
        // No `magnet`: the `midSide` anchor below resolves from the model bbox,
        // and its attachment points already land on the outline of every shape
        // here (a diamond's mid-side *is* its vertex). Pointing the ends at the
        // rendered body instead measurably changed nothing.
        source: { id: edge.source, anchor },
        target: { id: edge.target, anchor },
        data: { minLen: edge.minLen },
        connector: CONNECTOR,
        style: {
            color: LINK_COLOR,
            className: 'mermaid-link-line',
            wrapperClassName: 'mermaid-link-wrapper',
            linejoin: 'round',
            linecap: 'round',
            width: edge.stroke === 'thick' ? 3.5 : 2,
            ...(edge.stroke === 'dotted' ? { dasharray: '6,5' } : {}),
            sourceMarker: MARKERS[edge.sourceArrow],
            targetMarker: MARKERS[edge.targetArrow],
        },
        ...(edge.label === '' ? {} : { labelMap: { main: { ...LABEL_BASE, text: edge.label }}}),
    }));

    return [...elements, ...links];
}
