// The live operating point — the small DC solver behind "live mode".
//
// Two questions, both answered from pure data:
//   1. What VOLTAGE does each net sit at? Rails come from `power-out` pins,
//      conduct across passthrough parts (fuse, eFuse, pull-ups), and signal
//      nets settle at their strongest driver's level (a driver with no
//      explicit level drives at its part's supply). Monotone max-propagation,
//      so the fixpoint is reached in a handful of sweeps.
//   2. What CURRENT flows on each rail? Consumers charge their typical draw
//      to the net feeding their supply pin; regulators charge their input
//      rail with what they deliver downstream (LDO 1:1, buck by power ratio —
//      chosen by the part's declared topology), and series feed elements
//      (fuse, eFuse) mirror the current across their passthrough.
//
// The same numbers power the validation engine: "a 5 V level reaching a
// 3.3 V-max pin" is read straight off `netVolts`.

import { getPart, type PartDef } from './catalog';
import { pinKey, type Design } from './design';
import type { Net, NetIndex } from './nets';

export interface OperatingPoint {
  /** Net id → settled voltage (rails and driven signal levels). */
  readonly netVolts: ReadonlyMap<string, number>;
  /** Net id → summed downstream draw in mA (power nets only). */
  readonly railCurrentMa: ReadonlyMap<string, number>;
  /** Component id → the supply voltage actually reaching it. */
  readonly supplyVolts: ReadonlyMap<string, number>;
  /** Total draw at the 24 V input, in watts. */
  readonly inputPowerW: number;
}

/** Buck converters trade voltage for current; assume a flat efficiency. */
const BUCK_EFFICIENCY = 0.9;

function isRegulator(part: PartDef): boolean {
    return (
        part.pins.some((pin) => pin.kind === 'power-in') &&
    part.pins.some((pin) => pin.kind === 'power-out')
    );
}

/** The net a component's supply pin sits on (undefined when unpowered). */
function supplyNet(design: Design, nets: NetIndex, componentId: string): Net | undefined {
    const component = design.components.find((candidate) => candidate.id === componentId);
    if (component === undefined) return undefined;
    const supplyPin = getPart(component.part).pins.find((pin) => pin.kind === 'power-in');
    if (supplyPin === undefined) return undefined;
    return nets.byPin.get(pinKey({ component: componentId, pin: supplyPin.id }));
}

export function solveOperating(design: Design, nets: NetIndex): OperatingPoint {
    const netVolts = new Map<string, number>();

    // Nets holding a hard source (a regulator output, the 24 V terminal, any
    // ground pin) are STIFF: their voltage is set by the source and nothing —
    // in particular not a pull-up conducting from a hotter signal — can raise
    // it. Only un-pinned nets accept propagated levels.
    const pinned = new Set<string>();

    const raise = (netId: string | undefined, volts: number): boolean => {
        if (netId === undefined || pinned.has(netId)) return false;
        const current = netVolts.get(netId);
        if (current !== undefined && current >= volts) return false;
        netVolts.set(netId, volts);
        return true;
    };

    // Seed: ROOT sources (power-out on parts with no power-in — the 24 V
    // terminal) and ground references. Regulator outputs are NOT seeded: a
    // regulator only delivers when its own input is energized, so cutting the
    // feed genuinely kills every rail downstream (audited behavior — before
    // this, a disconnected LDO still "read" 3.3 V).
    // ponytail: liveness only — dropout/UVLO thresholds are not modeled; add
    // per-part minInputVolts when that fidelity matters.
    const partOf = new Map(design.components.map((component) => [component.id, getPart(component.part)]));
    for (const net of nets.nets) {
        for (const pin of net.pins) {
            const part = partOf.get(pin.component);
            if (part === undefined) continue;
            if (pin.def.kind === 'power-out' && pin.def.volts !== undefined && !isRegulator(part)) {
                netVolts.set(net.id, Math.max(netVolts.get(net.id) ?? 0, pin.def.volts));
                pinned.add(net.id);
            } else if (pin.def.kind === 'gnd' && !pinned.has(net.id)) {
                netVolts.set(net.id, 0);
                pinned.add(net.id);
            }
        }
    }

    // Fixpoint: conduct across passthrough pairs, then let drivers assert their
    // level (explicit, or the supply their part currently receives). Voltages
    // only ever increase, so this terminates; the cap is pure paranoia.
    for (let sweep = 0; sweep < 10; sweep += 1) {
        let changed = false;

        // Regulators turn ON when their input net is energized: the output net
        // takes the regulated voltage and pins (stiff like any hard source).
        for (const component of design.components) {
            const part = getPart(component.part);
            if (!isRegulator(part)) continue;
            const input = supplyNet(design, nets, component.id);
            const inVolts = input === undefined ? 0 : netVolts.get(input.id) ?? 0;
            if (inVolts <= 0) continue;
            for (const pin of part.pins) {
                if (pin.kind !== 'power-out' || pin.volts === undefined) continue;
                const outNet = nets.byPin.get(pinKey({ component: component.id, pin: pin.id }));
                if (outNet === undefined) continue;
                if ((netVolts.get(outNet.id) ?? 0) < pin.volts) {
                    netVolts.set(outNet.id, pin.volts);
                    changed = true;
                }
                pinned.add(outNet.id);
            }
        }

        for (const component of design.components) {
            const part = getPart(component.part);
            for (const [a, b] of part.passthrough ?? []) {
                const netA = nets.byPin.get(pinKey({ component: component.id, pin: a }));
                const netB = nets.byPin.get(pinKey({ component: component.id, pin: b }));
                const voltsA = netA === undefined ? undefined : netVolts.get(netA.id);
                const voltsB = netB === undefined ? undefined : netVolts.get(netB.id);
                if (voltsA !== undefined && raise(netB?.id, voltsA)) changed = true;
                if (voltsB !== undefined && raise(netA?.id, voltsB)) changed = true;
            }
        }

        for (const net of nets.nets) {
            for (const pin of net.pins) {
                if (pin.def.kind !== 'out' && pin.def.kind !== 'bidi') continue;
                // Open-drain pins only ever pull LOW; the net's high level arrives
                // through its pull-up (a passthrough from the pull-up's rail), never
                // from the pin itself. This is why an I²C bus sits at its pull-up
                // rail's voltage regardless of what supplies the devices on it.
                if (pin.def.openDrain === true) continue;
                let level = pin.def.volts;
                if (level === undefined) {
                    const supply = supplyNet(design, nets, pin.component);
                    level = supply === undefined ? undefined : netVolts.get(supply.id);
                }
                if (level !== undefined && level > 0 && raise(net.id, level)) changed = true;
            }
        }

        if (!changed) break;
    }

    // Supply actually reaching each component (for the inspector readout).
    const supplyVolts = new Map<string, number>();
    for (const component of design.components) {
        const supply = supplyNet(design, nets, component.id);
        const volts = supply === undefined ? undefined : netVolts.get(supply.id);
        if (volts !== undefined) supplyVolts.set(component.id, volts);
    }

    // Rail currents. Plain consumers charge their supply net directly; each
    // regulator charges its INPUT net with what it delivers downstream, so the
    // rail tree is computed recursively from the leaves (memoized — the tree is
    // tiny, the recursion is for correctness, not scale).
    const directMa = new Map<string, number>();
    const regulatorsByInputNet = new Map<string, { readonly component: string; readonly part: PartDef }[]>();
    for (const component of design.components) {
        const part = getPart(component.part);
        const supply = supplyNet(design, nets, component.id);
        if (supply === undefined) continue;
        if (isRegulator(part)) {
            const list = regulatorsByInputNet.get(supply.id) ?? [];
            list.push({ component: component.id, part });
            regulatorsByInputNet.set(supply.id, list);
        } else if (part.currentMa !== undefined) {
            directMa.set(supply.id, (directMa.get(supply.id) ?? 0) + part.currentMa);
        }
    }

    const railMemo = new Map<string, number>();
    const visiting = new Set<string>();
    const railCurrent = (netId: string): number => {
        const memo = railMemo.get(netId);
        if (memo !== undefined) return memo;
        if (visiting.has(netId)) return 0; // wiring loop — refuse to recurse forever
        visiting.add(netId);
        let total = directMa.get(netId) ?? 0;
        for (const { component, part } of regulatorsByInputNet.get(netId) ?? []) {
            const outPin = part.pins.find((pin) => pin.kind === 'power-out');
            const outNet =
        outPin === undefined ? undefined : nets.byPin.get(pinKey({ component, pin: outPin.id }));
            if (outPin === undefined || outNet === undefined) continue;
            const outMa = railCurrent(outNet.id);
            const inVolts = netVolts.get(netId) ?? 0;
            const outVolts = outPin.volts ?? 0;
            // An LDO passes current 1:1 (input ≥ output — conservation of charge);
            // a buck converts by power, with losses. The catalog says which is
            // which — guessing from voltage ratios misclassifies a 5 V→3.3 V LDO.
            const isBuck = part.topology === 'buck' && inVolts > 0;
            total += (isBuck ? (outMa * outVolts) / inVolts / BUCK_EFFICIENCY : outMa) + (part.currentMa ?? 0);
        }
        visiting.delete(netId);
        railMemo.set(netId, total);
        return total;
    };

    const railCurrentMa = new Map<string, number>();
    for (const net of nets.nets) {
        const volts = netVolts.get(net.id) ?? 0;
        if (volts <= 0) continue; // signal levels and grounds carry no rail budget
        const milliamps = railCurrent(net.id);
        if (milliamps > 0) railCurrentMa.set(net.id, milliamps);
    }

    // Series feed elements (fuse, eFuse) carry the same current on both sides:
    // propagate the downstream draw back across power-category passthrough
    // parts so the fused input path reads its real feed current. Restricted to
    // the power category on purpose — a pull-up's passthrough must NOT copy a
    // rail's budget onto the signal net it biases.
    for (let sweep = 0; sweep < 10; sweep += 1) {
        let changed = false;
        for (const component of design.components) {
            const part = getPart(component.part);
            if (part.category !== 'power') continue;
            for (const [a, b] of part.passthrough ?? []) {
                const netA = nets.byPin.get(pinKey({ component: component.id, pin: a }));
                const netB = nets.byPin.get(pinKey({ component: component.id, pin: b }));
                if (netA === undefined || netB === undefined) continue;
                const feed = Math.max(railCurrentMa.get(netA.id) ?? 0, railCurrentMa.get(netB.id) ?? 0);
                if (feed <= 0) continue;
                for (const netId of [netA.id, netB.id]) {
                    if ((railCurrentMa.get(netId) ?? 0) < feed) {
                        railCurrentMa.set(netId, feed);
                        changed = true;
                    }
                }
            }
        }
        if (!changed) break;
    }

    // Input power read at the highest fixed rail (the 24 V input net).
    let inputPowerW = 0;
    for (const net of nets.nets) {
        const volts = netVolts.get(net.id) ?? 0;
        if (volts < 12) continue;
        const milliamps = railCurrentMa.get(net.id) ?? 0;
        inputPowerW = Math.max(inputPowerW, (volts * milliamps) / 1000);
    }

    return { netVolts, railCurrentMa, supplyVolts, inputPowerW };
}
