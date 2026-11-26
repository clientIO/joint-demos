import { defineShape } from '../define-shape';
import type { ShapeSpec } from '../types';
import { BlowerDrawing } from './blower';
import { CompressorDrawing } from './compressor';
import { FanDrawing } from './fan';
import { MotorDrawing } from './motor';
import { PumpDrawing } from './pump';
import { TurbineDrawing } from './turbine';

// The pipe stubs of most of the rotating equipment: in the middles of the left and the right sides.
const middleStubs = (stubLength: number) => ({
    stubLength,
    stubs: [
        { id: 'left', side: 'left', z: 0 },
        { id: 'right', side: 'right', z: 0 },
    ],
} as const);

/** The pump of the Rotating Equipment group. */
const PUMP = defineShape({
    kind: 'Pump',
    title: 'Pump',
    group: 'Rotating Equipment',
    description: 'Moves the liquid through the pipes. Switched on and off in the runtime mode.',
    size: { width: 100, height: 100 },
    defaults: { label: { text: 'Pump', position: 'bottom' }, plant: { power: 0 } },
    Drawing: PumpDrawing,
    ports: {
        stubLength: 30,
        // The inlet (left) low and over the casing, the outlet (right) high and behind it.
        stubs: [
            { id: 'left', side: 'left', at: 0.7, z: 1 },
            { id: 'right', side: 'right', at: 0.3, z: 0 },
        ],
    },
    resizable: false,
    flippable: 'x',
    control: 'power',
});

const COMPRESSOR = defineShape({
    kind: 'Compressor',
    title: 'Compressor',
    group: 'Rotating Equipment',
    description: 'Raises the pressure of a gas (air, steam, a process gas).',
    size: { width: 80, height: 80 },
    defaults: { label: { text: 'Compressor', position: 'bottom' }, plant: { power: 0 } },
    Drawing: CompressorDrawing,
    ports: middleStubs(30),
    resizable: { preserveAspectRatio: true },
    flippable: 'x',
    control: 'power',
    accentField: { key: 'accent', defaultValue: 'var(--shape-support)' },
});

const FAN = defineShape({
    kind: 'Fan',
    title: 'Fan',
    group: 'Rotating Equipment',
    description: 'Moves air or a gas at a low pressure (ventilation, combustion air).',
    size: { width: 100, height: 100 },
    defaults: { label: { text: 'Fan', position: 'bottom' }, plant: { power: 0 } },
    Drawing: FanDrawing,
    ports: middleStubs(30),
    resizable: false,
    flippable: 'x',
    control: 'power',
    tagPrefix: 'FN',
});

const BLOWER = defineShape({
    kind: 'Blower',
    title: 'Blower',
    group: 'Rotating Equipment',
    description: 'Moves air or a gas at a moderate pressure (aeration, conveying).',
    size: { width: 100, height: 100 },
    defaults: { label: { text: 'Blower', position: 'bottom' }, plant: { power: 0 } },
    Drawing: BlowerDrawing,
    ports: middleStubs(20),
    resizable: false,
    flippable: 'x',
    control: 'power',
    tagPrefix: 'BL',
    overflow: { top: 14, bottom: 34 },
    // Below its base.
    label: (width, height) => ({ x: width / 2, y: height + 14, anchor: 'middle', verticalAnchor: 'top' }),
    accentField: { key: 'accent', defaultValue: 'var(--shape-support)' },
});

const MOTOR = defineShape({
    kind: 'Motor',
    title: 'Motor',
    group: 'Rotating Equipment',
    description: 'An electric motor driving the equipment next to it.',
    size: { width: 100, height: 60 },
    defaults: { label: { text: 'Motor', position: 'bottom' }, plant: { power: 0 } },
    Drawing: MotorDrawing,
    control: 'power',
    overflow: { top: 12, right: 20, bottom: 34, left: 8 },
    // Below its feet.
    label: (width, height) => ({ x: width / 2, y: height + 16, anchor: 'middle', verticalAnchor: 'top' }),
    accentField: { key: 'accent', defaultValue: 'var(--shape-terminal-box)' },
});

const TURBINE = defineShape({
    kind: 'Turbine',
    title: 'Turbine',
    group: 'Rotating Equipment',
    description: 'Turns the energy of the steam or a gas into the rotation of a shaft (a generator, a compressor).',
    size: { width: 120, height: 80 },
    defaults: { label: { text: 'Turbine', position: 'bottom' }, plant: { power: 0 } },
    Drawing: TurbineDrawing,
    ports: middleStubs(30),
    flippable: 'x',
    control: 'power',
    tagPrefix: 'TB',
});

/** The shapes of the Rotating Equipment group of the palette, in its order. */
export const ROTATING_SHAPES: readonly ShapeSpec[] = [PUMP, COMPRESSOR, FAN, BLOWER, MOTOR, TURBINE];
