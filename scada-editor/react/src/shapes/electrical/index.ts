import { defineShape } from '../define-shape';
import type { LabelPlacement, ShapeData, ShapePorts, ShapeSpec, Terminal } from '../types';
import { BatteryBankDrawing } from './battery-bank';
import { BatteryDrawing } from './battery';
import { BusbarDrawing } from './busbar';
import { CircuitBreakerDrawing } from './circuit-breaker';
import { DieselGeneratorDrawing } from './diesel-generator';
import { DisconnectorDrawing } from './disconnector';
import { ElectricMeterDrawing } from './electric-meter';
import {
    BATTERY_MINUS_X,
    BATTERY_PLUS_X,
    BUSBAR_MIN_WIDTH,
    busbarMinWidth,
    busbarTapCount,
    busbarTapX,
    DISCONNECTOR_BLADE_Y,
    LIQUID_COLOR,
} from './electrical';
import { FuseDrawing } from './fuse';
import { GeneratorDrawing } from './generator';
import { GroundDrawing } from './ground';
import { HeaterDrawing } from './heater';
import { LampDrawing } from './lamp';
import { MotorControlCenterDrawing } from './motor-control-center';
import { PowerTransformerDrawing } from './power-transformer';
import { SolarArrayDrawing } from './solar-array';
import { SurgeArresterDrawing } from './surge-arrester';
import { SwitchgearDrawing } from './switchgear';
import { TransformerDrawing } from './transformer';
import { WindTurbineDrawing } from './wind-turbine';

// The panels of a switchgear: a feeder at the bottom of each
const SWITCHGEAR_PANELS = 4;
// The height of a disconnector: not resized, its terminals at the height of the blade
const DISCONNECTOR_HEIGHT = 60;
// The height of a busbar: it is resized along its length only
const BUSBAR_HEIGHT = 20;

/** A terminal in on the left and one out on the right, in the middle. */
const IN_OUT: ShapePorts = {
    terminals: [
        { id: 'in', side: 'left' },
        { id: 'out', side: 'right' },
    ],
};

/** The label above the shape (its terminals are at the bottom), not below. */
const ABOVE = (width: number): LabelPlacement => ({ x: width / 2, y: -8, anchor: 'middle', verticalAnchor: 'bottom' });

/** The terminals of a busbar: one on each end, a tap on the top and one on the bottom as many times as its length takes. */
function busbarPorts(_data: ShapeData, { width }: { readonly width: number }): ShapePorts {
    const taps = Array.from({ length: busbarTapCount(width) }, (_, i) => i);
    const tap = (side: 'top' | 'bottom', i: number): Terminal => ({ id: `${side}${i + 1}`, side, at: busbarTapX(i) / width });
    return {
        terminals: [
            { id: 'left', side: 'left' },
            { id: 'right', side: 'right' },
            ...taps.map((i) => tap('top', i)),
            ...taps.map((i) => tap('bottom', i)),
        ],
    };
}

const DIESEL_GENERATOR = defineShape({
    kind: 'DieselGenerator',
    title: 'Diesel Generator',
    group: 'Electrical',
    description: 'An engine and an alternator on a skid: a source of the power while it runs. The fuel comes in by the pipe on the left.',
    size: { width: 200, height: 100 },
    defaults: { label: { text: 'Diesel Generator', position: 'bottom' }, plant: { power: 1 } },
    Drawing: DieselGeneratorDrawing,
    ports: {
        stubLength: 20,
        stubs: [{ id: 'left', side: 'left', at: 0.6 }],
        terminals: [{ id: 'out', side: 'right', at: 0.6 }],
    },
    resizable: { preserveAspectRatio: true },
    control: 'power',
    // The exhaust stack (and its smoke) above it
    overflow: { top: 50 },
    tagPrefix: 'DG',
    accentField: { key: 'accent', defaultValue: 'var(--shape-skid)' },
});

const WIND_TURBINE = defineShape({
    kind: 'WindTurbine',
    title: 'Wind Turbine',
    group: 'Electrical',
    description: 'A source of the power while it runs: its rotor spins.',
    size: { width: 140, height: 220 },
    defaults: { label: { text: 'Wind Turbine', position: 'bottom' }, plant: { power: 1 } },
    Drawing: WindTurbineDrawing,
    ports: { terminals: [{ id: 'out', side: 'bottom' }] },
    resizable: false,
    rotatable: false,
    control: 'power',
    // The label beside the base (the wire leaves it down)
    overflow: { right: 40, bottom: 0 },
    label: (width, height) => ({ x: width / 2 + 16, y: height, anchor: 'start', verticalAnchor: 'bottom' }),
    tagPrefix: 'WT',
});

const SOLAR_ARRAY = defineShape({
    kind: 'SolarArray',
    title: 'Solar Array',
    group: 'Electrical',
    description: 'A source of the power from the sun.',
    size: { width: 180, height: 100 },
    defaults: { label: { text: 'Solar Array', position: 'bottom' } },
    Drawing: SolarArrayDrawing,
    ports: { terminals: [{ id: 'out', side: 'right', at: 0.3 }] },
    resizable: { preserveAspectRatio: true },
    tagPrefix: 'PV',
    // The panel has a color of its own: only the edges of the metal, outlined
    hasFinish: false,
    outlineField: { key: 'outline' },
});

const POWER_TRANSFORMER = defineShape({
    kind: 'PowerTransformer',
    title: 'Power Transformer',
    group: 'Electrical',
    description:
        'The tank with its cooling radiators, the oil conservator and the bushings: changes the voltage between its high (left) and low (right) side.',
    size: { width: 160, height: 150 },
    defaults: { label: { text: 'Power Transformer', position: 'bottom' } },
    Drawing: PowerTransformerDrawing,
    ports: {
        terminals: [
            { id: 'hv', side: 'left', at: 0.6 },
            { id: 'lv', side: 'right', at: 0.6 },
        ],
    },
    resizable: { preserveAspectRatio: true },
    // The bushings above it
    overflow: { top: 34 },
    tagPrefix: 'TX',
});

const SWITCHGEAR = defineShape({
    kind: 'Switchgear',
    title: 'Switchgear',
    group: 'Electrical',
    description: 'Cabinet panels with the breakers: the power in on the sides, the feeders at the bottom. Its lamps are lit while it is energized.',
    size: { width: 240, height: 150 },
    defaults: { label: { text: 'Switchgear', position: 'bottom' } },
    Drawing: SwitchgearDrawing,
    ports: {
        terminals: [
            { id: 'in1', side: 'left', at: 0.2 },
            { id: 'in2', side: 'right', at: 0.2 },
            ...Array.from({ length: SWITCHGEAR_PANELS }, (_, i): Terminal => ({ id: `feeder${i + 1}`, side: 'bottom', at: (i + 0.5) / SWITCHGEAR_PANELS })),
        ],
    },
    resizable: { preserveAspectRatio: true },
    overflow: { top: 24, bottom: 0 },
    label: ABOVE,
    tagPrefix: 'SWG',
});

const MOTOR_CONTROL_CENTER = defineShape({
    kind: 'MotorControlCenter',
    title: 'Motor Control Center',
    group: 'Electrical',
    description: 'A cabinet of the starters of the motors: fed from the left, the motors connected at the bottom. Its lamps are lit while it is energized.',
    size: { width: 120, height: 200 },
    defaults: { label: { text: 'Motor Control Center', position: 'bottom' } },
    Drawing: MotorControlCenterDrawing,
    ports: {
        terminals: [
            { id: 'in', side: 'left', at: 0.1 },
            { id: 'out1', side: 'bottom', at: 0.25 },
            { id: 'out2', side: 'bottom', at: 0.5 },
            { id: 'out3', side: 'bottom', at: 0.75 },
        ],
    },
    resizable: { preserveAspectRatio: true },
    overflow: { top: 24, bottom: 0 },
    label: ABOVE,
    tagPrefix: 'MCC',
});

const BATTERY_BANK = defineShape({
    kind: 'BatteryBank',
    title: 'Battery Bank',
    group: 'Electrical',
    description: 'A storage of the energy (a UPS): a source of the power, its charge on the gauge.',
    size: { width: 160, height: 100 },
    defaults: { label: { text: 'Battery Bank', position: 'bottom' }, plant: { level: 80 } },
    Drawing: BatteryBankDrawing,
    ports: { terminals: [{ id: 'out', side: 'right', at: 0.4 }] },
    resizable: { preserveAspectRatio: true },
    tagPrefix: 'BESS',
    accentField: { key: 'accent', defaultValue: LIQUID_COLOR },
});

const GENERATOR = defineShape({
    kind: 'Generator',
    title: 'Generator',
    group: 'Electrical',
    description: 'A source of the power while it runs (switched on and off in the runtime mode).',
    size: { width: 120, height: 80 },
    defaults: { label: { text: 'Generator', position: 'bottom' }, plant: { power: 1 } },
    Drawing: GeneratorDrawing,
    // The cables out of the terminal box on the top
    ports: { terminals: [{ id: 'out', side: 'top' }] },
    resizable: { preserveAspectRatio: true },
    control: 'power',
    tagPrefix: 'G',
});

const TRANSFORMER = defineShape({
    kind: 'Transformer',
    title: 'Transformer',
    group: 'Electrical',
    description: 'Changes the voltage between its two windings.',
    size: { width: 80, height: 100 },
    defaults: { label: { text: 'Transformer', position: 'bottom' } },
    Drawing: TransformerDrawing,
    ports: IN_OUT,
    resizable: { preserveAspectRatio: true },
    // The bushings above it
    overflow: { top: 22 },
    tagPrefix: 'TR',
});

const BUSBAR = defineShape({
    kind: 'Busbar',
    title: 'Busbar',
    group: 'Electrical',
    description: 'A conductor many circuits are connected to: terminals on its ends, on the top and on the bottom.',
    size: { width: 240, height: BUSBAR_HEIGHT },
    // `taps`: as many as the default length takes (kept for the diagrams saved by the TypeScript version)
    defaults: { label: { text: 'Busbar' }, taps: 3 },
    Drawing: BusbarDrawing,
    ports: busbarPorts,
    resizable: { minWidth: BUSBAR_MIN_WIDTH, minHeight: BUSBAR_HEIGHT, maxHeight: BUSBAR_HEIGHT },
    // Not shorter than its connected taps take: their ports stay (see `DerivedPorts`)
    minWidthOf: busbarMinWidth,
    // The label above its left end, over the terminals of the top taps (they reach 16 above it)
    overflow: { top: 40, bottom: 0 },
    label: () => ({ x: 0, y: -22, anchor: 'start', verticalAnchor: 'bottom' }),
    tagPrefix: 'BB',
    // Copper only: no surface of the metal to color, none outlined
    colorField: null,
    outlineField: null,
});

const BATTERY = defineShape({
    kind: 'Battery',
    title: 'Battery',
    group: 'Electrical',
    description: 'A source of the power, always.',
    size: { width: 80, height: 60 },
    defaults: { label: { text: 'Battery', position: 'bottom' } },
    Drawing: BatteryDrawing,
    ports: {
        terminals: [
            { id: 'minus', side: 'top', at: BATTERY_MINUS_X },
            { id: 'plus', side: 'top', at: BATTERY_PLUS_X },
        ],
    },
    resizable: false,
    // The posts above it
    overflow: { top: 10 },
    tagPrefix: 'BAT',
});

const CIRCUIT_BREAKER = defineShape({
    kind: 'CircuitBreaker',
    title: 'Circuit Breaker',
    group: 'Electrical',
    description: 'The current passes while it is closed (red); open (green) it cuts the circuit. Opened and closed in the runtime mode.',
    size: { width: 60, height: 80 },
    // Above it: its control below
    defaults: { label: { text: 'Breaker', position: 'top' }, plant: { open: false } },
    Drawing: CircuitBreakerDrawing,
    ports: IN_OUT,
    resizable: false,
    control: 'toggle',
    tagPrefix: 'CB',
});

const DISCONNECTOR = defineShape({
    kind: 'Disconnector',
    title: 'Disconnector',
    group: 'Electrical',
    description: 'A switch isolating a part of the circuit: its blade lifts off the contact when open.',
    size: { width: 100, height: DISCONNECTOR_HEIGHT },
    // Above it: its control below
    defaults: { label: { text: 'Disconnector', position: 'top' }, plant: { open: false } },
    Drawing: DisconnectorDrawing,
    // At the height of the blade
    ports: {
        terminals: [
            { id: 'in', side: 'left', at: DISCONNECTOR_BLADE_Y / DISCONNECTOR_HEIGHT },
            { id: 'out', side: 'right', at: DISCONNECTOR_BLADE_Y / DISCONNECTOR_HEIGHT },
        ],
    },
    resizable: false,
    control: 'toggle',
    tagPrefix: 'DS',
});

const FUSE = defineShape({
    kind: 'Fuse',
    title: 'Fuse',
    group: 'Electrical',
    description: 'Protects the circuit from an overcurrent.',
    size: { width: 80, height: 20 },
    defaults: { label: { text: 'Fuse', position: 'bottom' } },
    Drawing: FuseDrawing,
    ports: IN_OUT,
    resizable: false,
    tagPrefix: 'FU',
});

const SURGE_ARRESTER = defineShape({
    kind: 'SurgeArrester',
    title: 'Surge Arrester',
    group: 'Electrical',
    description: 'Leads an overvoltage (a lightning strike) to the ground.',
    size: { width: 40, height: 80 },
    defaults: { label: { text: 'Surge Arrester', position: 'bottom' } },
    Drawing: SurgeArresterDrawing,
    ports: {
        terminals: [
            { id: 'line', side: 'top' },
            { id: 'ground', side: 'bottom' },
        ],
    },
    resizable: false,
    // The label on the right: its terminals are on the top and the bottom
    overflow: { right: 110, bottom: 0 },
    label: (width, height) => ({ x: width + 10, y: height / 2, anchor: 'start', verticalAnchor: 'middle' }),
    tagPrefix: 'SA',
});

const GROUND = defineShape({
    kind: 'Ground',
    title: 'Ground',
    group: 'Electrical',
    description: 'The earth: the reference of the voltage, where a fault current goes.',
    size: { width: 60, height: 60 },
    defaults: { label: { text: 'Ground', position: 'bottom' } },
    Drawing: GroundDrawing,
    ports: { terminals: [{ id: 'in', side: 'top' }] },
    resizable: false,
    tagPrefix: 'GND',
    accentField: { key: 'accent', defaultValue: 'var(--shape-soil)' },
});

const LAMP = defineShape({
    kind: 'Lamp',
    title: 'Lamp',
    group: 'Electrical',
    description: 'A load: lit while it is energized.',
    size: { width: 60, height: 80 },
    defaults: { label: { text: 'Lamp', position: 'bottom' } },
    Drawing: LampDrawing,
    ports: { terminals: [{ id: 'in', side: 'top' }] },
    resizable: false,
    tagPrefix: 'LMP',
});

const HEATER = defineShape({
    kind: 'Heater',
    title: 'Heater',
    group: 'Electrical',
    description: 'An electric heater, a load: glows while it is energized.',
    size: { width: 80, height: 60 },
    defaults: { label: { text: 'Heater', position: 'bottom' } },
    Drawing: HeaterDrawing,
    ports: { terminals: [{ id: 'in', side: 'top' }] },
    resizable: false,
    tagPrefix: 'HTR',
});

const ELECTRIC_METER = defineShape({
    kind: 'ElectricMeter',
    title: 'Voltmeter',
    group: 'Electrical',
    description: 'Shows the voltage of the circuit: zero while it is not energized.',
    size: { width: 120, height: 60 },
    defaults: { label: { text: 'Voltmeter', position: 'bottom' }, unit: 'V', plant: { value: 230 } },
    Drawing: ElectricMeterDrawing,
    ports: IN_OUT,
    resizable: false,
    rotatable: false,
    layer: 'instruments',
    tagPrefix: 'EI',
    accentField: { key: 'accent', defaultValue: LIQUID_COLOR },
});

/** The shapes of the Electrical group of the palette, in its order (the wire is a link, not here). */
export const ELECTRICAL_SHAPES: readonly ShapeSpec[] = [
    DIESEL_GENERATOR,
    WIND_TURBINE,
    SOLAR_ARRAY,
    POWER_TRANSFORMER,
    SWITCHGEAR,
    MOTOR_CONTROL_CENTER,
    BATTERY_BANK,
    GENERATOR,
    TRANSFORMER,
    BUSBAR,
    BATTERY,
    CIRCUIT_BREAKER,
    DISCONNECTOR,
    FUSE,
    SURGE_ARRESTER,
    GROUND,
    LAMP,
    HEATER,
    ELECTRIC_METER,
];
