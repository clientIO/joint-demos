// Net derivation — from wires to NETS, the unit every engineering output
// speaks in (netlist rows, "click-to-trace", validation, the wire list).
//
// A net is a maximal set of pins joined by wires (classic union-find over the
// wire endpoints). Nets are DERIVED, never stored: draw a wire and the nets
// re-form; the seeded pin-conflict problem is visible here as two signals
// silently merging into one net through the shared MCU pin.

import type { InterfaceKind } from './catalog';
import {
    pinKey,
    resolvePin,
    wireInterface,
    isWireComplete,
    type Design,
    type PinRef,
    type Wire,
} from './design';
import type { PinDef } from './catalog';

/** One resolved member pin of a net. */
export interface NetPin extends PinRef {
  readonly key: string;
  readonly def: PinDef;
}

export interface Net {
  /** Stable identifier — the resolved unique name ("SDA", "3V3", "N$4"). */
  readonly id: string;
  readonly name: string;
  /** The dominant interface — colors the wires and labels the bundle. */
  readonly iface: InterfaceKind;
  readonly pins: readonly NetPin[];
  readonly wires: readonly Wire[];
  /**
   * True when this net was formed by JOINING disjoint wire groups through a
   * shared label (the off-page-connector convention). The schematic renders
   * these labels with a flag glyph — a label that carries connectivity must
   * look different from one that merely names.
   */
  readonly labelJoined: boolean;
}

export interface NetIndex {
  readonly nets: readonly Net[];
  /** wire id → its net. */
  readonly byWire: ReadonlyMap<string, Net>;
  /** `component:pin` key → its net. */
  readonly byPin: ReadonlyMap<string, Net>;
}

/** Plain union-find with path compression; keys are `component:pin` strings. */
function findRoot(parent: Map<string, string>, key: string): string {
    let root = key;
    while (parent.get(root) !== root) {
        const up = parent.get(root);
        if (up === undefined) break;
        root = up;
    }
    // Compress the walked path so repeated lookups stay O(1)-ish.
    let walk = key;
    while (walk !== root) {
        const up = parent.get(walk);
        if (up === undefined) break;
        parent.set(walk, root);
        walk = up;
    }
    return root;
}

/** Priority for naming a net off a pin when no wire label exists. */
function pinNamePriority(pin: PinDef): number {
    if (pin.kind === 'power-out') return 3;
    if (pin.kind === 'gnd') return 2;
    if (pin.kind === 'out' || pin.kind === 'bidi') return 1;
    return 0;
}

/** Interface priority: explicit protocols beat the generic gpio fallback. */
function ifacePriority(iface: InterfaceKind): number {
    if (iface === 'power' || iface === 'gnd') return 3;
    if (iface === 'gpio') return 1;
    return 2;
}

/** Derives all nets of the design, deterministically ordered and named. */
export function deriveNets(design: Design): NetIndex {
    const wires = design.wires.filter((wire) => isWireComplete(design, wire));

    // 1) Union every wire's endpoints.
    const parent = new Map<string, string>();
    for (const wire of wires) {
        for (const end of [wire.from, wire.to]) {
            const key = pinKey(end);
            if (!parent.has(key)) parent.set(key, key);
        }
        const a = findRoot(parent, pinKey(wire.from));
        const b = findRoot(parent, pinKey(wire.to));
        if (a !== b) parent.set(a, b);
    }

    // 1b) NET LABELS JOIN BY NAME (the schematic-capture convention, and what
    // makes off-page connectors work): two wire groups carrying the same
    // explicit label are the same net, no drawn copper needed. Rename a net to
    // an existing name and the two become one.
    const labelAnchor = new Map<string, string>();
    const joiningLabels = new Set<string>();
    for (const wire of wires) {
        if (wire.label === undefined) continue;
        const root = findRoot(parent, pinKey(wire.from));
        const anchor = labelAnchor.get(wire.label);
        if (anchor === undefined) {
            labelAnchor.set(wire.label, root);
            continue;
        }
        const anchorRoot = findRoot(parent, anchor);
        if (anchorRoot !== root) {
            parent.set(root, anchorRoot);
            // This label actually connected two islands — remember it so the view
            // can draw it as a connectivity-carrying flag, not decoration.
            joiningLabels.add(wire.label);
        }
    }

    // 2) Group pins and wires per root, in wire order (deterministic).
    const pinsByRoot = new Map<string, NetPin[]>();
    const wiresByRoot = new Map<string, Wire[]>();
    const rootOrder: string[] = [];
    const seenPins = new Set<string>();
    for (const wire of wires) {
        const root = findRoot(parent, pinKey(wire.from));
        if (!pinsByRoot.has(root)) {
            pinsByRoot.set(root, []);
            wiresByRoot.set(root, []);
            rootOrder.push(root);
        }
        wiresByRoot.get(root)?.push(wire);
        for (const end of [wire.from, wire.to]) {
            const key = pinKey(end);
            if (seenPins.has(key)) continue;
            seenPins.add(key);
            const def = resolvePin(design, end);
            if (def !== undefined) pinsByRoot.get(root)?.push({ ...end, key, def });
        }
    }

    // 3) Name + classify each group, keeping names unique.
    const takenNames = new Set<string>();
    let anonymous = 0;
    const nets: Net[] = [];
    const byWire = new Map<string, Net>();
    const byPin = new Map<string, Net>();

    for (const root of rootOrder) {
        const netPins = pinsByRoot.get(root) ?? [];
        const netWires = wiresByRoot.get(root) ?? [];

        // Name: an explicit wire label wins, else the most authoritative pin name.
        let name = netWires.find((wire) => wire.label !== undefined)?.label;
        if (name === undefined) {
            let best: PinDef | undefined;
            for (const pin of netPins) {
                if (best === undefined || pinNamePriority(pin.def) > pinNamePriority(best)) best = pin.def;
            }
            name = best !== undefined && pinNamePriority(best) > 0 ? best.name : undefined;
        }
        if (name === undefined) {
            anonymous += 1;
            name = `N$${anonymous}`;
        }
        let unique = name;
        let suffix = 2;
        while (takenNames.has(unique)) {
            unique = `${name}_${suffix}`;
            suffix += 1;
        }
        takenNames.add(unique);

        // Interface: the highest-priority tag among the member wires.
        let iface: InterfaceKind = 'gpio';
        for (const wire of netWires) {
            const candidate = wireInterface(design, wire);
            if (ifacePriority(candidate) > ifacePriority(iface)) iface = candidate;
        }

        const labelJoined = netWires.some(
            (wire) => wire.label !== undefined && joiningLabels.has(wire.label),
        );
        const net: Net = { id: unique, name: unique, iface, pins: netPins, wires: netWires, labelJoined };
        nets.push(net);
        for (const wire of netWires) byWire.set(wire.id, net);
        for (const pin of netPins) byPin.set(pin.key, net);
    }

    return { nets, byWire, byPin };
}
