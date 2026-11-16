// How each link looks, drawn by JointJS itself (native link markup, `attrs`
// and `labels`), never by React.
//
// The look is computed from the derived model (nets, bundles, findings, the
// operating point) and the UI state (trace, live mode) and laid over the cells
// the store holds, right before they go to `<Diagram cells>`. It is never
// stored: the document cells keep only what the user edits and what the graph
// writes (routes), so a theme or look change in code always applies.
//
// Colors come from CSS: the link root carries `data-iface` (and the trace /
// finding / live state as `data-*`), and index.css maps those onto the line.

import { linkStyle, type LinkLabel, type LinkRecord } from '@joint/react-plus';
import { IFACE_LABEL, type InterfaceKind } from '@/model/catalog';
import type { NetIndex } from '@/model/nets';
import type { OperatingPoint } from '@/model/operating';
import type { FindingSeverity } from '@/model/validation';
import { formatVolts } from '@/model/validation';
import type { BundleIndex } from './arch-cells';
import { isBundleCell, isBundleWireCell, isWireCell, type Cell } from './cell-data';

/** The derived model and UI state a link's look depends on. */
export interface LookContext {
  readonly nets: NetIndex;
  readonly bundles: BundleIndex;
  readonly operating: OperatingPoint;
  readonly flags: ReadonlyMap<string, FindingSeverity>;
  /** The traced net's wires and bundles, or null while nothing is traced. */
  readonly trace: { readonly wires: ReadonlySet<string>; readonly bundles: ReadonlySet<string> } | null;
  readonly liveMode: boolean;
}

/** One link's look. */
interface Look {
  readonly iface: InterfaceKind;
  readonly name: string;
  readonly width: number;
  readonly flag: FindingSeverity | undefined;
  /** Live-mode motion: energy flow on power, bus activity on protocol links. */
  readonly live: 'flow' | 'activity' | undefined;
  readonly labels: Record<string, LinkLabel>;
}

/** Shared style of every net / bundle label (index.css owns the colors). */
const LABEL_STYLE: Partial<LinkLabel> = {
    className: 'esd-wire-label',
    backgroundOpacity: 0,
    offset: -8,
};

/** The twisted-pair "eye" badging differential nets: a lens, not an ✗ (that
 * would read as a no-connect mark). Drawn as a label's background shape. */
const DIFFERENTIAL_BADGE: LinkLabel = {
    text: '',
    position: 0.3,
    offset: -10,
    backgroundShape: 'M -9 0 C -4 -6 4 -6 9 0 C 4 6 -4 6 -9 0',
    backgroundClassName: 'esd-diff-pair',
};

function liveMotion(context: LookContext, iface: InterfaceKind, volts: number | undefined): Look['live'] {
    if (!context.liveMode) return undefined;
    if (iface === 'power') return (volts ?? 0) > 0 ? 'flow' : undefined;
    return iface === 'gnd' || iface === 'gpio' ? undefined : 'activity';
}

/** A schematic wire, or one member of an expanded bundle: named after its net. */
function wireLook(context: LookContext, wireId: string): Look {
    const net = context.nets.byWire.get(wireId);
    const iface = net?.iface ?? 'gpio';
    const volts = net === undefined ? undefined : context.operating.netVolts.get(net.id);
    const wire = net?.wires.find((candidate) => candidate.id === wireId);
    // A plain net name shows once per net, on its first wire (the schematic
    // convention); a label that JOINS wire groups shows on every wire that
    // carries it, with a chevron, since it is a live connection point.
    const joined = net?.labelJoined === true && wire?.label !== undefined;
    const showName = net !== undefined && (joined || net.wires[0]?.id === wireId);
    const labels: Record<string, LinkLabel> = {};
    if (showName) {
        const voltage = context.liveMode && volts !== undefined && volts > 0 ? ` · ${formatVolts(volts)}` : '';
        labels.name = {
            text: `${joined ? '› ' : ''}${net.name}${voltage}`,
            position: wire?.labelAt ?? 0.5,
        };
        if (iface === 'rs485' || iface === 'can') labels.pair = DIFFERENTIAL_BADGE;
    }
    return {
        iface,
        name: `${net?.name ?? 'Unnamed'} wire, ${IFACE_LABEL[iface]}`,
        width: iface === 'power' ? 2.4 : 1.6,
        flag: context.flags.get(wireId),
        live: liveMotion(context, iface, volts),
        labels,
    };
}

/** A collapsed architecture bundle: its interface, label and signal count. */
function bundleLook(context: LookContext, bundleId: string): Look | undefined {
    const bundle = context.bundles.bundles.find((candidate) => candidate.id === bundleId);
    if (bundle === undefined) return undefined;
    const count = bundle.wireIds.length;
    const firstWire = bundle.wireIds[0];
    const net = firstWire === undefined ? undefined : context.nets.byWire.get(firstWire);
    const volts = bundle.iface === 'power' && net !== undefined ? context.operating.netVolts.get(net.id) : undefined;
    const voltage = context.liveMode && volts !== undefined && volts > 0 ? ` · ${formatVolts(volts)}` : '';
    return {
        iface: bundle.iface,
        name: `${bundle.label} bundle${count > 1 ? `, ${count} signals` : ''}`,
        width: count > 1 ? 3.5 : 2,
        flag: context.flags.get(bundleId),
        live: liveMotion(context, bundle.iface, volts),
        labels: { name: { text: `${bundle.label}${count > 1 ? ` ×${count}` : ''}${voltage}` }},
    };
}

/** The native `attrs` and `labels` for a look: one `attrs` object, since a
 * record carrying the `style` shorthand has its `attrs` ignored. */
function applyLook(cell: Cell, look: Look, isTraced: boolean, isTracing: boolean): Cell {
    const attrs: NonNullable<LinkRecord['attrs']> = {
        ...linkStyle({ color: 'var(--wire-color, var(--dead))', width: look.width, wrapperWidth: 16 }),
        root: {
            tabindex: 0,
            role: 'img',
            'aria-label': look.name,
            'data-iface': look.iface,
            'data-traced': isTraced ? 'true' : null,
            'data-dimmed': isTracing && !isTraced ? 'true' : null,
            'data-flag': look.flag ?? null,
            'data-live': look.live ?? null,
        },
    };
    return { ...cell, attrs, labelMap: look.labels, labelStyle: LABEL_STYLE };
}

/** Connectivity cells with every wire's look applied. */
export function lookSchCells(cells: readonly Cell[], context: LookContext): Cell[] {
    return cells.map((cell) => {
        if (cell.type !== 'link' || !isWireCell(cell.data)) return cell;
        const { wireId } = cell.data;
        const isTraced = context.trace?.wires.has(wireId) === true;
        return applyLook(cell, wireLook(context, wireId), isTraced, context.trace !== null);
    });
}

/** Architecture cells with every bundle's (and expanded member's) look applied. */
export function lookArchCells(cells: readonly Cell[], context: LookContext): Cell[] {
    return cells.map((cell) => {
        if (cell.type !== 'link') return cell;
        const isTracing = context.trace !== null;
        if (isBundleCell(cell.data)) {
            const look = bundleLook(context, cell.data.bundleId);
            const isTraced = context.trace?.bundles.has(cell.data.bundleId) === true;
            return look === undefined ? cell : applyLook(cell, look, isTraced, isTracing);
        }
        if (isBundleWireCell(cell.data)) {
            const isTraced = context.trace?.wires.has(cell.data.wireId) === true;
            return applyLook(cell, wireLook(context, cell.data.wireId), isTraced, isTracing);
        }
        return cell;
    });
}
