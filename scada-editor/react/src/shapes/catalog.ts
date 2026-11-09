import type { ComponentType } from 'react';
import type { ElementPort } from '@joint/react-plus';
import type { EquipmentData, EquipmentKind } from '../plant/model';
import type { Metal } from './metal';
import { BreakerSymbol, GeneratorSymbol, TransformerSymbol } from './symbols/electrical';
import { BeaconSymbol, DisplaySymbol, FlowMeterSymbol, PressureGaugeSymbol, ThermometerSymbol } from './symbols/instruments';
import { BoilerSymbol, FilterSymbol, HeatExchangerSymbol, SiloSymbol, TankSymbol } from './symbols/process';
import { CompressorSymbol, FanSymbol, MotorSymbol, PumpSymbol } from './symbols/rotating';
import { CheckValveSymbol, ControlValveSymbol, HandValveSymbol } from './symbols/valves';

/** A section of the palette. */
export type PaletteGroup = 'Rotating' | 'Valves' | 'Process' | 'Storage' | 'Instruments' | 'Electrical';

/** A control's two states and the verbs that switch between them. */
export interface Control {
    readonly on: string;
    readonly off: string;
    readonly start: string;
    readonly stop: string;
}

/** What a symbol draws from: the element's data and the shading of its metal. */
export interface SymbolProps {
    readonly data: EquipmentData;
    readonly metal: Metal;
}

/** A side of an element's box. */
export type Side = 'left' | 'right' | 'top' | 'bottom';

/**
 * A pipe stub out of a side, `length` long, at the part `at` of the side: drawn
 * by the element, its flange at the outer end is the port a pipe connects to.
 * A stub 0 long is a flange on the body (a nozzle of a vessel).
 */
export interface Stub {
    readonly id: string;
    readonly side: Side;
    readonly at?: number;
    readonly length: number;
}

/** An electrical terminal: a lead out of a side, its end the port a wire connects to. */
export interface Terminal {
    readonly id: string;
    readonly side: Side;
    readonly at?: number;
}

/** A kind of equipment: its name, size, ports, symbol and behavior. */
export interface EquipmentSpec {
    readonly name: string;
    readonly group: PaletteGroup;
    readonly tagPrefix: string;
    readonly width: number;
    readonly height: number;
    readonly stubs?: readonly Stub[];
    readonly terminals?: readonly Terminal[];
    readonly Icon: ComponentType<SymbolProps>;
    readonly control?: Control;
    /** An instrument: it reads the equipment named by its `source` tag. */
    readonly reads?: 'pressure' | 'temperature' | 'any' | 'alarm';
    /** What its `value` is, as the log names it. */
    readonly reading?: string;
    /** The unit of its `value`. */
    readonly unit?: string;
}

/**
 * Whether a port is an electrical terminal. Port ids name their family: a pipe
 * stub (`in`, `out`, ...) or an electrical terminal (`e...`). Pipes connect
 * stubs, wires connect terminals.
 */
export const isElectricalPort = (port: string | undefined): boolean => port?.startsWith('e') ?? false;

/** The thickness of a flange, along its stub. */
export const FLANGE_WIDTH = 10;
/** The span of a flange, across its stub. */
const FLANGE_HEIGHT = 36;
/** The thickness of a pipe stub, and of a pipe running through a body. */
export const STUB_THICKNESS = 30;
/** The length of an electrical lead, out of its side to the terminal. */
export const TERMINAL_LENGTH = 12;
/** The diameter of a terminal, the end of a lead. */
const TERMINAL_SIZE = 9;

const RUN: Control = { on: 'Running', off: 'Stopped', start: 'Start', stop: 'Stop' };
const OPEN: Control = { on: 'Open', off: 'Closed', start: 'Open', stop: 'Close' };

const through = (length: number, left = 0.5, right = 0.5): readonly Stub[] => [
    { id: 'in', side: 'left', at: left, length },
    { id: 'out', side: 'right', at: right, length },
];

/**
 * Every kind of equipment: the sizes and the stubs of the TypeScript SCADA
 * editor's shapes. The symbol files assume these sizes: change both together.
 */
export const CATALOG: Record<EquipmentKind, EquipmentSpec> = {
    pump: { name: 'Pump', group: 'Rotating', tagPrefix: 'P', width: 100, height: 100, Icon: PumpSymbol, control: RUN, stubs: through(30, 0.7, 0.3) },
    compressor: { name: 'Compressor', group: 'Rotating', tagPrefix: 'C', width: 80, height: 80, Icon: CompressorSymbol, control: RUN, stubs: through(30) },
    fan: { name: 'Fan', group: 'Rotating', tagPrefix: 'F', width: 100, height: 100, Icon: FanSymbol, control: RUN, stubs: through(30) },
    motor: { name: 'Motor', group: 'Rotating', tagPrefix: 'M', width: 100, height: 60, Icon: MotorSymbol, terminals: [{ id: 'e1', side: 'left' }] },
    handValve: { name: 'Hand valve', group: 'Valves', tagPrefix: 'HV', width: 60, height: 60, Icon: HandValveSymbol, control: OPEN, stubs: through(20) },
    controlValve: { name: 'Control valve', group: 'Valves', tagPrefix: 'CV', width: 60, height: 60, Icon: ControlValveSymbol, control: OPEN, stubs: through(20) },
    checkValve: { name: 'Check valve', group: 'Valves', tagPrefix: 'NRV', width: 60, height: 40, Icon: CheckValveSymbol, stubs: through(20) },
    boiler: {
        name: 'Boiler', group: 'Process', tagPrefix: 'B', width: 120, height: 160, Icon: BoilerSymbol,
        control: { on: 'Firing', off: 'Off', start: 'Fire', stop: 'Stop' }, reading: 'pressure', unit: 'bar',
        stubs: [{ id: 'in', side: 'left', at: 0.62, length: 0 }, { id: 'steam', side: 'top', at: 0.5, length: 0 }, { id: 'fuel', side: 'right', at: 0.85, length: 0 }],
    },
    heatExchanger: { name: 'Heat exchanger', group: 'Process', tagPrefix: 'E', width: 160, height: 60, Icon: HeatExchangerSymbol, stubs: through(30) },
    filter: { name: 'Filter', group: 'Process', tagPrefix: 'FL', width: 60, height: 80, Icon: FilterSymbol, stubs: through(30) },
    tank: {
        name: 'Tank', group: 'Storage', tagPrefix: 'TK', width: 120, height: 200, Icon: TankSymbol,
        stubs: [{ id: 'in', side: 'left', at: 0.15, length: 0 }, { id: 'out', side: 'right', at: 0.88, length: 0 }],
    },
    silo: {
        name: 'Silo', group: 'Storage', tagPrefix: 'SL', width: 100, height: 220, Icon: SiloSymbol,
        stubs: [{ id: 'in', side: 'top', length: 0 }, { id: 'out', side: 'bottom', length: 0 }],
    },
    flowMeter: { name: 'Flow meter', group: 'Instruments', tagPrefix: 'FT', width: 80, height: 60, Icon: FlowMeterSymbol, reading: 'flow', unit: 'm³/h', stubs: through(20) },
    pressureGauge: { name: 'Pressure gauge', group: 'Instruments', tagPrefix: 'PI', width: 60, height: 60, Icon: PressureGaugeSymbol, reads: 'pressure', reading: 'pressure', unit: 'bar' },
    thermometer: { name: 'Thermometer', group: 'Instruments', tagPrefix: 'TI', width: 30, height: 120, Icon: ThermometerSymbol, reads: 'temperature', reading: 'temperature', unit: '°C' },
    display: { name: 'Display', group: 'Instruments', tagPrefix: 'DI', width: 120, height: 60, Icon: DisplaySymbol, reads: 'any', reading: 'reading' },
    beacon: { name: 'Alarm beacon', group: 'Instruments', tagPrefix: 'AL', width: 40, height: 50, Icon: BeaconSymbol, reads: 'alarm' },
    generator: { name: 'Generator', group: 'Electrical', tagPrefix: 'G', width: 120, height: 80, Icon: GeneratorSymbol, control: RUN, reading: 'output', unit: 'kW', terminals: [{ id: 'e1', side: 'right' }] },
    transformer: { name: 'Transformer', group: 'Electrical', tagPrefix: 'T', width: 80, height: 100, Icon: TransformerSymbol, terminals: [{ id: 'e1', side: 'left' }, { id: 'e2', side: 'right' }] },
    breaker: { name: 'Breaker', group: 'Electrical', tagPrefix: 'CB', width: 60, height: 80, Icon: BreakerSymbol, control: { on: 'Closed', off: 'Open', start: 'Close', stop: 'Open' }, terminals: [{ id: 'e1', side: 'left' }, { id: 'e2', side: 'right' }] },
};

/** The palette's sections, in order. */
export const PALETTE_GROUPS: readonly PaletteGroup[] = ['Rotating', 'Valves', 'Process', 'Storage', 'Instruments', 'Electrical'];

/** Whether a string names a kind of the catalog (own keys only: `toString` is no kind). */
export function isEquipmentKind(value: string): value is EquipmentKind {
    return Object.hasOwn(CATALOG, value);
}

/** Whether a side is the left or the right one: a stub out of it runs horizontally. */
export const isAcross = (side: Side): boolean => side === 'left' || side === 'right';

/** The point `distance` out of a side, at the part `at` along it, in the element's own box. */
export function sidePoint(
    side: Side,
    at: number,
    distance: number,
    width: number,
    height: number,
): { readonly x: number; readonly y: number } {
    switch (side) {
        case 'left':
            return { x: -distance, y: at * height };
        case 'right':
            return { x: width + distance, y: at * height };
        case 'top':
            return { x: at * width, y: -distance };
        case 'bottom':
            return { x: at * width, y: height + distance };
    }
}

/** The ports of a kind: the flanges at the ends of its stubs, the ends of its terminals. */
export function portsOf(spec: EquipmentSpec): Record<string, ElementPort> {
    const ports: Record<string, ElementPort> = {};
    for (const { id, side, at = 0.5, length } of spec.stubs ?? []) {
        const { x, y } = sidePoint(side, at, length + FLANGE_WIDTH / 2, spec.width, spec.height);
        ports[id] = {
            cx: x,
            cy: y,
            shape: 'rect',
            width: isAcross(side) ? FLANGE_WIDTH : FLANGE_HEIGHT,
            height: isAcross(side) ? FLANGE_HEIGHT : FLANGE_WIDTH,
            className: 'flange',
        };
    }
    for (const { id, side, at = 0.5 } of spec.terminals ?? []) {
        const { x, y } = sidePoint(side, at, TERMINAL_LENGTH, spec.width, spec.height);
        ports[id] = { cx: x, cy: y, shape: 'ellipse', width: TERMINAL_SIZE, height: TERMINAL_SIZE, className: 'terminal' };
    }
    return ports;
}
