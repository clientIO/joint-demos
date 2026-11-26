import { defineShape } from '../define-shape';
import type { ShapeSpec } from '../types';
import { BeaconDrawing } from './beacon';
import { DisplayDrawing } from './display';
import { FlowMeterDrawing } from './flow-meter';
import { InstrumentDrawing } from './instrument';
import { LabelDrawing } from './label';
import { PanelDrawing } from './level-panel';
import { PANEL_THRESHOLDS } from './level-panel-layout';
import { PressureGaugeDrawing } from './pressure-gauge';
import { GAUGE_THRESHOLDS } from './pressure-gauge-scale';
import { ThermometerDrawing } from './thermometer';
import { LABEL_COLOR, LIQUID_COLOR, MAX_LIQUID_COLOR } from './values';

// The width of the tube of a thermometer: it is resized taller or shorter only (a wider one would blow up the bulb)
const THERMOMETER_WIDTH = 20;

/** The ISA instrument bubble: its function and loop number, nothing below it. */
const INSTRUMENT = defineShape({
    kind: 'Instrument',
    title: 'Instrument',
    group: 'Instruments',
    description: 'An instrument bubble of the P&ID: the function (PT: a pressure transmitter, FT: a flow transmitter, ...) and the loop number.',
    size: { width: 60, height: 60 },
    defaults: { function: 'PT', loop: '101' },
    Drawing: InstrumentDrawing,
    resizable: { preserveAspectRatio: true },
    rotatable: false,
    layer: 'instruments',
    overflow: { bottom: 0 },
    label: null,
    hasFinish: false,
});

/** The pressure gauge: kept round, its needle the accent, the stem and the label below it. */
const PRESSURE_GAUGE = defineShape({
    kind: 'PressureGauge',
    title: 'Pressure Gauge',
    group: 'Instruments',
    description: 'Shows the pressure with a needle, in the warning colors above the thresholds.',
    size: { width: 60, height: 60 },
    defaults: {
        label: { text: 'Gauge', position: 'bottom' },
        unit: 'bar',
        // The pressure in % of the scale; the warning zones `{ low, high }`
        plant: { value: 60, thresholds: { ...GAUGE_THRESHOLDS } },
    },
    Drawing: PressureGaugeDrawing,
    resizable: { preserveAspectRatio: true },
    rotatable: false,
    layer: 'instruments',
    overflow: { bottom: 38 },
    // Below the stem
    label: (width, height) => ({ x: width / 2, y: height + 20, anchor: 'middle', verticalAnchor: 'top' }),
    accentField: { key: 'accent', defaultValue: 'var(--color-red)' },
});

/** The level panel: its accent the liquid in range, put on its tank. */
const PANEL = defineShape({
    kind: 'Panel',
    title: 'Level Panel',
    group: 'Instruments',
    description: 'Shows the level of a tank, in the warning colors below and above the thresholds. Put it on its tank.',
    size: { width: 100, height: 240 },
    defaults: { plant: { level: 70, thresholds: { ...PANEL_THRESHOLDS } } },
    Drawing: PanelDrawing,
    rotatable: false,
    layer: 'instruments',
    overflow: { bottom: 0 },
    label: null,
    tagPrefix: 'LI',
    accentField: { key: 'accent', defaultValue: LIQUID_COLOR },
});

/** The thermometer: its color the liquid's, its Outline the tube's; the scale and the reading on its right. */
const THERMOMETER = defineShape({
    kind: 'Thermometer',
    title: 'Thermometer',
    group: 'Instruments',
    description: 'Shows the temperature.',
    size: { width: THERMOMETER_WIDTH, height: 120 },
    defaults: { label: { text: 'Thermometer', position: 'bottom' }, plant: { value: 60 } },
    Drawing: ThermometerDrawing,
    resizable: { minWidth: THERMOMETER_WIDTH, maxWidth: THERMOMETER_WIDTH },
    rotatable: false,
    layer: 'instruments',
    overflow: { right: 56, bottom: 34, left: 6 },
    label: (width, height) => ({ x: width / 2, y: height + 16, anchor: 'middle', verticalAnchor: 'top' }),
    tagPrefix: 'TI',
    hasFinish: false,
    colorField: { key: 'color', defaultValue: MAX_LIQUID_COLOR, isPart: true },
    outlineField: { key: 'outline' },
});

/** The inline flow meter: on the line, its reading the accent. */
const FLOW_METER = defineShape({
    kind: 'FlowMeter',
    title: 'Flow Meter',
    group: 'Instruments',
    description: 'Measures and shows the flow through the line.',
    size: { width: 80, height: 60 },
    defaults: { label: { text: 'Flow Meter', position: 'bottom' }, unit: 'm³/h', plant: { value: 12.5 } },
    Drawing: FlowMeterDrawing,
    ports: {
        stubLength: 20,
        stubs: [
            { id: 'left', side: 'left' },
            { id: 'right', side: 'right' },
        ],
    },
    rotatable: false,
    layer: 'instruments',
    accentField: { key: 'accent', defaultValue: LIQUID_COLOR },
});

/** The alarm beacon: switched on and off in run mode, lit while on. */
const BEACON = defineShape({
    kind: 'Beacon',
    title: 'Beacon',
    group: 'Instruments',
    description: 'An alarm light: it pulses while the alarm is on.',
    size: { width: 40, height: 50 },
    // On in the palette
    defaults: { label: { text: 'Beacon', position: 'bottom' }, plant: { power: 1 } },
    Drawing: BeaconDrawing,
    resizable: { preserveAspectRatio: true },
    rotatable: false,
    control: 'power',
    layer: 'instruments',
    tagPrefix: 'AL',
});

/** The panel display: a value with its unit, in the accent. */
const DISPLAY = defineShape({
    kind: 'Display',
    title: 'Display',
    group: 'Instruments',
    description: 'Shows a value of the plant with its unit.',
    size: { width: 120, height: 60 },
    defaults: { label: { text: 'Display', position: 'bottom' }, unit: 'bar', plant: { value: 42.7 } },
    Drawing: DisplayDrawing,
    rotatable: false,
    layer: 'instruments',
    tagPrefix: 'DI',
    accentField: { key: 'accent', defaultValue: LIQUID_COLOR },
});

/** A text on the canvas: its label is the text it draws (no label below it), never a part of the plant. */
const LABEL = defineShape({
    kind: 'Label',
    title: 'Label',
    group: 'Instruments',
    description: 'A text on the diagram: a name of an area, a note.',
    size: { width: 120, height: 40 },
    defaults: { label: { text: 'Label', size: 20, weight: 600, align: 'middle' } },
    Drawing: LabelDrawing,
    layer: 'instruments',
    overflow: { bottom: 0 },
    label: null,
    tagPrefix: null,
    hasFinish: false,
    colorField: { key: 'color', defaultValue: LABEL_COLOR, isPart: true },
});

/** The shapes of the instruments group of the palette (the signal line and the arrow are links). */
export const INSTRUMENTS_SHAPES: readonly ShapeSpec[] = [INSTRUMENT, PRESSURE_GAUGE, PANEL, THERMOMETER, FLOW_METER, BEACON, DISPLAY, LABEL];
