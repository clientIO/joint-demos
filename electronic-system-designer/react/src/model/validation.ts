// The validation engine — electrical rule checks (a small ERC) over the
// derived nets and operating point, each finding carrying an optional
// "resolve design" FIX: a pure Design → Design transform the store can apply
// (and undo) like any other edit.
//
// Rules, in the order they report:
//   voltage       a driven level exceeds a receiving pin's absolute maximum
//   pin-conflict  two signals landed on one exclusive (MCU) pin
//   termination   a differential field bus leaves the design unterminated
//   bus-width     a connected bus is missing some of its shared signals
//   direction     two push-pull outputs fight on one net
//   protocol      a wire joins pins speaking different protocols
//
// Findings reference nets / components / wires by id, so both canvas views
// can badge the SAME problem — the views never disagree about what is wrong.

import { getPart, IFACE_LABEL, type InterfaceKind } from './catalog';
import { newId, pinKey, type Component, type Design, type PinRef, type Wire } from './design';
import type { Net, NetIndex } from './nets';
import type { OperatingPoint } from './operating';

/** "3.3 V" — one voltage formatter for finding text and inspector readouts. */
export function formatVolts(volts: number): string {
    return `${Number(volts.toFixed(1))} V`;
}

export type FindingRule =
  | 'voltage'
  | 'pin-conflict'
  | 'termination'
  | 'bus-width'
  | 'direction'
  | 'protocol';

/**
 * The bus-width rule's input: for one connected port pair (an architecture
 * bundle), the signal roles BOTH ports declare that no wire carries yet, and
 * the pin pair each missing role would connect. The store derives these from
 * the bundles; keeping the type here keeps the model layer free of view
 * imports.
 */
export interface BusCheck {
  readonly bundleId: string;
  /** Bundle label ("ETH") + the two subsystem names, for the finding text. */
  readonly label: string;
  readonly aName: string;
  readonly bName: string;
  readonly missing: readonly { readonly role: string; readonly a: PinRef; readonly b: PinRef }[];
  readonly wireIds: readonly string[];
}
export type FindingSeverity = 'error' | 'warning';

/** The panel's words for a severity: an error is something to REVIEW, a
 * warning something to CONSIDER — the text that accompanies the colour. */
export function severityVerb(severity: FindingSeverity): 'review' | 'consider' {
    return severity === 'error' ? 'review' : 'consider';
}

export interface FindingFix {
  /** Button label ("Move LED drive to PB4"). */
  readonly label: string;
  /** One sentence describing what the fix changes. */
  readonly description: string;
  readonly apply: (design: Design) => Design;
}

export interface Finding {
  /** Stable id (rule + subject) — selection and announcements key off it. */
  readonly id: string;
  readonly rule: FindingRule;
  readonly severity: FindingSeverity;
  readonly title: string;
  readonly detail: string;
  /** Net ids involved — drives cross-view highlighting. */
  readonly nets: readonly string[];
  /** Components to badge on the canvases. */
  readonly components: readonly string[];
  readonly wires: readonly string[];
  /** Architecture bundles to badge directly (bus-level findings). */
  readonly bundles?: readonly string[];
  readonly fix?: FindingFix;
}

/** Formats "U3-PB1" style pin references for finding text. */
function pinLabel(design: Design, ref: PinRef): string {
    const component = design.components.find((candidate) => candidate.id === ref.component);
    if (component === undefined) return `${ref.component}-${ref.pin}`;
    const pin = getPart(component.part).pins.find((candidate) => candidate.id === ref.pin);
    return `${component.ref}-${pin?.name ?? ref.pin}`;
}

// --- Rule: voltage ---------------------------------------------------------

/**
 * Victims are grouped by the DRIVING component (one root cause → one finding):
 * the seeded 5 V sensor board produces a single finding on ALERT (its pull-up
 * rides VS), and its one fix (rewire the supply) clears the whole group.
 */
function checkVoltage(
    design: Design,
    nets: NetIndex,
    operating: OperatingPoint,
): readonly Finding[] {
  interface Violation {
    readonly net: Net;
    readonly victim: PinRef;
    readonly maxVolts: number;
    readonly volts: number;
  }
  const byDriver = new Map<string, Violation[]>();

  for (const net of nets.nets) {
      const volts = operating.netVolts.get(net.id);
      if (volts === undefined || volts <= 0) continue;
      for (const pin of net.pins) {
          const { maxVolts } = pin.def;
          if (maxVolts === undefined || volts <= maxVolts + 0.05) continue;
          // Attribute the violation to the component responsible for the high
          // level. Open-drain pins count as candidates on purpose: their pull-up
          // rides the part's supply rail, so the part is still the root cause.
          let driver = pin.component;
          for (const candidate of net.pins) {
              if (candidate.def.kind !== 'out' && candidate.def.kind !== 'bidi' && candidate.def.kind !== 'power-out') continue;
              const level =
          candidate.def.volts ?? operating.supplyVolts.get(candidate.component) ?? 0;
              if (level >= volts - 0.05) {
                  driver = candidate.component;
                  break;
              }
          }
          const list = byDriver.get(driver) ?? [];
          list.push({ net, victim: pin, maxVolts, volts });
          byDriver.set(driver, list);
      }
  }

  const findings: Finding[] = [];
  for (const [driver, violations] of byDriver) {
      const netIds = [...new Set(violations.map((violation) => violation.net.id))];
      const victims = violations.map((violation) => pinLabel(design, violation.victim));
      const worst = violations.reduce((a, b) => (b.volts > a.volts ? b : a));
      const driverRef = design.components.find((component) => component.id === driver)?.ref ?? driver;
      findings.push({
          id: `voltage-${driver}`,
          rule: 'voltage',
          severity: 'error',
          title: 'Voltage mismatch',
          // "Raises to", not "drives" — the high level may arrive through the
          // culprit's pull-up (the seeded ALERT case) rather than a push-pull pin.
          detail:
        `${driverRef} raises ${netIds.join(', ')} to ${formatVolts(worst.volts)} — ` +
        `above the ${formatVolts(worst.maxVolts)} absolute maximum of ${victims.join(', ')}.`,
          nets: netIds,
          components: [driver, ...new Set(violations.map((violation) => violation.victim.component))],
          wires: violations.flatMap((violation) => violation.net.wires.map((wire) => wire.id)),
          fix: suggestSupplyRewire(design, nets, driver, worst.maxVolts),
      });
  }
  return findings;
}

/**
 * The classic resolution for "part talks at its supply, supply is too high":
 * move the part's supply FEED onto a rail low enough for every receiver.
 * We look for the feed wire on the driver's supply net that leaves a
 * power-out pin (skipping wires that feed other regulators — rewiring those
 * would re-plumb the whole power tree), and an alternative power-out pin at
 * an acceptable voltage.
 */
function suggestSupplyRewire(
    design: Design,
    nets: NetIndex,
    driverId: string,
    maxVolts: number,
): FindingFix | undefined {
    const driver = design.components.find((component) => component.id === driverId);
    if (driver === undefined) return undefined;
    const supplyPin = getPart(driver.part).pins.find((pin) => pin.kind === 'power-in');
    if (supplyPin === undefined) return undefined;
    const supplyNet = nets.byPin.get(pinKey({ component: driverId, pin: supplyPin.id }));
    if (supplyNet === undefined) return undefined;

    const isPowerOut = (ref: PinRef): boolean => {
        const component = design.components.find((candidate) => candidate.id === ref.component);
        if (component === undefined) return false;
        const pin = getPart(component.part).pins.find((candidate) => candidate.id === ref.pin);
        return pin?.kind === 'power-out';
    };
    const feedsRegulator = (ref: PinRef): boolean => {
        const component = design.components.find((candidate) => candidate.id === ref.component);
        if (component === undefined) return false;
        const part = getPart(component.part);
        return part.pins.some((pin) => pin.kind === 'power-out') && part.pins.some((pin) => pin.kind === 'power-in');
    };

    // The feed wire: power-out on one end, a plain distribution hop (not
    // another regulator's input) on the other.
    const feed = supplyNet.wires.find((wire) => {
        const fromOut = isPowerOut(wire.from);
        const toOut = isPowerOut(wire.to);
        if (fromOut === toOut) return false;
        return !feedsRegulator(fromOut ? wire.to : wire.from);
    });
    if (feed === undefined) return undefined;

    // An alternative rail every victim tolerates.
    let alternative: (PinRef & { readonly volts: number }) | undefined;
    for (const component of design.components) {
        for (const pin of getPart(component.part).pins) {
            if (pin.kind !== 'power-out' || pin.volts === undefined) continue;
            if (pin.volts > maxVolts) continue;
            if (alternative === undefined || pin.volts > alternative.volts) {
                alternative = { component: component.id, pin: pin.id, volts: pin.volts };
            }
        }
    }
    if (alternative === undefined) return undefined;

    const keepEnd = isPowerOut(feed.from) ? feed.to : feed.from;
    const newSource: PinRef = { component: alternative.component, pin: alternative.pin };
    return {
        label: `Rewire ${pinLabel(design, keepEnd)} to the ${formatVolts(alternative.volts)} rail`,
        description: `Moves the supply feed from the ${supplyNet.name} rail to ${pinLabel(design, newSource)}; the part then drives at ${formatVolts(alternative.volts)}.`,
        apply: (current) => ({
            ...current,
            wires: current.wires.map((wire) =>
                wire.id === feed.id ? { ...wire, from: newSource, to: keepEnd, label: undefined, vertices: undefined } : wire,
            ),
        }),
    };
}

// --- Rule: pin-conflict ----------------------------------------------------

/**
 * A branch is a BIAS network — a 2-pin passive whose far side sits on a power
 * or ground net (pull-up, pull-down, series bias). Bias branches hang off a
 * signal pin legitimately, so the conflict rule white-lists them, exactly the
 * way a real ERC exempts pull-ups from single-driver checks.
 */
function isBiasBranch(design: Design, nets: NetIndex, wire: Wire, ownPin: PinRef): boolean {
    const far = wire.from.component === ownPin.component && wire.from.pin === ownPin.pin ? wire.to : wire.from;
    const component = design.components.find((candidate) => candidate.id === far.component);
    if (component === undefined) return false;
    const part = getPart(component.part);
    if (part.category !== 'passives' || part.pins.length !== 2) return false;
    const otherPin = part.pins.find((candidate) => candidate.id !== far.pin);
    if (otherPin === undefined) return false;
    const otherNet = nets.byPin.get(pinKey({ component: component.id, pin: otherPin.id }));
    return otherNet !== undefined && (otherNet.iface === 'power' || otherNet.iface === 'gnd');
}

function checkPinConflicts(design: Design, nets: NetIndex): readonly Finding[] {
    const findings: Finding[] = [];
    for (const component of design.components) {
        const part = getPart(component.part);
        if (part.exclusivePins !== true) continue;
        const wiresByPin = new Map<string, Wire[]>();
        for (const wire of design.wires) {
            for (const end of [wire.from, wire.to]) {
                if (end.component !== component.id) continue;
                const list = wiresByPin.get(end.pin) ?? [];
                list.push(wire);
                wiresByPin.set(end.pin, list);
            }
        }
        for (const [pinId, allPinWires] of wiresByPin) {
            const pin = part.pins.find((candidate) => candidate.id === pinId);
            if (pin === undefined || allPinWires.length < 2) continue;
            // Power and ground pins legitimately fan out; signals do not.
            if (pin.kind === 'power-in' || pin.kind === 'gnd') continue;
            // Discount bias networks (pull-ups) — only real signal branches count.
            const self: PinRef = { component: component.id, pin: pinId };
            const pinWires = allPinWires.filter((wire) => !isBiasBranch(design, nets, wire, self));
            if (pinWires.length < 2) continue;
            const others = pinWires.map((wire) =>
                pinLabel(design, wire.from.component === component.id && wire.from.pin === pinId ? wire.to : wire.from),
            );
            const net = nets.byPin.get(pinKey(self));
            findings.push({
                id: `pin-conflict-${component.id}-${pinId}`,
                rule: 'pin-conflict',
                severity: 'error',
                title: 'Pin assigned twice',
                detail:
          `${pinLabel(design, self)} carries ${pinWires.length} signals (${others.join(', ')}) — ` +
          'their nets merge through the pin. One signal per MCU pin.',
                nets: net === undefined ? [] : [net.id],
                components: [component.id],
                wires: pinWires.map((wire) => wire.id),
                fix: suggestPinMove(design, component.id, pinId, pinWires),
            });
        }
    }
    return findings;
}

/**
 * Moves ONE of the colliding wires to a free compatible pin. The wire whose
 * far end is a passive part (the LED's series resistor, not the sensor
 * header) is the one that was mis-assigned in every realistic version of this
 * mistake, so that is the one we move.
 */
function suggestPinMove(
    design: Design,
    componentId: string,
    pinId: string,
    colliding: readonly Wire[],
): FindingFix | undefined {
    const component = design.components.find((candidate) => candidate.id === componentId);
    if (component === undefined) return undefined;
    const part = getPart(component.part);
    const pin = part.pins.find((candidate) => candidate.id === pinId);
    if (pin === undefined) return undefined;

    const used = new Set<string>();
    for (const wire of design.wires) {
        for (const end of [wire.from, wire.to]) {
            if (end.component === componentId) used.add(end.pin);
        }
    }
    const free = part.pins.find(
        (candidate) =>
            !used.has(candidate.id) && candidate.kind === pin.kind && candidate.iface === pin.iface,
    );
    if (free === undefined) return undefined;

    const isPassiveFarEnd = (wire: Wire): boolean => {
        const far = wire.from.component === componentId && wire.from.pin === pinId ? wire.to : wire.from;
        const farComponent = design.components.find((candidate) => candidate.id === far.component);
        return farComponent !== undefined && getPart(farComponent.part).category === 'passives';
    };
    const move = colliding.find(isPassiveFarEnd) ?? colliding[colliding.length - 1];
    if (move === undefined) return undefined;

    const target: PinRef = { component: componentId, pin: free.id };
    return {
        label: `Move to free pin ${free.name}`,
        description: `Reassigns one of the colliding signals from ${pin.name} to ${free.name}; the merged nets split again.`,
        apply: (current) => ({
            ...current,
            wires: current.wires.map((wire) => {
                if (wire.id !== move.id) return wire;
                const fromHere = wire.from.component === componentId && wire.from.pin === pinId;
                return {
                    ...wire,
                    from: fromHere ? target : wire.from,
                    to: fromHere ? wire.to : target,
                    vertices: undefined,
                };
            }),
        }),
    };
}

// --- Rule: termination -----------------------------------------------------

function checkTermination(design: Design, nets: NetIndex): readonly Finding[] {
    const findings: Finding[] = [];
    for (const bus of ['rs485', 'can'] satisfies readonly InterfaceKind[]) {
        const busNets = nets.nets.filter((net) => net.iface === bus);
        if (busNets.length < 2) continue;

        // Is any terminating part bridged across two distinct bus nets?
        const terminated = design.components.some((component) => {
            const part = getPart(component.part);
            if (part.terminates === undefined || !part.terminates.includes(bus)) return false;
            const touched = new Set<string>();
            for (const pin of part.pins) {
                const net = nets.byPin.get(pinKey({ component: component.id, pin: pin.id }));
                if (net !== undefined && net.iface === bus) touched.add(net.id);
            }
            return touched.size >= 2;
        });
        if (terminated) continue;

        // Badge the field-side connector when there is one, else the transceiver.
        const onBus = (category: string): string | undefined => {
            for (const net of busNets) {
                for (const pin of net.pins) {
                    const component = design.components.find((candidate) => candidate.id === pin.component);
                    if (component !== undefined && getPart(component.part).category === category) return component.id;
                }
            }
            return undefined;
        };
        const anchor = onBus('connectors') ?? onBus('interfaces');
        findings.push({
            id: `termination-${bus}`,
            rule: 'termination',
            severity: 'warning',
            title: 'Missing termination',
            detail: `The ${IFACE_LABEL[bus]} bus (${busNets.map((net) => net.name).join(', ')}) leaves the design without a 120 Ω termination.`,
            nets: busNets.map((net) => net.id),
            components: anchor === undefined ? [] : [anchor],
            wires: busNets.flatMap((net) => net.wires.map((wire) => wire.id)),
            fix: anchor === undefined ? undefined : suggestTermination(design, bus, anchor, busNets),
        });
    }
    return findings;
}

function suggestTermination(
    design: Design,
    bus: 'rs485' | 'can',
    anchorId: string,
    busNets: readonly Net[],
): FindingFix | undefined {
    const anchor = design.components.find((component) => component.id === anchorId);
    if (anchor === undefined) return undefined;
    // The two pins of the anchor sitting on (distinct) bus nets.
    const pinA = busNets[0]?.pins.find((pin) => pin.component === anchorId);
    const pinB = busNets[1]?.pins.find((pin) => pin.component === anchorId);
    if (pinA === undefined || pinB === undefined) return undefined;

    return {
        label: `Add 120 Ω termination at ${anchor.ref}`,
        description: `Places a termination resistor across ${busNets[0]?.name} / ${busNets[1]?.name} next to ${anchor.ref}.`,
        apply: (current) => {
            // Recompute the ref at apply time — the design may have changed.
            let highest = 0;
            for (const component of current.components) {
                if (!component.ref.startsWith('R')) continue;
                const numeric = Number(component.ref.slice(1));
                if (Number.isInteger(numeric) && numeric > highest) highest = numeric;
            }
            const ref = `R${highest + 1}`;
            const termination: Component = {
                id: ref,
                ref,
                part: 'res-120',
                board: anchor.board,
                subsystemId: anchor.subsystemId,
                position: { x: anchor.position.x + 160, y: anchor.position.y - 4 },
                notes: `${IFACE_LABEL[bus]} bus termination`,
            };
            return {
                ...current,
                components: [...current.components, termination],
                wires: [
                    ...current.wires,
                    { id: newId('wire'), from: { component: ref, pin: 'a' }, to: { component: pinA.component, pin: pinA.pin }},
                    { id: newId('wire'), from: { component: ref, pin: 'b' }, to: { component: pinB.component, pin: pinB.pin }},
                ],
            };
        },
    };
}

// --- Rule: bus-width -------------------------------------------------------

/**
 * Two connected ports agree on a bus by their shared signal ROLES; a shared
 * role no wire carries is a silently narrowed bus (exactly what happens when
 * one member of an expanded bundle is deleted). Roles only one side declares
 * (a spare GPIO) are not a mismatch.
 */
function checkBusWidth(busChecks: readonly BusCheck[]): readonly Finding[] {
    const findings: Finding[] = [];
    for (const check of busChecks) {
        if (check.missing.length === 0) continue;
        const roles = check.missing.map((entry) => entry.role.toUpperCase()).join(', ');
        findings.push({
            id: `bus-width-${check.bundleId}`,
            rule: 'bus-width',
            severity: 'warning',
            title: 'Bus width mismatch',
            detail: `The ${check.label} bus between ${check.aName} and ${check.bName} is missing ${check.missing.length} of its signals (${roles}).`,
            nets: [],
            components: [],
            wires: check.wireIds,
            bundles: [check.bundleId],
            fix: {
                label: `Connect ${roles}`,
                description: `Wires the missing ${check.label} signals between ${check.aName} and ${check.bName}.`,
                apply: (current) => ({
                    ...current,
                    wires: [
                        ...current.wires,
                        ...check.missing.map((entry) => ({ id: newId('wire'), from: entry.a, to: entry.b })),
                    ],
                }),
            },
        });
    }
    return findings;
}

// --- Rule: direction -------------------------------------------------------

function checkDirection(design: Design, nets: NetIndex): readonly Finding[] {
    const findings: Finding[] = [];
    for (const net of nets.nets) {
        const drivers = net.pins.filter((pin) => pin.def.kind === 'out');
        if (drivers.length < 2) continue;
        findings.push({
            id: `direction-${net.id}`,
            rule: 'direction',
            severity: 'error',
            title: 'Driver conflict',
            detail: `Net ${net.name} is driven by ${drivers.length} push-pull outputs (${drivers.map((pin) => pinLabel(design, pin)).join(', ')}).`,
            nets: [net.id],
            components: [...new Set(drivers.map((pin) => pin.component))],
            wires: net.wires.map((wire) => wire.id),
        });
    }
    return findings;
}

// --- Rule: protocol --------------------------------------------------------

/** Interfaces a wire may bridge without complaint (pull-ups, level shifts…). */
const PROTOCOL_NEUTRAL: ReadonlySet<InterfaceKind> = new Set(['power', 'gnd', 'gpio', 'analog']);

function checkProtocol(design: Design, nets: NetIndex): readonly Finding[] {
    const findings: Finding[] = [];
    for (const wire of design.wires) {
        const fromPin = nets.byPin.get(pinKey(wire.from));
        const from = fromPin?.pins.find((pin) => pin.key === pinKey(wire.from))?.def;
        const to = nets.byPin.get(pinKey(wire.to))?.pins.find((pin) => pin.key === pinKey(wire.to))?.def;
        if (from?.iface === undefined || to?.iface === undefined) continue;
        if (from.iface === to.iface) continue;
        if (PROTOCOL_NEUTRAL.has(from.iface) || PROTOCOL_NEUTRAL.has(to.iface)) continue;
        findings.push({
            id: `protocol-${wire.id}`,
            rule: 'protocol',
            severity: 'warning',
            title: 'Protocol mismatch',
            detail: `${pinLabel(design, wire.from)} (${IFACE_LABEL[from.iface]}) is wired to ${pinLabel(design, wire.to)} (${IFACE_LABEL[to.iface]}).`,
            nets: fromPin === undefined ? [] : [fromPin.id],
            components: [wire.from.component, wire.to.component],
            wires: [wire.id],
        });
    }
    return findings;
}

// --- Entry -----------------------------------------------------------------

export function validateDesign(
    design: Design,
    nets: NetIndex,
    operating: OperatingPoint,
    busChecks: readonly BusCheck[] = [],
): readonly Finding[] {
    return [
        ...checkVoltage(design, nets, operating),
        ...checkPinConflicts(design, nets),
        ...checkTermination(design, nets),
        ...checkBusWidth(busChecks),
        ...checkDirection(design, nets),
        ...checkProtocol(design, nets),
    ];
}
