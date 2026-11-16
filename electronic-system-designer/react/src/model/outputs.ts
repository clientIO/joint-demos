// Engineering outputs — every table and file the Outputs view offers, derived
// on demand from the same Design + nets the canvases render. Nothing here is
// stored; regenerate-on-read is what keeps the documents impossible to
// out-date.
//
//   BOM               grouped by part, suggestions mark rows "review"
//   Connector pinouts one table per connector, with destinations
//   Wire list         one row per drawn wire (the harness/assembly view)
//   Netlist           classic text netlist, one NET block per net
//   Connection matrix subsystem × subsystem net counts
//   Release check     the plain checklist behind the export button
//   CSV / JSON        serializers for the export buttons

import { CATEGORY_LABEL, getPart, IFACE_LABEL, type PartKindId } from './catalog';
import { pinKey, type Design, type PinRef } from './design';
import type { NetIndex } from './nets';
import type { Finding } from './validation';

// --- BOM -------------------------------------------------------------------

export interface BomRow {
  /** Joined reference designators, e.g. "R1, R2, R4". */
  readonly refs: string;
  readonly name: string;
  readonly footprint: string;
  /** Manufacturer datasheet URL, "" for generic parts. */
  readonly datasheet: string;
  readonly category: string;
  readonly quantity: number;
  /** "review" when a design suggestion touches any instance of the part. */
  readonly status: 'assigned' | 'review';
}

export function deriveBom(design: Design, findings: readonly Finding[]): readonly BomRow[] {
    const flagged = new Set(findings.flatMap((finding) => finding.components));
    const groups = new Map<PartKindId, { refs: string[]; review: boolean }>();
    for (const component of design.components) {
        const group = groups.get(component.part) ?? { refs: [], review: false };
        group.refs.push(component.ref);
        if (flagged.has(component.id)) group.review = true;
        groups.set(component.part, group);
    }
    const rows: BomRow[] = [];
    for (const [partId, group] of groups) {
        const part = getPart(partId);
        rows.push({
            refs: group.refs.join(', '),
            name: part.name,
            footprint: part.footprint,
            datasheet: part.datasheet ?? '',
            category: CATEGORY_LABEL[part.category],
            quantity: group.refs.length,
            status: group.review ? 'review' : 'assigned',
        });
    }
    // Stable, readable order: category, then first ref.
    return rows.toSorted((a, b) =>
        a.category === b.category ? a.refs.localeCompare(b.refs) : a.category.localeCompare(b.category),
    );
}

// --- Connector pinouts -----------------------------------------------------

export interface PinoutRow {
  readonly pinNumber: string;
  readonly pinName: string;
  readonly net: string;
  readonly iface: string;
  /** Where the signal goes: the first non-connector pin on the net. */
  readonly destination: string;
}

export interface ConnectorPinout {
  readonly componentId: string;
  readonly ref: string;
  readonly name: string;
  readonly footprint: string;
  readonly rows: readonly PinoutRow[];
}

export function deriveConnectorPinouts(design: Design, nets: NetIndex): readonly ConnectorPinout[] {
    const pinouts: ConnectorPinout[] = [];
    for (const component of design.components) {
        const part = getPart(component.part);
        // "J" refs are the connectors — this includes the 24 V terminal block,
        // which lives under the Power palette category but is still a connector.
        if (part.refPrefix !== 'J' || part.pins.length < 2) continue;
        const rows: PinoutRow[] = part.pins.map((pin) => {
            const net = nets.byPin.get(pinKey({ component: component.id, pin: pin.id }));
            let destination = '—';
            if (net !== undefined) {
                const other = net.pins.find((candidate) => candidate.component !== component.id);
                if (other !== undefined) {
                    const otherComponent = design.components.find((c) => c.id === other.component);
                    destination = `${otherComponent?.ref ?? other.component}·${other.def.name}`;
                }
            }
            return {
                pinNumber: pin.number ?? pin.id,
                pinName: pin.name,
                net: net?.name ?? 'unconnected',
                iface: net === undefined ? '—' : IFACE_LABEL[net.iface],
                destination,
            };
        });
        pinouts.push({ componentId: component.id, ref: component.ref, name: part.name, footprint: part.footprint, rows });
    }
    return pinouts;
}

// --- Wire list -------------------------------------------------------------

export interface WireRow {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly net: string;
  readonly iface: string;
}

function endLabel(design: Design, ref: PinRef): string {
    const component = design.components.find((candidate) => candidate.id === ref.component);
    if (component === undefined) return `${ref.component}.${ref.pin}`;
    const pin = getPart(component.part).pins.find((candidate) => candidate.id === ref.pin);
    const number = pin?.number === undefined ? '' : ` (${pin.number})`;
    return `${component.ref}.${pin?.name ?? ref.pin}${number}`;
}

export function deriveWireList(design: Design, nets: NetIndex): readonly WireRow[] {
    return design.wires.map((wire) => {
        const net = nets.byWire.get(wire.id);
        return {
            id: wire.id,
            from: endLabel(design, wire.from),
            to: endLabel(design, wire.to),
            net: net?.name ?? '—',
            iface: net === undefined ? '—' : IFACE_LABEL[net.iface],
        };
    });
}

// --- Netlist ---------------------------------------------------------------

/** The classic text netlist: one block per net, one pin per line. */
export function deriveNetlistText(design: Design, nets: NetIndex): string {
    const blocks = nets.nets.map((net) => {
        const pins = net.pins
            .map((pin) => `  ${endLabel(design, pin)}`)
            .toSorted((a, b) => a.localeCompare(b));
        return [`NET ${net.name} [${IFACE_LABEL[net.iface]}] (${net.pins.length} pins)`, ...pins].join('\n');
    });
    return blocks.join('\n\n');
}

// --- Connection matrix -----------------------------------------------------

export interface ConnectionMatrix {
  /** Subsystem names, in design order — rows and columns share it. */
  readonly names: readonly string[];
  /** counts[i][j] = number of nets subsystems i and j share (i ≠ j). */
  readonly counts: readonly (readonly number[])[];
}

export function deriveConnectionMatrix(design: Design, nets: NetIndex): ConnectionMatrix {
    const ids = design.subsystems.map((subsystem) => subsystem.id);
    const index = new Map(ids.map((id, at) => [id, at]));
    const counts = ids.map(() => ids.map(() => 0));
    for (const net of nets.nets) {
        const touched = new Set<number>();
        for (const pin of net.pins) {
            const component = design.components.find((candidate) => candidate.id === pin.component);
            const at = component === undefined ? undefined : index.get(component.subsystemId);
            if (at !== undefined) touched.add(at);
        }
        const list = [...touched];
        for (let i = 0; i < list.length; i += 1) {
            for (let j = i + 1; j < list.length; j += 1) {
                const a = list[i];
                const b = list[j];
                if (a === undefined || b === undefined) continue;
                const rowA = counts[a];
                const rowB = counts[b];
                if (rowA !== undefined) rowA[b] = (rowA[b] ?? 0) + 1;
                if (rowB !== undefined) rowB[a] = (rowB[a] ?? 0) + 1;
            }
        }
    }
    return {
        names: design.subsystems.map((subsystem) => subsystem.name),
        counts,
    };
}

/** Connection matrix as CSV — header row and column carry the names. */
export function matrixToCsv(matrix: ConnectionMatrix): string {
    return toCsv(
        ['', ...matrix.names],
        matrix.counts.map((row, index) => [matrix.names[index] ?? '', ...row.map((count) => count)]),
    );
}

// --- Release check ---------------------------------------------------------

export interface ReleaseCheck {
  readonly connectivityOk: boolean;
  readonly bomComplete: boolean;
  readonly errorCount: number;
  readonly warningCount: number;
  readonly unwiredComponents: readonly string[];
}

export function deriveReleaseCheck(
    design: Design,
    findings: readonly Finding[],
): ReleaseCheck {
    const wired = new Set<string>();
    for (const wire of design.wires) {
        wired.add(wire.from.component);
        wired.add(wire.to.component);
    }
    const unwired = design.components.filter((component) => !wired.has(component.id)).map((c) => c.ref);
    const errorCount = findings.filter((finding) => finding.severity === 'error').length;
    const warningCount = findings.length - errorCount;
    // No score, no gate: suggestions are for the engineer to weigh — a design
    // ships when THEY say so, so this stays a plain checklist.
    return {
        connectivityOk: unwired.length === 0,
        bomComplete: design.components.length > 0,
        errorCount,
        warningCount,
        unwiredComponents: unwired,
    };
}

// --- Serializers -----------------------------------------------------------

function csvField(value: string | number): string {
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(header: readonly string[], rows: readonly (readonly (string | number)[])[]): string {
    return [header, ...rows].map((row) => row.map(csvField).join(',')).join('\n');
}

export function bomToCsv(rows: readonly BomRow[]): string {
    return toCsv(
        ['Refs', 'Part', 'Footprint', 'Datasheet', 'Category', 'Qty', 'Status'],
        rows.map((row) => [row.refs, row.name, row.footprint, row.datasheet, row.category, row.quantity, row.status]),
    );
}

export function wireListToCsv(rows: readonly WireRow[]): string {
    return toCsv(
        ['Wire', 'From', 'To', 'Net', 'Interface'],
        rows.map((row) => [row.id, row.from, row.to, row.net, row.iface]),
    );
}

export function pinoutsToCsv(pinouts: readonly ConnectorPinout[]): string {
    return toCsv(
        ['Connector', 'Pin', 'Name', 'Net', 'Interface', 'Destination'],
        pinouts.flatMap((pinout) =>
            pinout.rows.map((row) => [pinout.ref, row.pinNumber, row.pinName, row.net, row.iface, row.destination]),
        ),
    );
}

/** The full design package as pretty JSON (design + derived engineering data). */
export function designToJson(design: Design, nets: NetIndex, findings: readonly Finding[]): string {
    return JSON.stringify(
        {
            format: 'jointjs-system-designer/1',
            design,
            nets: nets.nets.map((net) => ({
                name: net.name,
                iface: net.iface,
                pins: net.pins.map((pin) => pinKey(pin)),
            })),
            findings: findings.map((finding) => ({
                rule: finding.rule,
                severity: finding.severity,
                detail: finding.detail,
            })),
        },
        null,
        2,
    );
}
