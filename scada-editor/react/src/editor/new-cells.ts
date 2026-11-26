import type { CellId, ElementRecord, LinkRecord } from '@joint/react-plus';
import { CONNECTIONS, withConnectionLook, type ConnectionData, type ConnectionKind } from '../connections/connections';
import { portMapOf, shapePortsOf } from '../shapes/geometry';
import type { ShapeData, ShapeSpec } from '../shapes/types';

// The IDs of a series start here, ISA style: P-101, P-102, ...
const FIRST_TAG_NUMBER = 101;
// A new link from the palette: this long, horizontal.
const NEW_LINK_LENGTH = 120;

/** The next ID of a series: after the highest one used, `P-103` after `P-101` and `P-102`; `P-101` first. */
export function nextTag(prefix: string, usedTags: Iterable<string>): string {
    const start = `${prefix}-`;
    let highest: number | null = null;
    for (const tag of usedTags) {
        const number = tag.slice(start.length);
        if (tag.startsWith(start) && /^\d+$/.test(number)) {
            highest = Math.max(highest ?? 0, Number(number));
        }
    }
    return `${start}${highest === null ? FIRST_TAG_NUMBER : highest + 1}`;
}

/** The series of an ID (the text before its number: `FT-101` -> `FT`); none if it has no number. */
export function seriesOf(tag: string): string | null {
    return tag.match(/^(.*?)-?\d+$/)?.[1] || null;
}

/** A new element of the kind, with its defaults, at its size; its ID when it gets one. */
export function createShape(
    spec: ShapeSpec,
    options: { readonly id?: CellId; readonly position?: { readonly x: number; readonly y: number }; readonly tag?: string; readonly data?: Partial<ShapeData> } = {},
): ElementRecord<ShapeData> {
    const data: ShapeData = {
        ...spec.defaults,
        ...options.data,
        kind: spec.kind,
        ...(options.tag ? { tag: options.tag } : {}),
    };
    return {
        ...(options.id === undefined ? {} : { id: options.id }),
        type: 'element',
        position: options.position ?? { x: 0, y: 0 },
        size: spec.size,
        layer: spec.layer,
        portMap: portMapOf(shapePortsOf(spec, data, spec.size)),
        data,
    };
}

/** A new connection of the kind from the point, both ends free; with its ID when it gets one (a conveyor). */
export function createConnection(
    kind: ConnectionKind,
    options: { readonly id?: CellId; readonly position?: { readonly x: number; readonly y: number }; readonly tag?: string } = {},
): LinkRecord<ConnectionData> {
    const spec = CONNECTIONS[kind];
    const { x, y } = options.position ?? { x: 0, y: 0 };
    const data: ConnectionData = { ...spec.defaults, kind, ...(options.tag ? { tag: options.tag } : {}) };
    return withConnectionLook({
        ...(options.id === undefined ? {} : { id: options.id }),
        type: 'link',
        source: { x, y },
        target: { x: x + NEW_LINK_LENGTH, y },
        layer: spec.layer,
        data,
    });
}
