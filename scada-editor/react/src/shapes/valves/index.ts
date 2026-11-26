import { defineShape } from '../define-shape';
import type { ShapePorts, ShapeSpec } from '../types';
import { BallValveDrawing } from './ball-valve';
import { ButterflyValveDrawing } from './butterfly-valve';
import { CheckValveDrawing } from './check-valve';
import { ControlValveDrawing } from './control-valve';
import { GateValveDrawing } from './gate-valve';
import { HandValveDrawing } from './hand-valve';
import { ReliefValveDrawing } from './relief-valve';
import { SolenoidValveDrawing } from './solenoid-valve';

const VALVE_STUB_LENGTH = 20;

/** The stubs of a valve: in and out on the left and the right, at the part of the height (the middle by default). */
function valvePorts(at?: number): ShapePorts {
    return {
        stubLength: VALVE_STUB_LENGTH,
        stubs: [
            { id: 'left', side: 'left', at },
            { id: 'right', side: 'right', at },
        ],
    };
}

const VALVE_PORTS = valvePorts();
// The accent of a valve: its operator (a handwheel, an actuator, a coil, a cap).
const OPERATOR_ACCENT = { key: 'accent' } as const;

const CONTROL_VALVE = defineShape({
    kind: 'ControlValve',
    title: 'Control Valve',
    group: 'Valves',
    description: 'Regulates the flow: open by a part, set by the controller (a slider in the runtime mode).',
    size: { width: 60, height: 60 },
    defaults: { label: { text: 'Valve', position: 'top' }, plant: { open: 1 } },
    Drawing: ControlValveDrawing,
    ports: VALVE_PORTS,
    resizable: false,
    control: 'slider',
    // The actuator on top.
    overflow: { top: 42 },
    accentField: OPERATOR_ACCENT,
});

const HAND_VALVE = defineShape({
    kind: 'HandValve',
    title: 'Hand Valve',
    group: 'Valves',
    description: 'Opened and closed by hand, to isolate a part of the line.',
    size: { width: 60, height: 60 },
    defaults: { label: { text: 'Valve', position: 'top' }, plant: { open: true } },
    Drawing: HandValveDrawing,
    ports: VALVE_PORTS,
    resizable: false,
    control: 'toggle',
    overflow: { top: 30 },
    accentField: OPERATOR_ACCENT,
});

const CHECK_VALVE = defineShape({
    kind: 'CheckValve',
    title: 'Check Valve',
    group: 'Valves',
    description: 'Lets the flow go one way only (the arrow), and stops it from going back.',
    size: { width: 60, height: 40 },
    defaults: { label: { text: 'Check Valve', position: 'bottom' } },
    Drawing: CheckValveDrawing,
    ports: VALVE_PORTS,
    // The flow the other way, the arrow still above it.
    flippable: 'x',
    resizable: { preserveAspectRatio: true },
    overflow: { top: 14 },
    tagPrefix: 'NRV',
});

const BUTTERFLY_VALVE = defineShape({
    kind: 'ButterflyValve',
    title: 'Butterfly Valve',
    group: 'Valves',
    description: 'A disc turning in the pipe: a quick shut-off for the large lines.',
    size: { width: 60, height: 40 },
    defaults: { label: { text: 'Butterfly Valve', position: 'top' }, plant: { open: true } },
    Drawing: ButterflyValveDrawing,
    ports: VALVE_PORTS,
    resizable: false,
    control: 'toggle',
    overflow: { top: 17 },
    tagPrefix: 'BFV',
    // The accent: the pivot.
    accentField: { key: 'accent' },
});

const BALL_VALVE = defineShape({
    kind: 'BallValve',
    title: 'Ball Valve',
    group: 'Valves',
    description: 'A ball with a hole turning in the pipe: a tight shut-off.',
    size: { width: 60, height: 40 },
    defaults: { label: { text: 'Ball Valve', position: 'top' }, plant: { open: true } },
    Drawing: BallValveDrawing,
    ports: VALVE_PORTS,
    resizable: false,
    control: 'toggle',
    overflow: { top: 17 },
});

const SOLENOID_VALVE = defineShape({
    kind: 'SolenoidValve',
    title: 'Solenoid Valve',
    group: 'Valves',
    description: 'Opened and closed by an electric signal (automation, interlocks).',
    size: { width: 60, height: 40 },
    defaults: { label: { text: 'Solenoid Valve', position: 'top' }, plant: { open: true } },
    Drawing: SolenoidValveDrawing,
    ports: VALVE_PORTS,
    resizable: { preserveAspectRatio: true },
    control: 'toggle',
    overflow: { top: 32 },
    accentField: OPERATOR_ACCENT,
});

const RELIEF_VALVE = defineShape({
    kind: 'ReliefValve',
    title: 'Relief Valve',
    group: 'Valves',
    description: 'Opens by itself when the pressure is too high, to protect the equipment.',
    size: { width: 60, height: 80 },
    defaults: { label: { text: 'Relief Valve', position: 'bottom' } },
    Drawing: ReliefValveDrawing,
    // The pipes enter the bottom half.
    ports: valvePorts(0.75),
    resizable: { preserveAspectRatio: true },
    overflow: { top: 8 },
    tagPrefix: 'PSV',
    accentField: OPERATOR_ACCENT,
});

const GATE_VALVE = defineShape({
    kind: 'GateValve',
    title: 'Gate Valve',
    group: 'Valves',
    description: 'A gate sliding across the pipe: fully open or fully closed, with little loss.',
    size: { width: 60, height: 40 },
    defaults: { label: { text: 'Gate Valve', position: 'top' }, plant: { open: true } },
    Drawing: GateValveDrawing,
    ports: VALVE_PORTS,
    resizable: { preserveAspectRatio: true },
    control: 'toggle',
    // The handwheel up on its rising stem.
    overflow: { top: 44 },
    tagPrefix: 'GV',
    accentField: OPERATOR_ACCENT,
});

/** The shapes of the valves group of the palette. */
export const VALVES_SHAPES: readonly ShapeSpec[] = [
    CONTROL_VALVE,
    HAND_VALVE,
    CHECK_VALVE,
    BUTTERFLY_VALVE,
    BALL_VALVE,
    SOLENOID_VALVE,
    RELIEF_VALVE,
    GATE_VALVE,
];
