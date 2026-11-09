// The simulated plant: one pure step from the diagram's state to the next.
// Flow is traced through the pipes from what pushes it (a running pump, a
// firing boiler, a running generator) through what passes it (open valves,
// closed breakers, fittings) into what stores it (tanks). Everything else is
// derived from that: levels, pressures, temperatures, readings, alarms.
import type { CellId } from '@joint/react-plus';
import type { EquipmentData, EquipmentKind, PipeData } from './model';

/** An element as the simulation sees it. */
export interface SimElement {
    readonly id: CellId;
    readonly data: EquipmentData;
}

/** A pipe as the simulation sees it: its ends, by element and port. */
export interface SimPipe {
    readonly id: CellId;
    readonly source: CellId | undefined;
    readonly sourcePort: string | undefined;
    readonly target: CellId | undefined;
    readonly targetPort: string | undefined;
    readonly data: PipeData;
}

/** What one step changed. */
export interface SimStep {
    /** Only the elements whose data changed. */
    readonly elements: ReadonlyMap<CellId, EquipmentData>;
    /** Only the pipes whose flow changed: id → flowing. */
    readonly pipes: ReadonlyMap<CellId, boolean>;
}

const PUSHERS: ReadonlySet<EquipmentKind> = new Set(['pump', 'compressor', 'fan', 'generator']);
const STORES: ReadonlySet<EquipmentKind> = new Set(['tank', 'silo']);
const FITTINGS: ReadonlySet<EquipmentKind> = new Set(['checkValve', 'heatExchanger', 'filter', 'flowMeter', 'transformer']);
const SWITCHED: ReadonlySet<EquipmentKind> = new Set(['handValve', 'controlValve', 'breaker']);
// The stubs a medium enters and leaves by: a pipe flows from an outlet to an inlet,
// whichever end the user drew it from.
const INLETS: ReadonlySet<string> = new Set(['in', 'fuel']);
const OUTLETS: ReadonlySet<string> = new Set(['out', 'steam']);

// Rates, per second of plant time.
const FILL_RATE = 2.2; // % per flowing inlet
const DRAIN_RATE = 1.6; // % per flowing outlet
const PRESSURE_RATE = 0.9; // bar
const HEAT_RATE = 9; // °C

// Set points and alarm thresholds.
const BOILER_PRESSURE = 11.5; // bar
const BOILER_PRESSURE_BLOCKED = 15; // bar: nowhere for the steam to go
const PRESSURE_ALARM = 14; // bar
const LEVEL_ALARM_HIGH = 92; // %
const LEVEL_ALARM_LOW = 5; // %
const PUMP_PRESSURE = 6.2; // bar
const FLOW_RATE = 18.4; // m³/h
const GENERATOR_OUTPUT = 420; // kW
const AMBIENT_TEMPERATURE = 20; // °C
const FIRED_TEMPERATURE = 190; // °C
const MIN_STEAM_PRESSURE = 2; // bar: the drum must build some pressure before steam leaves
const MIN_SUPPLY_LEVEL = 1; // %: a tank this empty no longer feeds a pump

// How far a reading wanders from its value, at the most (`noise` is in [-1, 1]).
const BOILER_PRESSURE_NOISE = 0.05; // bar
const FLOW_NOISE = 0.6; // m³/h
const GENERATOR_OUTPUT_NOISE = 6; // kW
const GAUGE_PRESSURE_NOISE = 0.04; // bar

const approach = (value: number, target: number, rate: number): number =>
    value < target ? Math.min(target, value + rate) : Math.max(target, value - rate);

const round1 = (value: number): number => Math.round(value * 10) / 10;

function passes(data: EquipmentData): boolean {
    return FITTINGS.has(data.kind) || (SWITCHED.has(data.kind) && data.active === true);
}

/** A closed valve, an open breaker or a stopped machine: nothing flows into it. */
function blocks(data: EquipmentData): boolean {
    return (SWITCHED.has(data.kind) || PUSHERS.has(data.kind)) && data.active !== true;
}

/** A pipe turned to flow out of an outlet; a wire both ways, since current has no inlet. */
function directed(pipe: SimPipe): SimPipe[] {
    const reversed: SimPipe = {
        ...pipe,
        source: pipe.target,
        sourcePort: pipe.targetPort,
        target: pipe.source,
        targetPort: pipe.sourcePort,
    };
    if (pipe.data.medium === 'power') {
        return [pipe, reversed];
    }
    const isBackwards = INLETS.has(pipe.sourcePort ?? '') || OUTLETS.has(pipe.targetPort ?? '');
    return [isBackwards ? reversed : pipe];
}

function pushes(data: EquipmentData): boolean {
    if (data.kind === 'boiler') {
        return data.active === true && (data.value ?? 0) > MIN_STEAM_PRESSURE;
    }
    return PUSHERS.has(data.kind) && data.active === true;
}

/**
 * One step of the plant, `seconds` long. `noise` returns a value in [-1, 1]
 * (a random jitter in the app, zero in tests).
 */
export function simulate(
    elements: readonly SimElement[],
    pipes: readonly SimPipe[],
    seconds: number,
    noise: () => number = () => 0,
): SimStep {
    const byId = new Map(elements.map((element) => [element.id, element.data]));
    const idByTag = new Map(elements.map((element) => [element.data.tag, element.id]));
    const outgoing = new Map<CellId, SimPipe[]>();
    const incoming = new Map<CellId, SimPipe[]>();
    const connect = (index: Map<CellId, SimPipe[]>, id: CellId | undefined, pipe: SimPipe) => {
        if (id === undefined) {
            return;
        }
        const list = index.get(id);
        if (list) {
            list.push(pipe);
        } else {
            index.set(id, [pipe]);
        }
    };
    for (const pipe of pipes.flatMap(directed)) {
        connect(outgoing, pipe.source, pipe);
        connect(incoming, pipe.target, pipe);
    }

    // Can this element feed a pump's suction? Walks upstream through what passes flow.
    const hasSupply = (id: CellId | undefined, seen: Set<CellId>): boolean => {
        const data = id === undefined ? undefined : byId.get(id);
        if (id === undefined || !data || seen.has(id)) {
            return false;
        }
        seen.add(id);
        if (STORES.has(data.kind)) {
            return (data.level ?? 0) > MIN_SUPPLY_LEVEL;
        }
        // A booster: a running pump feeds the pump after it.
        if (pushes(data)) {
            return true;
        }
        if (!passes(data)) {
            return false;
        }
        const feeds = incoming.get(id) ?? [];
        // A fitting at an open pipe end draws from outside the drawing.
        return feeds.length === 0 || feeds.some((pipe) => hasSupply(pipe.source, seen));
    };

    const flowing = new Set<CellId>();
    const visit = (id: CellId, seen: Set<CellId>): void => {
        if (seen.has(id)) {
            return;
        }
        seen.add(id);
        const data = byId.get(id);
        for (const pipe of outgoing.get(id) ?? []) {
            // A boiler pushes steam only: its water and fuel inlets are not outlets.
            if (data?.kind === 'boiler' && pipe.sourcePort !== 'steam') {
                continue;
            }
            const next = pipe.target === undefined ? undefined : byId.get(pipe.target);
            if (next && blocks(next)) {
                continue;
            }
            flowing.add(pipe.id);
            if (pipe.target !== undefined && next && passes(next)) {
                visit(pipe.target, seen);
            }
        }
    };

    for (const { id, data } of elements) {
        if (!pushes(data)) {
            continue;
        }
        const suction = incoming.get(id) ?? [];
        const isFed = data.kind === 'boiler' || data.kind === 'generator' || suction.length === 0
            || suction.some((pipe) => hasSupply(pipe.source, new Set()));
        if (!isFed) {
            continue;
        }
        for (const pipe of suction) {
            if (data.kind !== 'boiler' && hasSupply(pipe.source, new Set())) {
                markUpstream(pipe, byId, incoming, flowing, new Set());
            }
        }
        visit(id, new Set());
    }

    const flowIn = (id: CellId): number => (incoming.get(id) ?? []).filter((pipe) => flowing.has(pipe.id)).length;
    const flowOut = (id: CellId): number => (outgoing.get(id) ?? []).filter((pipe) => flowing.has(pipe.id)).length;

    const next = new Map<CellId, EquipmentData>();
    for (const { id, data } of elements) {
        next.set(id, stepElement(id, data));
    }
    // A beacon without a source watches the whole plant.
    const isAnyAlarm = [...next.values()].some((other) => other.alarm === true && other.kind !== 'beacon');
    // Instruments read the state after this step.
    for (const { id, data } of elements) {
        const sourceId = data.source === undefined ? undefined : idByTag.get(data.source);
        const sourceNext = sourceId === undefined ? undefined : next.get(sourceId);
        const read = readInstrument(data, sourceNext, isAnyAlarm);
        if (read) {
            next.set(id, read);
        }
    }

    const changedElements = new Map<CellId, EquipmentData>();
    for (const { id, data } of elements) {
        const updated = next.get(id);
        if (updated && updated !== data && !shallowEqual(updated, data)) {
            changedElements.set(id, updated);
        }
    }
    const changedPipes = new Map<CellId, boolean>();
    for (const pipe of pipes) {
        const isFlowing = flowing.has(pipe.id);
        if (isFlowing !== (pipe.data.flowing === true)) {
            changedPipes.set(pipe.id, isFlowing);
        }
    }
    return { elements: changedElements, pipes: changedPipes };

    function stepElement(id: CellId, data: EquipmentData): EquipmentData {
        switch (data.kind) {
            case 'tank':
            case 'silo': {
                const level = Math.min(100, Math.max(0, (data.level ?? 0)
                    + seconds * (FILL_RATE * flowIn(id) - DRAIN_RATE * flowOut(id))));
                return { ...data, level: round1(level), alarm: level > LEVEL_ALARM_HIGH || level < LEVEL_ALARM_LOW };
            }
            case 'boiler': {
                const isFiring = data.active === true;
                const isBlocked = flowOut(id) === 0;
                const target = isFiring ? (isBlocked ? BOILER_PRESSURE_BLOCKED : BOILER_PRESSURE) : 0;
                const pressure = approach(data.value ?? 0, target, seconds * PRESSURE_RATE) + BOILER_PRESSURE_NOISE * noise();
                const temperature = approach(
                    data.temperature ?? AMBIENT_TEMPERATURE,
                    isFiring ? FIRED_TEMPERATURE : AMBIENT_TEMPERATURE,
                    seconds * HEAT_RATE,
                );
                return {
                    ...data,
                    value: round1(Math.max(0, pressure)),
                    temperature: Math.round(temperature),
                    alarm: pressure > PRESSURE_ALARM,
                };
            }
            case 'flowMeter':
                return { ...data, active: flowIn(id) > 0, value: flowIn(id) > 0 ? round1(FLOW_RATE + FLOW_NOISE * noise()) : 0 };
            case 'generator':
                return { ...data, value: data.active ? Math.round(GENERATOR_OUTPUT + GENERATOR_OUTPUT_NOISE * noise()) : 0 };
            case 'motor':
            case 'heatExchanger':
            case 'filter':
            case 'checkValve':
            case 'transformer':
                // Running or carrying flow while what feeds it does: shown, not operated.
                return { ...data, active: flowIn(id) > 0 };
            default:
                return data;
        }
    }

    function readInstrument(
        data: EquipmentData,
        source: EquipmentData | undefined,
        isAnyAlarm: boolean,
    ): EquipmentData | undefined {
        switch (data.kind) {
            case 'pressureGauge':
                return { ...data, value: round1(pressureOf(source) + (source ? GAUGE_PRESSURE_NOISE * noise() : 0)) };
            case 'thermometer':
                return { ...data, value: source?.temperature ?? AMBIENT_TEMPERATURE };
            case 'display':
                return { ...data, value: source?.value ?? source?.level ?? 0, alarm: source?.alarm === true };
            case 'beacon': {
                const isAlarm = source ? source.alarm === true : isAnyAlarm;
                return { ...data, alarm: isAlarm, active: isAlarm };
            }
            default:
                return undefined;
        }
    }
}

function pressureOf(source: EquipmentData | undefined): number {
    if (!source) {
        return 0;
    }
    if (source.kind === 'boiler') {
        return source.value ?? 0;
    }
    return source.active ? PUMP_PRESSURE : 0;
}

function markUpstream(
    pipe: SimPipe,
    byId: ReadonlyMap<CellId, EquipmentData>,
    incoming: ReadonlyMap<CellId, SimPipe[]>,
    flowing: Set<CellId>,
    seen: Set<CellId>,
): void {
    flowing.add(pipe.id);
    const source = pipe.source;
    const data = source === undefined ? undefined : byId.get(source);
    if (source === undefined || !data || seen.has(source) || !passes(data)) {
        return;
    }
    seen.add(source);
    for (const feed of incoming.get(source) ?? []) {
        markUpstream(feed, byId, incoming, flowing, seen);
    }
}

function shallowEqual(a: EquipmentData, b: EquipmentData): boolean {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of keys) {
        if (Reflect.get(a, key) !== Reflect.get(b, key)) {
            return false;
        }
    }
    return true;
}
