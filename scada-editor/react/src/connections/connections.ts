import type { LinkRecord } from '@joint/react-plus';
import type { Layer } from '../plant/layers';
import { isLineWidth, type CellStyle, type LineWidth } from '../shapes/style';
import type { ColorField, PaletteGroup, ShapeData } from '../shapes/types';

/*
 * The connections of the diagram: pipes, wires, signal lines, arrows and conveyors. They are native links: their
 * look (markup, attributes, router and connector) is computed from their data (kind, style, routing, arrowheads,
 * what the plant shows) whenever the data is written - see `withConnectionLook()`.
 */

/** How a link goes through its vertices. */
export type Routing = 'straight' | 'orthogonal' | 'smooth';

/** An arrowhead of an arrow. */
export type Arrowhead = 'none' | 'arrow' | 'open' | 'circle' | 'diamond';

/** The width of a link as the user sets it (a pipe and an arrow call it their size). */
export type { LineWidth };

const ROUTINGS: readonly Routing[] = ['straight', 'orthogonal', 'smooth'];
const ARROWHEAD_NAMES: readonly Arrowhead[] = ['none', 'arrow', 'open', 'circle', 'diamond'];

/** Whether a value is a routing. */
export const isRouting = (value: unknown): value is Routing => ROUTINGS.some((routing) => routing === value);
/** Whether a value is an arrowhead. */
export const isArrowhead = (value: unknown): value is Arrowhead => ARROWHEAD_NAMES.some((arrowhead) => arrowhead === value);

/** How much each line width scales the strokes. */
export const LINE_WIDTH_SCALES: Record<LineWidth, number> = { thin: 0.6, normal: 1, thick: 1.5 };

/** The kinds of connections. */
export type ConnectionKind = 'Pipe' | 'Wire' | 'SignalLine' | 'Arrow' | 'Conveyor';

/** The data of a connection: its kind, its style, how it goes, its arrowheads, what the plant shows on it. */
export interface ConnectionData extends ShapeData {
    readonly kind: ConnectionKind;
    readonly routing?: Routing;
    readonly sourceArrowhead?: Arrowhead;
    readonly targetArrowhead?: Arrowhead;
    /** The medium flows through it (a pipe) or it is live (a wire): set by the plant during a run. */
    readonly flowing?: boolean;
}

/** A kind of connection: its name, place in the palette, layer, ID series and the colors the user sets. */
export interface ConnectionSpec {
    readonly kind: ConnectionKind;
    readonly title: string;
    readonly description: string;
    readonly group: PaletteGroup;
    readonly layer: Layer;
    readonly routing: Routing;
    /** The start of its IDs; `null` - none (only a conveyor is a part of the plant). */
    readonly tagPrefix: string | null;
    readonly colorField: ColorField | null;
    readonly outlineField: ColorField | null;
    readonly accentField: ColorField | null;
    /** The name of its width in the inspector: a size (small to large), a thickness, or none to set. */
    readonly lineWidth: 'size' | 'thickness' | null;
    /** Its plant values when it is created. */
    readonly defaults?: Partial<ConnectionData>;
}

const PIPE_COLOR = 'var(--shape-pipe)';
const PIPE_OUTLINE = 'var(--shape-pipe-outline)';
const LABEL_COLOR = 'var(--shape-label)';
const LINE_COLOR: ColorField = { key: 'color', isPart: true };

/** The connections, as the palette lists them (in their groups). */
export const CONNECTIONS: Record<ConnectionKind, ConnectionSpec> = {
    Pipe: {
        kind: 'Pipe',
        title: 'Pipe',
        description: 'Carries the liquid or the gas between the equipment. Connect its ends to the pipe stubs of the equipment (or to the sides of the elements without stubs).',
        group: 'Piping',
        layer: 'pipes',
        routing: 'orthogonal',
        tagPrefix: null,
        colorField: { key: 'color', isPart: true, defaultValue: PIPE_COLOR },
        outlineField: { key: 'outline', isPart: true, defaultValue: PIPE_OUTLINE },
        accentField: null,
        lineWidth: 'size',
    },
    Wire: {
        kind: 'Wire',
        title: 'Wire',
        description: 'Connects the terminals of the electrical shapes. Live (in color) while the circuit is energized.',
        group: 'Electrical',
        layer: 'pipes',
        routing: 'orthogonal',
        tagPrefix: null,
        colorField: { ...LINE_COLOR, defaultValue: 'var(--shape-wire)' },
        outlineField: null,
        accentField: null,
        lineWidth: 'thickness',
    },
    SignalLine: {
        kind: 'SignalLine',
        title: 'Signal Line',
        description: 'Connects an instrument (a transmitter) to what it measures or controls.',
        group: 'Instruments',
        layer: 'instruments',
        routing: 'straight',
        tagPrefix: null,
        colorField: { ...LINE_COLOR, defaultValue: 'var(--shape-signal-line)' },
        outlineField: null,
        accentField: null,
        lineWidth: null,
    },
    Arrow: {
        kind: 'Arrow',
        title: 'Arrow',
        description: 'Points at a part of the plant (from a note, ...): an arrowhead at either end and its color set in the inspector.',
        group: 'Instruments',
        layer: 'instruments',
        routing: 'straight',
        tagPrefix: null,
        colorField: { ...LINE_COLOR, defaultValue: LABEL_COLOR },
        outlineField: null,
        accentField: null,
        lineWidth: 'size',
        defaults: { sourceArrowhead: 'none', targetArrowhead: 'arrow' },
    },
    Conveyor: {
        kind: 'Conveyor',
        title: 'Conveyor',
        description: 'A belt carrying bulk material between the equipment: straight, inclined or turning. Its cleats move while it runs (Power in the inspector).',
        group: 'Bulk Handling',
        layer: 'pipes',
        routing: 'straight',
        tagPrefix: 'CNV',
        colorField: { key: 'color', isPart: true, defaultValue: 'var(--shape-belt)' },
        outlineField: { key: 'outline', isPart: true, defaultValue: 'var(--shape-belt-outline)' },
        accentField: { key: 'accent', isPart: true, defaultValue: 'var(--shape-belt-cleat)' },
        lineWidth: null,
        defaults: { plant: { power: 1 } },
    },
};

/** Whether the kind is a connection's. */
export function isConnectionKind(kind: unknown): kind is ConnectionKind {
    return typeof kind === 'string' && Object.hasOwn(CONNECTIONS, kind);
}

/** Whether the data is a connection's. */
export function isConnectionData(data: unknown): data is ConnectionData {
    return typeof data === 'object' && data !== null && 'kind' in data && isConnectionKind(data.kind);
}

/** The pattern of the cleats across a conveyor's belt: their length along it and the gap after each. */
export const CLEAT_PATTERN = [3, 13] as const;
/** The widths of the strokes at the normal size. */
const PIPE_LINE = 10;
const PIPE_FLOW = 3;
const WIRE_LINE = 3;
const ARROW_LINE = 2;
const BELT_WIDTH = 14;
const BELT_OUTLINE_WIDTH = 20;

/** The markers of the arrowheads, at the start of the line (the one at the end turned around). */
const ARROWHEADS: Record<Exclude<Arrowhead, 'none'>, Record<string, string | number>> = {
    arrow: { type: 'path', d: 'M -12 0 L 0 -6 L 0 6 Z', 'stroke-width': 1, 'stroke-linejoin': 'round' },
    open: { type: 'path', d: 'M 12 -6 L 0 0 L 12 6', fill: 'none', 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' },
    circle: { type: 'circle', cx: -4, r: 4, 'stroke-width': 1 },
    diamond: { type: 'path', d: 'M -14 0 L -7 -5 L 0 0 L -7 5 Z', 'stroke-width': 1, 'stroke-linejoin': 'round' },
};

// The straight and orthogonal links have rounded corners.
const ROUNDED_CONNECTOR = { name: 'straight', args: { cornerType: 'cubic', cornerRadius: 20, cornerPreserveAspectRatio: true } } as const;

/** The router and the connector of a routing (the curve leaves the ends outwards: along the stub). */
function routeOf(routing: Routing): Pick<LinkRecord, 'router' | 'connector'> {
    switch (routing) {
        case 'straight':
            return { router: { name: 'normal' }, connector: ROUNDED_CONNECTOR };
        case 'orthogonal':
            return { router: { name: 'rightAngle', args: { useVertices: true } }, connector: ROUNDED_CONNECTOR };
        case 'smooth':
            return { router: { name: 'normal' }, connector: { name: 'curve', args: { sourceDirection: 'outwards', targetDirection: 'outwards' } } };
    }
}

/** A stroke width at the size of the link, to half a pixel. */
function scaled(width: number, style: CellStyle | undefined): number {
    const scale = isLineWidth(style?.lineWidth) ? LINE_WIDTH_SCALES[style.lineWidth] : 1;
    return Math.round(width * scale * 2) / 2;
}

// An invisible wide stroke that makes a thin link easy to grab.
const wrapper = (width: number) => ({ connection: true, fill: 'none', stroke: 'transparent', strokeWidth: width, strokeLinejoin: 'round', strokeLinecap: 'round' });

const path = (selector: string) => ({ tagName: 'path', selector });

/** The look of the connection: its markup, attributes, router and connector, from its data. */
export function connectionLookOf(data: ConnectionData): Pick<LinkRecord, 'markup' | 'attrs' | 'router' | 'connector'> {
    const spec = CONNECTIONS[data.kind];
    const style = data.style;
    const route = routeOf(isRouting(data.routing) ? data.routing : spec.routing);
    const flowing = data.flowing === true ? ' is-flowing' : '';
    switch (data.kind) {
        case 'Pipe': {
            const line = scaled(PIPE_LINE, style);
            const outlineWidth = style?.outlineWidth === 'thin' ? 1 : style?.outlineWidth === 'thick' ? 3 : style?.outlineWidth === 'normal' ? 2 : undefined;
            return {
                ...route,
                markup: [path('wrapper'), path('outline'), path('line'), path('flow')],
                attrs: {
                    wrapper: wrapper(40),
                    outline: {
                        connection: true,
                        fill: 'none',
                        stroke: style?.outline || PIPE_OUTLINE,
                        // Its line and a border on each side as wide as the outlines of the shapes (of the diagram's style).
                        style: { strokeWidth: `calc(${line}px + 2 * ${outlineWidth === undefined ? 'var(--style-outline-px, 2px)' : `${outlineWidth}px`})` },
                        strokeLinejoin: 'round',
                        // Reaching under the element it connects to: no gap at a slanted or round side.
                        strokeLinecap: 'square',
                    },
                    line: { connection: true, fill: 'none', stroke: style?.color || PIPE_COLOR, strokeWidth: line, strokeLinejoin: 'round', strokeLinecap: 'square' },
                    // The dashes of the flowing liquid: shown and moving in run mode while it flows.
                    flow: { connection: true, fill: 'none', class: `scada-flow${flowing}`, stroke: '#ffffff', strokeWidth: scaled(PIPE_FLOW, style), strokeDasharray: '6 18', strokeLinecap: 'round', pointerEvents: 'none' },
                },
            };
        }
        case 'Wire':
            return {
                ...route,
                markup: [path('wrapper'), path('line')],
                attrs: {
                    wrapper: wrapper(20),
                    line: { connection: true, fill: 'none', class: `scada-wire${data.flowing === true ? ' is-live' : ''}`, stroke: style?.color || 'var(--shape-wire)', strokeWidth: scaled(WIRE_LINE, style), strokeLinejoin: 'round', strokeLinecap: 'round', pointerEvents: 'none' },
                },
            };
        case 'SignalLine':
            return {
                ...route,
                markup: [path('wrapper'), path('line')],
                attrs: {
                    wrapper: wrapper(20),
                    line: { connection: true, fill: 'none', stroke: style?.color || 'var(--shape-signal-line)', strokeWidth: 1.5, strokeDasharray: '4 3', pointerEvents: 'none' },
                },
            };
        case 'Arrow': {
            const color = style?.color || LABEL_COLOR;
            const scale = LINE_WIDTH_SCALES[isLineWidth(style?.lineWidth) ? style.lineWidth : 'normal'];
            const marker = (arrowhead: unknown, isTurned: boolean) => {
                if (!isArrowhead(arrowhead) || arrowhead === 'none') {
                    return undefined;
                }
                return { ...ARROWHEADS[arrowhead], stroke: color, fill: ARROWHEADS[arrowhead].fill ?? color, transform: `${isTurned ? 'rotate(180) ' : ''}scale(${scale})` };
            };
            return {
                ...route,
                markup: [path('wrapper'), path('line')],
                attrs: {
                    wrapper: wrapper(20),
                    line: {
                        connection: true,
                        fill: 'none',
                        stroke: color,
                        strokeWidth: scaled(ARROW_LINE, style),
                        strokeLinejoin: 'round',
                        strokeLinecap: 'round',
                        pointerEvents: 'none',
                        sourceMarker: marker(data.sourceArrowhead ?? 'none', false),
                        targetMarker: marker(data.targetArrowhead ?? 'arrow', true),
                    },
                },
            };
        }
        case 'Conveyor': {
            const isRunning = data.plant?.power ? ' is-running' : '';
            return {
                ...route,
                markup: [path('wrapper'), path('outline'), path('belt'), path('cleats')],
                attrs: {
                    wrapper: wrapper(40),
                    outline: { connection: true, fill: 'none', stroke: style?.outline || 'var(--shape-belt-outline)', strokeWidth: BELT_OUTLINE_WIDTH, strokeLinejoin: 'round', strokeLinecap: 'square' },
                    belt: { connection: true, fill: 'none', stroke: style?.color || 'var(--shape-belt)', strokeWidth: BELT_WIDTH, strokeLinejoin: 'round', strokeLinecap: 'square' },
                    cleats: { connection: true, fill: 'none', class: `scada-cleats${isRunning}`, stroke: style?.accent || 'var(--shape-belt-cleat)', strokeWidth: BELT_WIDTH, strokeDasharray: CLEAT_PATTERN.join(' '), pointerEvents: 'none' },
                },
            };
        }
    }
}

/** The record of a connection with its look computed from its data: every write of a connection's data goes through it. */
export function withConnectionLook<T extends { readonly data?: unknown }>(record: T): T {
    return isConnectionData(record.data) ? { ...record, ...connectionLookOf(record.data) } : record;
}
