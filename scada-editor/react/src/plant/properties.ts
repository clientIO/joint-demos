import type { PlantValues, ShapeData } from '../shapes/types';

/*
 * The properties of the equipment as the plant knows them: by the tag of a cell and the name of a property
 * (`power`, `open`, `level`, `value`), a plain value - a number or a boolean, nothing of the drawings. Here the
 * diagram binds them to its cells: what a property of a cell of a kind is (what it shows now, read as such a
 * value) and what a new value of it sets in the cell's plant values (`data.plant`).
 */

/** The value of a property: a reading (a number), a state (on / off, open / closed). */
export type TagValue = number | boolean;

interface Property {
    /** The value the cell shows now. */
    readonly read: (plant: PlantValues | undefined) => TagValue;
    /** The plant values of the cell showing the value. */
    readonly write: (plant: PlantValues | undefined, value: TagValue) => PlantValues;
}

const PERCENT = 100;
const READING_DECIMALS = 1;

/** Running or not (a pump, a motor, an alarm). */
const power: Property = {
    read: (plant) => Boolean(plant?.power),
    write: (plant, value) => ({ ...plant, power: value ? 1 : 0 }),
};

/** Open or closed (a valve, a breaker). */
const open: Property = {
    read: (plant) => Boolean(plant?.open),
    write: (plant, value) => ({ ...plant, open: Boolean(value) }),
};

/** How much open, in % (a control valve): stored as a part, 0 - 1. */
const opening: Property = {
    read: (plant) => Math.round((Number(plant?.open) || 0) * PERCENT),
    write: (plant, value) => ({ ...plant, open: Number(value) / PERCENT }),
};

/** A level, in % (a tank, a battery). */
const level: Property = {
    read: (plant) => plant?.level ?? 0,
    write: (plant, value) => ({ ...plant, level: Number(value) }),
};

/** A value on a scale (a gauge, a thermometer). */
const scaled: Property = {
    read: (plant) => Number(plant?.value ?? 0),
    write: (plant, value) => ({ ...plant, value: Number(value) }),
};

/** A reading shown as a number (a display, a meter): with one decimal. */
const reading: Property = {
    read: (plant) => Number(plant?.value) || 0,
    write: (plant, value) => ({ ...plant, value: Number(Number(value).toFixed(READING_DECIMALS)) }),
};

const RUNNING = [
    'Pump', 'Compressor', 'Fan', 'Blower', 'Motor', 'Turbine', 'ConveyorBelt', 'Conveyor', 'AirCooler', 'MixingTank',
    'BucketElevator', 'Crusher', 'Mill', 'RotaryKiln', 'Reactor', 'Boiler', 'Generator', 'DieselGenerator', 'WindTurbine', 'Beacon',
];

const SWITCHED = ['HandValve', 'ButterflyValve', 'BallValve', 'SolenoidValve', 'GateValve', 'CircuitBreaker', 'Disconnector'];

/** The properties of each kind of cell, by their names. */
const PROPERTIES: Readonly<Record<string, Readonly<Record<string, Property>>>> = {
    Panel: { level },
    BatteryBank: { level },
    FuelTank: { level },
    Thermometer: { value: scaled },
    PressureGauge: { value: scaled },
    FlowMeter: { value: reading },
    Display: { value: reading },
    ElectricMeter: { value: reading },
    ControlValve: { open: opening },
    ...Object.fromEntries(SWITCHED.map((kind) => [kind, { open }])),
    ...Object.fromEntries(RUNNING.map((kind) => [kind, { power }])),
};

function propertyOf(kind: string, name: string): Property | undefined {
    return Object.hasOwn(PROPERTIES, kind) && Object.hasOwn(PROPERTIES[kind], name) ? PROPERTIES[kind][name] : undefined;
}

/** The names of the properties of a cell of the kind (none if the plant knows nothing of it). */
export function propertiesOf(kind: string): readonly string[] {
    return Object.hasOwn(PROPERTIES, kind) ? Object.keys(PROPERTIES[kind]) : [];
}

/** The value of the property of the cell: what it shows now (`undefined` if it has no such property). */
export function readProperty(data: ShapeData, name: string): TagValue | undefined {
    return propertyOf(data.kind, name)?.read(data.plant);
}

/** The data of the cell showing the value of the property; `null` if it has no such property. */
export function writeProperty(data: ShapeData, name: string, value: TagValue): ShapeData | null {
    const property = propertyOf(data.kind, name);
    return property ? { ...data, plant: property.write(data.plant, value) } : null;
}
