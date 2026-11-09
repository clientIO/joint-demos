import type { CellId, LinkRecord } from '@joint/react-plus';
import { CATALOG, portsOf } from '../shapes/catalog';
import type { Layer } from './layers';
import type { EquipmentData, EquipmentKind, EquipmentRecord, Medium, PipeRecord } from './model';

// The tags of a series start here, ISA style: P-101, P-102, ...
const FIRST_TAG_NUMBER = 101;

/** A new element of a kind, at its size, its ports at the ends of its stubs and terminals. */
export function createEquipment(
    kind: EquipmentKind,
    tag: string,
    position = { x: 0, y: 0 },
    data: Partial<EquipmentData> = {},
): EquipmentRecord {
    const spec = CATALOG[kind];
    return {
        type: 'element',
        id: tag,
        layer: (spec.group === 'Instruments' ? 'instruments' : 'cells') satisfies Layer,
        position,
        size: { width: spec.width, height: spec.height },
        portMap: portsOf(spec),
        data: { kind, tag, name: spec.name, active: false, ...data },
    };
}

// A pipe as the TypeScript SCADA editor draws it: a dark outline, the line in
// the color of the medium over it, and the flow (white dashes) over the line,
// shown and moving while the medium flows (see the pipes section of `index.css`).
const PIPE_MARKUP = [
    { tagName: 'path', selector: 'wrapper' },
    { tagName: 'path', selector: 'outline' },
    { tagName: 'path', selector: 'line' },
    { tagName: 'path', selector: 'flow' },
];

type PipeLook = Pick<LinkRecord, 'markup' | 'attrs'>;

/** The markup and attributes of a pipe (a wire for `power`), flowing or still. */
export function pipeLook(medium: Medium, isFlowing = false): PipeLook {
    const isWire = medium === 'power';
    const state = isFlowing ? ' is-flowing' : '';
    return {
        markup: PIPE_MARKUP,
        attrs: {
            wrapper: { connection: true, fill: 'none', stroke: 'transparent', strokeWidth: 24, strokeLinejoin: 'round' },
            outline: { connection: true, fill: 'none', class: `pipe-outline${state}`, strokeWidth: isWire ? 0 : 14, strokeLinejoin: 'round', strokeLinecap: 'square' },
            line: { connection: true, fill: 'none', class: `pipe-line pipe-${medium}${state}`, strokeWidth: isWire ? 3 : 10, strokeLinejoin: 'round', strokeLinecap: 'square' },
            flow: { connection: true, fill: 'none', class: `pipe-flow${state}`, strokeWidth: isWire ? 2 : 3, strokeDasharray: isWire ? '4 10' : '6 18', strokeLinecap: 'round', pointerEvents: 'none' },
        },
    };
}

interface PipeEnd {
    readonly id: CellId;
    readonly port: string;
}

/** A pipe (or a wire, for `power`) between two ports, in the pipes layer. */
export function createPipe(id: string, source: PipeEnd, target: PipeEnd, medium: Medium): PipeRecord {
    return {
        type: 'link',
        id,
        layer: 'pipes' satisfies Layer,
        source,
        target,
        ...pipeLook(medium),
        data: { medium },
    };
}

/** The next free tag of a kind's series: `P-101`, `P-102`, ... */
export function nextTag(kind: EquipmentKind, usedTags: ReadonlySet<string>): string {
    const prefix = CATALOG[kind].tagPrefix;
    for (let number = FIRST_TAG_NUMBER; ; number++) {
        const tag = `${prefix}-${number}`;
        if (!usedTags.has(tag)) {
            return tag;
        }
    }
}
