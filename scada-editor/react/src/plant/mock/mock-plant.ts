import { CHART_POINTS, scaleOf } from '../../shapes/charts/plot';
import type { PlantValues, ShapeData } from '../../shapes/types';
import { indexByTag, tagOf, type CellKey, type Plant, type PlantCell, type PlantDiagram, type PlantMessage } from '../plant';
import { propertiesOf, readProperty, type TagValue } from '../properties';
import { energizedOf } from './energized';

/*
 * A mock of the plant: in random intervals it sends random updates of the plant data - the new value of a
 * property of a cell by its tag, through the interface of the diagram (`plant.update()`, see `plant.ts`) as any
 * system would; the energized circuits (see `energized.ts`), the readouts of the tables, the values of the charts.
 * Some of the data follows the plant: the flow and the pressure of the feedwater follow the feed pumps running,
 * the charts (updated every second) follow the flow, the alarm follows the pressure, the tables of a source
 * follow it. Answers the commands of the operator after a while, as a SCADA server would.
 */

/** A random number in [0, 1), as `Math.random()`: replaced in the tests. */
export type RandomSource = () => number;

// The time between two updates (ms)
export const MIN_INTERVAL = 300;
export const MAX_INTERVAL = 1500;

// How long the equipment takes to do what the operator asked (ms): a valve travelling, a pump starting
export const MIN_RESPONSE = 300;
export const MAX_RESPONSE = 800;

// The alarm (a beacon) goes on above this pressure (on a display)
const HIGH_PRESSURE = 11;

// The charts are updated this often (ms); a bar of a bar chart is the mean of this many updates.
export const CHART_INTERVAL = 1000;
const BAR_PERIOD = 10;

// The flow (m³/h) and the pressure (bar) of the feedwater with no, one or both feed pumps running
export const PUMP_FLOW = [0, 18, 30];
export const PUMP_PRESSURE = [0.3, 10.5, 12.5];

// The steam flow (t/h) the first fuel of a fuel mix covers; the second one covers the load above it.
const BASE_LOAD = 20;

// A switch is flipped now and then: the chance of it at an update of the cell.
const EQUIPMENT_TOGGLE = 0.15;
const BULK_TOGGLE = 0.1;
const VALVE_TOGGLE = 0.1;
const BURNER_TRIP = 0.03;
const BREAKER_TRIP = 0.08;
const GENERATOR_STOP = 0.05;
const STATE_SWITCH = 0.4;

// The switches of the circuits: open, they cut it (a valve open lets the liquid through)
const SWITCHES = new Set(['CircuitBreaker', 'Disconnector']);
const TABLE = 'Table';
const NUMBER_PATTERN = /^-?\d+(\.\d+)?$/;

/** What a mock step reads: the cells as they are now, by their tags, and the random numbers. */
export interface MockContext {
    readonly cells: readonly PlantCell[];
    readonly tags: ReadonlyMap<string, PlantCell>;
    readonly random: RandomSource;
}

/** A change of a cell's plant values (a chart, a table: the values of the diagram itself, not of a tag). */
export interface ValuesUpdate {
    readonly id: CellKey;
    readonly changes: PlantValues;
}

/** An update of the plant: the new value of a property of a cell (by its tag). */
export interface PlantUpdate {
    readonly tag: string;
    readonly property: string;
    readonly value: TagValue;
}

interface TableColumn {
    readonly kind?: string;
}

/** A display's drift by its unit (a pressure without a unit). */
const DISPLAY_RANGES: Readonly<Record<string, { readonly step: number; readonly min: number; readonly max: number }>> = {
    bar: { step: 0.4, min: 0, max: 14 },
    Hz: { step: 0.05, min: 49.8, max: 50.2 },
    '%': { step: 0.5, min: 20, max: 100 },
    't/h': { step: 1.5, min: 150, max: 175 },
    '°C': { step: 2, min: 320, max: 360 },
};

const between = (random: RandomSource, min: number, max: number) => min + random() * (max - min);

const chance = (random: RandomSource, probability: number) => random() < probability;

/** The value moved by up to `step` either way, within `min` and `max`. */
export function drift(random: RandomSource, value: number, step: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value + between(random, -step, step)));
}

/** The value rounded to two digits of the span (a whole number on a scale of 100, one decimal on a scale of 10). */
export function roundTo(value: number, span: number): number {
    const digits = Math.max(0, 2 - Math.floor(Math.log10(Math.abs(span) || 1)));
    return Number(value.toFixed(digits));
}

/** The value moved a part of the way to the target (a lag of the plant), with some noise. */
function follow(random: RandomSource, value: number, target: number, noise: number): number {
    return value + (target - value) * 0.3 + between(random, -noise, noise);
}

/** An attribute of the cell's kind: its own, or the default of the kind (the unit of a display). */
function attributeOf(cell: PlantCell, key: string): unknown {
    return cell.data[key] ?? cell.defaults?.[key];
}

/** Whether the cell has the plant value (running or not, open or closed: also when off). */
function hasPlantValue(cell: PlantCell, key: keyof PlantValues): boolean {
    return cell.data.plant !== undefined && Object.hasOwn(cell.data.plant, key);
}

const elementsOf = (context: MockContext, kind: string) => context.cells.filter((cell) => !cell.isLink && cell.data.kind === kind);

/** How many feed pumps are running. */
function pumpsRunning(context: MockContext): number {
    return elementsOf(context, 'Pump').filter((cell) => cell.data.plant?.power).length;
}

/** The target of a value of the plant with the pumps running (of the values with no, one or both pumps). */
function withPumps(context: MockContext, values: readonly number[]): number {
    return values[Math.min(pumpsRunning(context), values.length - 1)];
}

/** The numeric values of the elements of the kind (the flow meters, the displays). */
function readingsOf(cells: readonly PlantCell[]): number[] {
    return cells.map((cell) => Number(cell.data.plant?.value)).filter((value) => !Number.isNaN(value));
}

/** The flow of the feedwater (the mean of the flow meters): as much steam comes out of the boilers. */
export function steamFlow(context: MockContext): number {
    const flows = readingsOf(elementsOf(context, 'FlowMeter'));
    return flows.length > 0 ? flows.reduce((sum, value) => sum + value, 0) / flows.length : 0;
}

/** The highest pressure shown on the displays with the `bar` unit. */
function highestPressure(context: MockContext): number {
    const pressures = readingsOf(elementsOf(context, 'Display').filter((cell) => attributeOf(cell, 'unit') === 'bar'));
    return pressures.length > 0 ? Math.max(...pressures) : 0;
}

/** The property of the cell the mock changes: its only one (see `properties.ts`). */
const propertyOf = (cell: PlantCell) => propertiesOf(cell.data.kind)[0];

/** The value of the property of the cell now (as the diagram shows it: a real plant knows it itself). */
const valueOf = (cell: PlantCell) => readProperty(cell.data, propertyOf(cell));

/** The next value of the tag of the cell, or `null` if it doesn't change this time. */
type Generator = (cell: PlantCell, context: MockContext) => TagValue | null;

/** On / off, open / closed: switched now and then. */
const toggle = (probability: number): Generator => (cell, { random }) => (chance(random, probability) ? !valueOf(cell) : null);

/** A number on a scale of 0 - 100 drifting by up to the step. */
const drifting = (fallback: number, step: number, min = 0, max = 100): Generator => (cell, { random }) =>
    Math.round(drift(random, Number(valueOf(cell) ?? fallback), step, min, max));

const CONTROL_VALVE_STEP = 25;

/** How the value of the tag of each kind of cell changes. */
const GENERATORS: Readonly<Record<string, Generator>> = {
    Panel: drifting(50, 6),
    Thermometer: drifting(50, 4),
    PressureGauge: drifting(50, 8),
    // The feed pumps push the water.
    FlowMeter: (cell, context) => roundTo(Math.max(0, follow(context.random, Number(valueOf(cell)), withPumps(context, PUMP_FLOW), 0.5)), 10),
    Display: (cell, { random }) => {
        const unit = attributeOf(cell, 'unit');
        const { step, min, max } = (typeof unit === 'string' && Object.hasOwn(DISPLAY_RANGES, unit) ? DISPLAY_RANGES[unit] : undefined) ?? DISPLAY_RANGES.bar;
        return roundTo(drift(random, Number(valueOf(cell)) || min, step, min, max), 10);
    },
    // How much it is open (%), in steps of a quarter
    ControlValve: (cell, { random }) => {
        const step = chance(random, 0.5) ? CONTROL_VALVE_STEP : -CONTROL_VALVE_STEP;
        return Math.max(0, Math.min(100, Number(valueOf(cell)) + step));
    },
    // The equipment is switched now and then only.
    Pump: toggle(EQUIPMENT_TOGGLE),
    Compressor: toggle(EQUIPMENT_TOGGLE),
    // A burner trips now and then only.
    Boiler: toggle(BURNER_TRIP),
    Fan: toggle(EQUIPMENT_TOGGLE),
    Blower: toggle(EQUIPMENT_TOGGLE),
    Motor: toggle(EQUIPMENT_TOGGLE),
    Turbine: toggle(EQUIPMENT_TOGGLE),
    ConveyorBelt: toggle(EQUIPMENT_TOGGLE),
    Conveyor: toggle(EQUIPMENT_TOGGLE),
    AirCooler: toggle(EQUIPMENT_TOGGLE),
    MixingTank: toggle(EQUIPMENT_TOGGLE),
    BucketElevator: toggle(BULK_TOGGLE),
    Crusher: toggle(BULK_TOGGLE),
    Mill: toggle(BULK_TOGGLE),
    RotaryKiln: toggle(BURNER_TRIP),
    Reactor: toggle(EQUIPMENT_TOGGLE),
    HandValve: toggle(VALVE_TOGGLE),
    ButterflyValve: toggle(VALVE_TOGGLE),
    BallValve: toggle(VALVE_TOGGLE),
    SolenoidValve: toggle(VALVE_TOGGLE),
    GateValve: toggle(VALVE_TOGGLE),
    // The electrical equipment: a breaker trips now and then, a generator stops; a meter shows the voltage.
    CircuitBreaker: toggle(BREAKER_TRIP),
    Generator: toggle(GENERATOR_STOP),
    DieselGenerator: toggle(GENERATOR_STOP),
    WindTurbine: toggle(GENERATOR_STOP),
    // The charge of a battery bank, the fuel of a day tank
    BatteryBank: drifting(80, 3, 20, 100),
    FuelTank: drifting(70, 3, 10, 100),
    ElectricMeter: (cell, { random }) => (cell.data.energized === true ? roundTo(drift(random, Number(valueOf(cell) ?? 230), 1.5, 225, 235), 10) : 0),
    // The alarm follows the pressure.
    Beacon: (_cell, context) => highestPressure(context) > HIGH_PRESSURE,
};

const isNumber = (value: string) => NUMBER_PATTERN.test(value);

const decimalsOf = (value: string) => value.split('.')[1]?.length ?? 0;

/** The kinds of the columns of a table. */
function columnKindsOf(table: PlantCell): Array<string | undefined> {
    const columns = attributeOf(table, 'columns');
    return Array.isArray(columns) ? columns.map((column: TableColumn | null) => column?.kind) : [];
}

/** The rows of a table (texts). */
function rowsOf(table: PlantCell): string[][] {
    const values = table.data.plant?.values;
    return Array.isArray(values) ? values.map((row) => (Array.isArray(row) ? row.map(String) : [])) : [];
}

/** The cell a table shows the values of (its `sourceTag`, an ID), if any. */
function sourceOf(table: PlantCell, tags: ReadonlyMap<string, PlantCell>): PlantCell | undefined {
    const source = attributeOf(table, 'sourceTag');
    return typeof source === 'string' && source !== '' ? tags.get(source) : undefined;
}

/** Whether the cell runs: switched on (a pump, a generator), open (a valve) or closed (a breaker), or neither. */
function isRunning(cell: PlantCell): boolean {
    if (hasPlantValue(cell, 'power')) {
        return Boolean(cell.data.plant?.power);
    }
    if (hasPlantValue(cell, 'open')) {
        return SWITCHES.has(cell.data.kind) ? !cell.data.plant?.open : Boolean(cell.data.plant?.open);
    }
    return true;
}

/**
 * A value of a table changes: a state switches now and then, a number (as many decimals as it has) drifts. A
 * table of a source (an element): its states follow it (see `readoutStates()`), its numbers drift while it runs.
 * The changes of the table, or `null` if nothing changes this time.
 */
function tableUpdate(table: PlantCell, context: MockContext): PlantValues | null {
    const { random } = context;
    const values = rowsOf(table);
    const kinds = columnKindsOf(table);
    const source = sourceOf(table, context.tags);
    if (source && !isRunning(source)) {
        return null;
    }
    const cells = values.flatMap((row, rowIndex) => row
        .map((value, column) => ({ value, rowIndex, column, kind: kinds[column] }))
        .filter(({ value, kind }) => (kind === 'state' ? !source && (value === 'on' || value === 'off') : isNumber(value))));
    if (cells.length === 0) {
        return null;
    }
    const { value, rowIndex, column, kind } = cells[Math.floor(random() * cells.length)];
    let next: string;
    if (kind === 'state') {
        if (!chance(random, STATE_SWITCH)) {
            return null;
        }
        next = value === 'on' ? 'off' : 'on';
    } else {
        const number = Number(value);
        const decimals = decimalsOf(value);
        // By its share, at least five of its last digit (a whole number from 0 gets going)
        next = drift(random, number, Math.max(5 * 10 ** -decimals, Math.abs(number) * 0.05), 0, Number.MAX_VALUE).toFixed(decimals);
    }
    return { values: values.map((row, index) => (index === rowIndex ? row.map((cell, c) => (c === column ? next : cell)) : row)) };
}

/** The sum of the steam flow of the current period of each bar chart: its next bar is their mean. */
export type PeriodFlows = Map<CellKey, number>;

/** How the values of each kind of chart change (every `CHART_INTERVAL`). */
type ChartGenerator = (chart: PlantCell, context: MockContext, tick: number, periodFlows: PeriodFlows) => PlantValues | null;

/** Whether the charts follow the steam of a plant (its flow meters: a boiler house); otherwise they drift on their own. */
const hasSteam = (context: MockContext) => elementsOf(context, 'FlowMeter').length > 0;

/** A value of a chart moved a little (by a share of its scale), within the scale. */
function driftOnScale(random: RandomSource, value: number, min: number, max: number, share = 0.04): number {
    return roundTo(drift(random, value, (max - min) * share, min, max), max - min);
}

const numbersOf = (plant: PlantValues | undefined): number[] => (Array.isArray(plant?.values) ? plant.values.map(Number) : []);

interface Slice {
    readonly value?: unknown;
}

const slicesOf = (plant: PlantValues | undefined): Slice[] =>
    (Array.isArray(plant?.slices) ? plant.slices.filter((slice): slice is Slice => typeof slice === 'object' && slice !== null) : []);

const CHART_GENERATORS: Readonly<Record<string, ChartGenerator>> = {
    // The steam flow (or its own value drifting): the newest value on the right, the oldest one drops out on the left
    LineChart: (chart, context) => {
        const { min, max } = scaleOf(chart.data.plant);
        const values = numbersOf(chart.data.plant);
        const next = hasSteam(context)
            ? roundTo(steamFlow(context), max - min)
            : driftOnScale(context.random, values[values.length - 1] ?? (min + max) / 2, min, max);
        return { values: [...values, next].slice(-CHART_POINTS) };
    },
    // The steam produced in the last period (the mean flow; or near the last bar): a new bar on the right
    BarChart: (chart, context, tick, periodFlows) => {
        const { min, max } = scaleOf(chart.data.plant);
        const values = numbersOf(chart.data.plant);
        if (!hasSteam(context)) {
            // A new bar now and then, near the last one
            if (tick % BAR_PERIOD !== 0) {
                return null;
            }
            return { values: [...values.slice(1), driftOnScale(context.random, values[values.length - 1] ?? (min + max) / 2, min, max, 0.08)] };
        }
        const sum = (periodFlows.get(chart.id) ?? 0) + steamFlow(context);
        if (tick % BAR_PERIOD !== 0) {
            periodFlows.set(chart.id, sum);
            return null;
        }
        periodFlows.delete(chart.id);
        return { values: [...values.slice(1), roundTo(sum / BAR_PERIOD, max - min)] };
    },
    // The fuels burnt: the first one up to the base load, the second one above it, the others steadily (or each drifting)
    DonutChart: (chart, context) => {
        const slices = slicesOf(chart.data.plant);
        const { random } = context;
        // Without steam: each part a little more or less (the shares stay close)
        if (!hasSteam(context)) {
            return {
                slices: slices.map((slice) => {
                    const value = Number(slice.value) || 0;
                    return { ...slice, value: Number(drift(random, value, value * 0.03, 0, Number.MAX_VALUE).toFixed(1)) };
                }),
            };
        }
        const flow = steamFlow(context);
        return {
            slices: slices.map((slice, index) => {
                // The others as they are
                if (index > 1) {
                    return slice;
                }
                const target = index === 0 ? Math.min(flow, BASE_LOAD) : Math.max(0, flow - BASE_LOAD);
                return { ...slice, value: Number(Math.max(0, follow(random, Number(slice.value) || 0, target, 0.3)).toFixed(1)) };
            }),
        };
    },
    // The pressure of the feedwater: with the feed pumps running (or its own value drifting)
    GaugeChart: (chart, context) => {
        const { min, max } = scaleOf(chart.data.plant);
        const value = Number(chart.data.plant?.value) || 0;
        // Without the feed pumps: its own value drifting
        if (elementsOf(context, 'Pump').length === 0) {
            return { value: driftOnScale(context.random, value, min, max, 0.02) };
        }
        const next = follow(context.random, value, withPumps(context, PUMP_PRESSURE), 0.1);
        return { value: roundTo(Math.max(min, Math.min(max, next)), max - min) };
    },
};

/** The updates of the charts (of those with a tag). */
export function chartUpdates(context: MockContext, tick: number, periodFlows: PeriodFlows): ValuesUpdate[] {
    return context.cells.flatMap((cell) => {
        const generator = CHART_GENERATORS[cell.data.kind];
        const changes = tagOf(cell.data) && Object.hasOwn(CHART_GENERATORS, cell.data.kind) ? generator(cell, context, tick, periodFlows) : null;
        return changes ? [{ id: cell.id, changes }] : [];
    });
}

/**
 * An update of the plant (the new value of the property of a random cell of those with data), or an update of a
 * table; `null` if nothing changes this time.
 */
export function randomUpdate(context: MockContext): PlantUpdate | ValuesUpdate | null {
    // The equipment (a conveyor: a link too) and the tables
    const cells = context.cells.filter((cell) => tagOf(cell.data) && (Object.hasOwn(GENERATORS, cell.data.kind) || cell.data.kind === TABLE));
    if (cells.length === 0) {
        return null;
    }
    const cell = cells[Math.floor(context.random() * cells.length)];
    const tag = tagOf(cell.data);
    if (!tag) {
        return null;
    }
    if (cell.data.kind === TABLE) {
        if (cell.isLink) {
            return null;
        }
        const changes = tableUpdate(cell, context);
        return changes ? { id: cell.id, changes } : null;
    }
    const value = GENERATORS[cell.data.kind](cell, context);
    return value === null ? null : { tag, property: propertyOf(cell), value };
}

/** A new data of a cell. */
export interface CellWrite {
    readonly id: CellKey;
    readonly data: ShapeData;
}

/** The data of the cell with the plant values changed (an array replaced, not merged into the one before). */
export function withPlantValues(data: ShapeData, changes: PlantValues): ShapeData {
    return { ...data, plant: { ...data.plant, ...changes } };
}

/**
 * The empty cells of the tables filled (the plant sends every value): a number like the others of its column (or
 * a percentage), a text the name of its row, a state running.
 */
export function filledTables(context: MockContext): CellWrite[] {
    const { random } = context;
    return elementsOf(context, TABLE).flatMap((table) => {
        const kinds = columnKindsOf(table);
        const values = rowsOf(table);
        if (values.every((row) => row.every((value) => value !== ''))) {
            return [];
        }
        const filled = values.map((row, r) => row.map((value, c) => {
            if (value !== '') {
                return value;
            }
            if (kinds[c] === 'state') {
                return 'on';
            }
            if (kinds[c] === 'number') {
                const numbers = values.map((other) => other[c]).filter((other) => other !== undefined && isNumber(other));
                if (numbers.length === 0) {
                    return between(random, 0, 100).toFixed(1);
                }
                const sample = numbers[Math.floor(random() * numbers.length)];
                return drift(random, Number(sample), Math.abs(Number(sample)) * 0.2, 0, Number.MAX_VALUE).toFixed(decimalsOf(sample));
            }
            return `Row ${r + 1}`;
        }));
        return [{ id: table.id, data: withPlantValues(table.data, { values: filled }) }];
    });
}

/** The numbers of the tables of a stopped source, as they were while it ran: back when it runs again. */
export type RunningValues = Map<CellKey, string[][]>;

/**
 * The tables of a source as it is: their states `on` while it runs, `off` while not (an alarm stays); their
 * numbers zero while it is stopped (the ones before kept in `runningValues`), back when it runs again.
 */
export function readoutStates(context: MockContext, runningValues: RunningValues): CellWrite[] {
    return elementsOf(context, TABLE).flatMap((table) => {
        const source = sourceOf(table, context.tags);
        if (!source) {
            return [];
        }
        const running = isRunning(source);
        const kinds = columnKindsOf(table);
        const values = rowsOf(table);
        let numbers = values;
        if (running) {
            numbers = runningValues.get(table.id) ?? values;
            runningValues.delete(table.id);
        } else if (!runningValues.has(table.id)) {
            runningValues.set(table.id, values);
            numbers = values.map((row) => row.map((value, column) => (kinds[column] === 'number' && isNumber(value) ? (0).toFixed(decimalsOf(value)) : value)));
        }
        const state = running ? 'on' : 'off';
        const next = numbers.map((row) => row.map((value, column) => (kinds[column] === 'state' && value !== 'alarm' ? state : value)));
        return JSON.stringify(next) === JSON.stringify(values) ? [] : [{ id: table.id, data: withPlantValues(table.data, { values: next }) }];
    });
}

/** The `energized` of the cells (as a SCADA server would send it): the circuits traced from the sources. */
export function energizedWrites(cells: readonly PlantCell[]): CellWrite[] {
    const energized = energizedOf(cells);
    return cells.flatMap((cell) => {
        const value = energized.has(cell.id);
        if ((cell.data.energized === true) === value) {
            return [];
        }
        return [{ id: cell.id, data: { ...cell.data, energized: value ? true : undefined } }];
    });
}

type Timer = ReturnType<typeof setTimeout>;

export class MockPlant {
    protected readonly diagram: PlantDiagram;
    protected readonly random: RandomSource;
    protected plant: Plant | null = null;
    protected stopListening: Array<() => void> = [];
    protected timer: Timer | null = null;
    protected chartTimer: ReturnType<typeof setInterval> | null = null;
    protected tick = 0;
    protected readonly periodFlows: PeriodFlows = new Map();
    protected readonly runningValues: RunningValues = new Map();
    /** The timers of the answers to the commands (see `respond()`). */
    protected readonly responses = new Set<Timer>();

    constructor(diagram: PlantDiagram, random: RandomSource = Math.random) {
        this.diagram = diagram;
        this.random = random;
    }

    get isRunning(): boolean {
        return this.plant !== null;
    }

    start(plant: Plant): void {
        if (this.plant) {
            return;
        }
        this.plant = plant;
        this.stopListening = [
            // The commands of the operator done (as a SCADA server answers them: with the new state)
            plant.on('command', (message) => this.respond(message)),
            // A generator, a pump or a switch changed: the energized circuits, the states of the readouts
            plant.on('update', (message) => this.onUpdate(message)),
        ];
        this.updateEnergized();
        this.apply(filledTables(this.context()));
        this.apply(readoutStates(this.context(), this.runningValues));
        this.schedule();
        // The charts on a timer of their own: they move steadily
        this.chartTimer = setInterval(() => {
            this.tick++;
            chartUpdates(this.context(), this.tick, this.periodFlows).forEach((update) => this.applyValues(update));
        }, CHART_INTERVAL);
    }

    stop(): void {
        this.stopListening.forEach((stop) => stop());
        this.stopListening = [];
        this.responses.forEach((timer) => clearTimeout(timer));
        this.responses.clear();
        if (this.timer !== null) {
            clearTimeout(this.timer);
        }
        if (this.chartTimer !== null) {
            clearInterval(this.chartTimer);
        }
        this.timer = null;
        this.chartTimer = null;
        this.tick = 0;
        this.plant = null;
        this.periodFlows.clear();
        this.runningValues.clear();
    }

    /** What a step reads: the cells as they are now. */
    protected context(): MockContext {
        const cells = this.diagram.cells();
        return { cells, tags: indexByTag(cells), random: this.random };
    }

    protected apply(writes: readonly CellWrite[]): void {
        writes.forEach(({ id, data }) => this.diagram.write(id, data));
    }

    /** An update of a cell of the diagram itself (a chart, a table), by its id. */
    protected applyValues({ id, changes }: ValuesUpdate): void {
        const cell = this.diagram.cells().find((candidate) => candidate.id === id);
        if (cell) {
            this.diagram.write(id, withPlantValues(cell.data, changes));
        }
    }

    /** A command of the operator done after a while: the plant updates the property to the value asked for. */
    protected respond({ tag, property, value }: PlantMessage): void {
        const timer = setTimeout(() => {
            this.responses.delete(timer);
            this.plant?.update(tag, property, value);
        }, between(this.random, MIN_RESPONSE, MAX_RESPONSE));
        this.responses.add(timer);
    }

    /** A cell switched on or off, opened or closed: the energized circuits, the states of the readouts. */
    protected onUpdate({ tag }: PlantMessage): void {
        const cell = this.diagram.cellOfTag(tag);
        if (!cell || (!hasPlantValue(cell, 'power') && !hasPlantValue(cell, 'open'))) {
            return;
        }
        this.updateEnergized();
        this.apply(readoutStates(this.context(), this.runningValues));
    }

    protected updateEnergized(): void {
        this.apply(energizedWrites(this.diagram.cells()));
    }

    protected schedule(): void {
        this.timer = setTimeout(() => {
            const update = randomUpdate(this.context());
            if (update && 'property' in update) {
                // As any system would: through the interface of the diagram
                this.plant?.update(update.tag, update.property, update.value);
            } else if (update) {
                this.applyValues(update);
            }
            this.schedule();
        }, between(this.random, MIN_INTERVAL, MAX_INTERVAL));
    }
}
