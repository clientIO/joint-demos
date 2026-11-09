// Architecture view projection: Design → cells, and canvas edits → Design.
//
// The architecture sheet shows SUBSYSTEMS and BUNDLES. A bundle is not
// stored anywhere — it is the group of schematic wires that cross between two
// subsystem ports, derived fresh on every change. That derivation is the
// synchronization between the two canvases: rewire a pin in the connectivity
// view and the architecture bundle updates by construction.
//
// The reverse direction also goes through data: drawing a NEW architecture
// connection between two ports expands role-by-role into real pin-to-pin
// wires (the "interface-group connection" of the spec).

import { IFACE_LABEL, type InterfaceKind } from '@/model/catalog';
import {
    newId,
    subsystemById,
    wireInterface,
    type ArchPort,
    type Design,
    type Point,
    type Wire,
} from '@/model/design';
import {
    cellsById,
    isBundleCell,
    isBundleWireCell,
    isSubsystemCell,
    isSubsystemDropCell,
    readEndId,
    readEndPort,
    TRANSPARENT_WIRE_STYLE,
    type Cell,
} from './cell-data';
import { getSubsystemTemplate } from './subsystem-templates';
import { archPorts, PORT_MAGNET_SELECTOR } from '@/symbols/port-markup';

// Z-tiers: bundles under blocks so wire joints tuck beneath the block edge.
export const Z_ARCH_BUNDLE = 1;
export const Z_ARCH_BLOCK = 2;

/** Cell id of one member wire of an EXPANDED bundle. */
export function bundleWireCellId(bundleId: string, wireId: string): string {
    return `bx|${bundleId}|${wireId}`;
}

/**
 * The inverse of {@link bundleWireCellId}. Bundle ids themselves contain "|",
 * so the wire id is the LAST segment and the bundle id is everything between.
 */
export function parseBundleWireCellId(
    cellId: string,
): { readonly bundleId: string; readonly wireId: string } | null {
    if (!cellId.startsWith('bx|')) return null;
    const segments = cellId.split('|');
    const wireId = segments.at(-1);
    if (segments.length < 3 || wireId === undefined) return null;
    return { bundleId: segments.slice(1, -1).join('|'), wireId };
}

// --- Bundles ---------------------------------------------------------------

export interface BundleEnd {
  readonly subsystemId: string;
  readonly port: ArchPort;
}

export interface ArchBundle {
  readonly id: string;
  readonly a: BundleEnd;
  readonly b: BundleEnd;
  readonly iface: InterfaceKind;
  readonly label: string;
  readonly wireIds: readonly string[];
}

export interface BundleIndex {
  readonly bundles: readonly ArchBundle[];
  /** Ports per subsystem: the declared ones plus any implicit ones in use. */
  readonly portsBySubsystem: ReadonlyMap<string, readonly ArchPort[]>;
}

interface PortHit {
  readonly subsystemId: string;
  readonly port: ArchPort;
}

/**
 * A pin may be bound by several ports (the Protection block exposes its GND
 * pin on both faces); the port whose side faces the OTHER subsystem wins.
 */
function pickFacing(hits: readonly PortHit[], design: Design, otherSubsystemId: string): PortHit | undefined {
    const first = hits[0];
    if (hits.length < 2 || first === undefined) return first;
    const own = subsystemById(design, first.subsystemId);
    const other = subsystemById(design, otherSubsystemId);
    if (own === undefined || other === undefined) return first;
    const dx = other.position.x - own.position.x;
    const dy = other.position.y - own.position.y;
    const facing: ArchPort['side'] =
    Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 'right' : 'left') : dy >= 0 ? 'bottom' : 'top';
    return hits.find((hit) => hit.port.side === facing) ?? first;
}

/** Derives every bundle plus the per-subsystem port lists (with implicits). */
export function deriveBundles(design: Design): BundleIndex {
    // Index declared port bindings: `component:pin` → owning ports.
    const bindings = new Map<string, PortHit[]>();
    for (const subsystem of design.subsystems) {
        for (const port of subsystem.ports) {
            for (const pin of port.pins) {
                const key = `${pin.component}:${pin.pin}`;
                const list = bindings.get(key) ?? [];
                list.push({ subsystemId: subsystem.id, port });
                bindings.set(key, list);
            }
        }
    }
    const subsystemOf = new Map<string, string>();
    for (const component of design.components) subsystemOf.set(component.id, component.subsystemId);

    // Implicit ports for cross-subsystem wires without a declared binding
    // (user-drawn pin wires): one generic stub per (subsystem, interface).
    const implicit = new Map<string, ArchPort>();
    const implicitCount = new Map<string, number>();
    const resolveEnd = (wire: Wire, end: Wire['from'], otherSubsystemId: string, iface: InterfaceKind): PortHit | undefined => {
        const subsystemId = subsystemOf.get(end.component);
        if (subsystemId === undefined) return undefined;
        const declared = bindings.get(`${end.component}:${end.pin}`)?.filter((hit) => hit.subsystemId === subsystemId);
        const picked = declared === undefined ? undefined : pickFacing(declared, design, otherSubsystemId);
        if (picked !== undefined) return picked;
        const key = `${subsystemId}|${iface}`;
        const existing = implicit.get(key);
        if (existing !== undefined) return { subsystemId, port: existing };
        const own = subsystemById(design, subsystemId);
        const other = subsystemById(design, otherSubsystemId);
        const dx = (other?.position.x ?? 0) - (own?.position.x ?? 0);
        const stacked = implicitCount.get(subsystemId) ?? 0;
        implicitCount.set(subsystemId, stacked + 1);
        const port: ArchPort = {
            id: `~${iface}`,
            label: IFACE_LABEL[iface],
            iface,
            side: dx >= 0 ? 'right' : 'left',
            offset: (own?.size.height ?? 132) - 16 - stacked * 22,
            pins: [{ role: `~${wire.id}`, component: end.component, pin: end.pin }],
        };
        implicit.set(key, port);
        return { subsystemId, port };
    };

    // Group cross-subsystem wires by their (port, port) pair.
    const byPair = new Map<string, { a: PortHit; b: PortHit; iface: InterfaceKind; wireIds: string[] }>();
    for (const wire of design.wires) {
        const subA = subsystemOf.get(wire.from.component);
        const subB = subsystemOf.get(wire.to.component);
        if (subA === undefined || subB === undefined || subA === subB) continue;
        const iface = wireInterface(design, wire);
        const hitA = resolveEnd(wire, wire.from, subB, iface);
        const hitB = resolveEnd(wire, wire.to, subA, iface);
        if (hitA === undefined || hitB === undefined) continue;
        // Canonical orientation so A↔B and B↔A wires land in the same bundle.
        const keyA = `${hitA.subsystemId}.${hitA.port.id}`;
        const keyB = `${hitB.subsystemId}.${hitB.port.id}`;
        const [first, second] = keyA <= keyB ? [hitA, hitB] : [hitB, hitA];
        if (first === undefined || second === undefined) continue;
        const id = `b|${first.subsystemId}.${first.port.id}|${second.subsystemId}.${second.port.id}`;
        const entry = byPair.get(id) ?? { a: first, b: second, iface: first.port.iface, wireIds: [] };
        entry.wireIds.push(wire.id);
        byPair.set(id, entry);
    }

    const bundles: ArchBundle[] = [];
    for (const [id, entry] of byPair) {
        const { a, b, iface, wireIds } = entry;
        // Power/ground bundles read best under their rail name (+24V, 3V3, GND);
        // protocol bundles under the protocol.
        const label = iface === 'power' || iface === 'gnd' ? a.port.label : IFACE_LABEL[iface];
        bundles.push({ id, a, b, iface, label, wireIds });
    }

    const portsBySubsystem = new Map<string, readonly ArchPort[]>();
    for (const subsystem of design.subsystems) {
        const extras = [...implicit.entries()]
            .filter(([key]) => key.startsWith(`${subsystem.id}|`))
            .map(([, port]) => port);
        portsBySubsystem.set(subsystem.id, extras.length === 0 ? subsystem.ports : [...subsystem.ports, ...extras]);
    }

    return { bundles, portsBySubsystem };
}

// --- Cells -----------------------------------------------------------------

/**
 * A bundle end: the subsystem's native interface port. `fan` spreads the
 * member wires of an EXPANDED bundle along the edge so the individual signals
 * leave the port side by side instead of stacked.
 */
function portEnd(subsystemId: string, port: ArchPort, fan = 0) {
    const end = { id: subsystemId, port: port.id, magnet: PORT_MAGNET_SELECTOR };
    if (fan === 0) return end;
    const along = port.side === 'left' || port.side === 'right' ? { dy: fan } : { dx: fan };
    return { ...end, anchor: { name: 'center', args: along }};
}

/**
 * A block's ports, rebuilt only when its port list or size changes: the
 * controlled sync deep-compares `ports` on every commit, and the same object
 * ends that compare on identity. Keyed by the list (declared lists are stable
 * Design objects; a list with implicit extras is rebuilt per derive anyway).
 */
const portsByList = new WeakMap<readonly ArchPort[], { readonly width: number; readonly height: number; readonly ports: ReturnType<typeof archPorts> }>();
function blockPorts(list: readonly ArchPort[], width: number, height: number): ReturnType<typeof archPorts> {
    const cached = portsByList.get(list);
    if (cached !== undefined && cached.width === width && cached.height === height) return cached.ports;
    const ports = archPorts(list, width, height);
    portsByList.set(list, { width, height, ports });
    return ports;
}

// NOTE on identity: the derivers rebuild every cell object on each call, and
// that is fine — the controlled `cells` prop is applied through the graph's
// VALUE-based sync (`graph.syncCells`), so an equal-but-new object causes no
// graph change and no re-render. No memoization needed.
export function deriveArchCells(
    design: Design,
    bundleIndex: BundleIndex,
    expandedBundles: ReadonlySet<string>,
): readonly Cell[] {
    const cells: Cell[] = [];

    for (const subsystem of design.subsystems) {
        cells.push({
            id: subsystem.id,
            type: 'element',
            position: { x: subsystem.position.x, y: subsystem.position.y },
            size: { width: subsystem.size.width, height: subsystem.size.height },
            // Declared interfaces plus the implicit ones wires currently use.
            ports: blockPorts(
                bundleIndex.portsBySubsystem.get(subsystem.id) ?? subsystem.ports,
                subsystem.size.width,
                subsystem.size.height,
            ),
            z: Z_ARCH_BLOCK,
            data: { kind: 'subsystem', subsystemId: subsystem.id },
        });
    }

    for (const bundle of bundleIndex.bundles) {
        const subsystemA = subsystemById(design, bundle.a.subsystemId);
        const subsystemB = subsystemById(design, bundle.b.subsystemId);
        if (subsystemA === undefined || subsystemB === undefined) continue;

        // EXPANDED bus: one link per member signal, fanned along the port edge.
        if (expandedBundles.has(bundle.id) && bundle.wireIds.length > 1) {
            const count = bundle.wireIds.length;
            bundle.wireIds.forEach((wireId, index) => {
                const fan = (index - (count - 1) / 2) * 10;
                cells.push({
                    id: bundleWireCellId(bundle.id, wireId),
                    type: 'link',
                    source: portEnd(bundle.a.subsystemId, bundle.a.port, fan),
                    target: portEnd(bundle.b.subsystemId, bundle.b.port, fan),
                    z: Z_ARCH_BUNDLE,
                    style: TRANSPARENT_WIRE_STYLE,
                    data: { kind: 'bundle-wire', bundleId: bundle.id, wireId },
                });
            });
            continue;
        }

        // Collapsed bus: one typed bundle link.
        const source = portEnd(bundle.a.subsystemId, bundle.a.port);
        const target = portEnd(bundle.b.subsystemId, bundle.b.port);
        const vertices = design.archVertices[bundle.id];
        cells.push({
            id: bundle.id,
            type: 'link',
            source,
            target,
            ...(vertices === undefined ? {} : { vertices: vertices.map((point) => ({ ...point })) }),
            z: Z_ARCH_BUNDLE,
            style: TRANSPARENT_WIRE_STYLE,
            data: { kind: 'bundle', bundleId: bundle.id },
        });
    }

    return cells;
}

// --- Write-back ------------------------------------------------------------

/** Pairs two ports' pins by role name, falling back to positional order. */
function matchPortPins(a: ArchPort, b: ArchPort): readonly (readonly [ArchPort['pins'][number], ArchPort['pins'][number]])[] {
    const byRole: (readonly [ArchPort['pins'][number], ArchPort['pins'][number]])[] = [];
    for (const pinA of a.pins) {
        const pinB = b.pins.find((candidate) => candidate.role === pinA.role);
        if (pinB !== undefined) byRole.push([pinA, pinB]);
    }
    if (byRole.length > 0) return byRole;
    return a.pins.flatMap((pinA, index) => {
        const pinB = b.pins[index];
        return pinB === undefined ? [] : [[pinA, pinB] as const];
    });
}

/**
 * Reconciles an architecture `onCellsChange` back into the Design: block
 * moves, deletions, template drops, drawn bundles, and dragged vertices.
 */
export function applyArchCellsChange(
    design: Design,
    bundleIndex: BundleIndex,
    expandedBundles: ReadonlySet<string>,
    cells: readonly Cell[],
): Design {
    let next = design;
    const seen = cellsById(cells);

    // 1) Deletions. A removed block takes its components and their wires; a
    //    removed collapsed bundle takes its member wires; a removed member of
    //    an EXPANDED bundle takes just that one wire.
    const removedSubsystems = design.subsystems.filter((subsystem) => !seen.has(subsystem.id));
    const removedWireIds = new Set<string>();
    for (const bundle of bundleIndex.bundles) {
        if (expandedBundles.has(bundle.id) && bundle.wireIds.length > 1) {
            for (const wireId of bundle.wireIds) {
                if (!seen.has(bundleWireCellId(bundle.id, wireId))) removedWireIds.add(wireId);
            }
            continue;
        }
        if (!seen.has(bundle.id)) for (const wireId of bundle.wireIds) removedWireIds.add(wireId);
    }
    if (removedSubsystems.length > 0 || removedWireIds.size > 0) {
        const goneSubsystems = new Set(removedSubsystems.map((subsystem) => subsystem.id));
        const goneComponents = new Set(
            design.components.filter((component) => goneSubsystems.has(component.subsystemId)).map((component) => component.id),
        );
        next = {
            ...next,
            subsystems: next.subsystems.filter((subsystem) => !goneSubsystems.has(subsystem.id)),
            components: next.components.filter((component) => !goneComponents.has(component.id)),
            wires: next.wires.filter(
                (wire) =>
                    !removedWireIds.has(wire.id) &&
          !goneComponents.has(wire.from.component) &&
          !goneComponents.has(wire.to.component),
            ),
        };
    }

    // 2) Block moves.
    let subsystemsChanged = false;
    const movedSubsystems = next.subsystems.map((subsystem) => {
        const cell = seen.get(subsystem.id);
        if (cell === undefined || !('position' in cell) || cell.position === undefined) return subsystem;
        const { x, y } = cell.position;
        if (x === subsystem.position.x && y === subsystem.position.y) return subsystem;
        subsystemsChanged = true;
        return { ...subsystem, position: { x, y }};
    });
    if (subsystemsChanged) next = { ...next, subsystems: movedSubsystems };

    // 3) Dragged bundle vertices.
    let vertexPatch: Record<string, readonly Point[]> | undefined;
    for (const bundle of bundleIndex.bundles) {
        const cell = seen.get(bundle.id);
        if (cell === undefined || !('vertices' in cell)) continue;
        const drawn = (cell.vertices ?? []).map((point: Point) => ({ x: point.x, y: point.y }));
        const stored = next.archVertices[bundle.id] ?? [];
        if (JSON.stringify(drawn) === JSON.stringify(stored)) continue;
        vertexPatch = vertexPatch ?? { ...next.archVertices };
        if (drawn.length === 0) delete vertexPatch[bundle.id];
        else vertexPatch[bundle.id] = drawn;
    }
    if (vertexPatch !== undefined) next = { ...next, archVertices: vertexPatch };

    // 4) Additions: template drops and freshly drawn port-to-port connections.
    const knownLinkIds = new Set(bundleIndex.bundles.map((bundle) => bundle.id));
    for (const bundle of bundleIndex.bundles) {
        for (const wireId of bundle.wireIds) knownLinkIds.add(bundleWireCellId(bundle.id, wireId));
    }
    for (const cell of cells) {
        const id = cell.id === undefined ? undefined : String(cell.id);
        if (cell.type !== 'link' && isSubsystemDropCell(cell.data)) {
            const position = 'position' in cell && cell.position !== undefined ? cell.position : { x: 80, y: 80 };
            const built = getSubsystemTemplate(cell.data.template).build(next, { x: position.x, y: position.y });
            next = {
                ...next,
                subsystems: [...next.subsystems, built.subsystem],
                components: [...next.components, ...built.components],
                wires: [...next.wires, ...built.wires],
            };
            continue;
        }
        if (cell.type !== 'link' || (id !== undefined && knownLinkIds.has(id))) continue;
        if (isBundleCell(cell.data) || isBundleWireCell(cell.data) || isSubsystemCell(cell.data)) continue;
        // A drawn connection: expand port ↔ port into pin-to-pin wires.
        const sourceId = 'source' in cell ? readEndId(cell.source) : undefined;
        const targetId = 'target' in cell ? readEndId(cell.target) : undefined;
        const sourcePortId = 'source' in cell ? readEndPort(cell.source) : undefined;
        const targetPortId = 'target' in cell ? readEndPort(cell.target) : undefined;
        if (sourceId === undefined || targetId === undefined || sourcePortId === undefined || targetPortId === undefined) continue;
        const sourcePort = bundleIndex.portsBySubsystem.get(sourceId)?.find((port) => port.id === sourcePortId);
        const targetPort = bundleIndex.portsBySubsystem.get(targetId)?.find((port) => port.id === targetPortId);
        if (sourcePort === undefined || targetPort === undefined) continue;
        const pairs = matchPortPins(sourcePort, targetPort);
        if (pairs.length === 0) continue;
        const minted: Wire[] = pairs.map(([pinA, pinB], index) => ({
            id: newId('wire'),
            from: { component: pinA.component, pin: pinA.pin },
            to: { component: pinB.component, pin: pinB.pin },
            iface: sourcePort.iface,
            // One label seeds the net name; the rail name for power, else the role.
            label:
        index === 0
            ? sourcePort.iface === 'power' || sourcePort.iface === 'gnd'
                ? sourcePort.label
                : undefined
            : undefined,
        }));
        next = { ...next, wires: [...next.wires, ...minted] };
    }

    return next;
}
