import { defineShape } from '../define-shape';
import { LIQUID_COLOR, MAX_LIQUID_COLOR } from '../instruments/values';
import type { ShapeSpec } from '../types';
import { BarChartDrawing } from './bar-chart';
import { DonutChartDrawing } from './donut-chart';
import { GaugeChartDrawing } from './gauge-chart';
import { LineChartDrawing } from './line-chart';
import { CHART_POINTS } from './plot';
import { TableDrawing } from './table';
import { HEAD_HEIGHT, minTableWidth, ROW_HEIGHT, STATE_LIST_COLUMNS, TABLE_COLUMNS, TITLE_HEIGHT } from './table-layout';

// The recent values of a line chart: a wave around the middle of the scale
const WAVE_MIDDLE = 50;
const WAVE_HEIGHT = 20;

const TABLE_DESCRIPTION =
    'Values in rows and columns (from the plant in the run mode): texts, numbers or states (a dot); the columns in the inspector, the rows by resizing it (its bottom), a title and the names of the columns shown or not.';

/** What the two tables of the palette have in common: not rotated (a table is read), resized by its sides and bottom. */
const TABLE_BASE = {
    kind: 'Table',
    title: 'Table',
    group: 'Charts',
    description: TABLE_DESCRIPTION,
    Drawing: TableDrawing,
    rotatable: false,
    overflow: { bottom: 0 },
    label: null,
    // `TBL`, not the initials `T` (a turbine is `T`)
    tagPrefix: 'TBL',
    hasFinish: false,
    colorField: { key: 'color', defaultValue: 'var(--shape-face)', isPart: true },
    outlineField: { key: 'outline', defaultValue: 'var(--shape-table-line)', isPart: true },
    accentField: { key: 'accent', defaultValue: 'var(--shape-table-header)' },
} as const;

/** The table with a title and the names of its columns: names and values. */
const TABLE = defineShape({
    ...TABLE_BASE,
    size: { width: 240, height: TITLE_HEIGHT + HEAD_HEIGHT + 3 * ROW_HEIGHT },
    defaults: {
        header: true,
        title: 'Table',
        names: true,
        columns: TABLE_COLUMNS,
        rows: 3,
        plant: {
            values: [
                ['Pump 1', '12.4'],
                ['Pump 2', '8.1'],
                ['Pump 3', '0.0'],
            ],
        },
    },
    resizable: { minWidth: minTableWidth(TABLE_COLUMNS), minHeight: TITLE_HEIGHT + HEAD_HEIGHT + ROW_HEIGHT, directions: ['left', 'right', 'bottom'] },
});

/** The table without a header and names: a row of a state, a value and its unit. */
const STATE_LIST = defineShape({
    ...TABLE_BASE,
    paletteId: 'Table:states',
    size: { width: 240, height: ROW_HEIGHT },
    defaults: {
        header: false,
        title: 'Table',
        names: false,
        columns: STATE_LIST_COLUMNS,
        rows: 1,
        plant: { values: [['on', '12.4', 'm³/h']] },
    },
    resizable: { minWidth: minTableWidth(STATE_LIST_COLUMNS), minHeight: ROW_HEIGHT, directions: ['left', 'right', 'bottom'] },
});

/** The line chart: the history of a value, its accent the series. */
const LINE_CHART = defineShape({
    kind: 'LineChart',
    title: 'Line Chart',
    group: 'Charts',
    description: 'The recent history of a value with its warning thresholds: the newest on the right.',
    size: { width: 280, height: 140 },
    defaults: {
        label: { text: 'Line Chart', position: 'bottom' },
        plant: {
            min: 0,
            max: 100,
            values: Array.from({ length: CHART_POINTS }, (_, index) => Math.round(WAVE_MIDDLE + WAVE_HEIGHT * Math.sin(index / 2))),
            // The warning levels `[low, high]`, dashed across the chart
            thresholds: { low: 20, high: 80 },
        },
    },
    Drawing: LineChartDrawing,
    rotatable: false,
    layer: 'instruments',
    tagPrefix: 'TRD',
    accentField: { key: 'accent', defaultValue: LIQUID_COLOR },
});

/** The bar chart: a value of each recent period, its accent the bars. */
const BAR_CHART = defineShape({
    kind: 'BarChart',
    title: 'Bar Chart',
    group: 'Charts',
    description: 'A value of each of the recent periods (the mean steam flow of a period): the newest on the right.',
    size: { width: 240, height: 140 },
    defaults: { label: { text: 'Bar Chart', position: 'bottom' }, plant: { min: 0, max: 100, values: [62, 70, 55, 81, 74, 66, 88, 72] } },
    Drawing: BarChartDrawing,
    rotatable: false,
    layer: 'instruments',
    tagPrefix: 'BAR',
    accentField: { key: 'accent', defaultValue: LIQUID_COLOR },
});

/** The donut chart: the shares of the parts of a whole, each in its own color. */
const DONUT_CHART = defineShape({
    kind: 'DonutChart',
    title: 'Donut Chart',
    group: 'Charts',
    description: 'The shares of the parts of a whole, with a legend.',
    size: { width: 240, height: 120 },
    defaults: {
        label: { text: 'Donut Chart', position: 'bottom' },
        plant: {
            // Generic parts: the app (the inspector, the plant data) says what they are
            slices: [
                { label: 'Part A', value: 50, color: '#60a5fa' },
                { label: 'Part B', value: 30, color: MAX_LIQUID_COLOR },
                { label: 'Part C', value: 20, color: LIQUID_COLOR },
            ],
        },
    },
    Drawing: DonutChartDrawing,
    rotatable: false,
    layer: 'instruments',
    tagPrefix: 'MIX',
});

/** The gauge chart: a value on the arc of its scale, its accent the arc and the number. */
const GAUGE_CHART = defineShape({
    kind: 'GaugeChart',
    title: 'Gauge Chart',
    group: 'Charts',
    description: 'A value on the arc of its scale (a pressure).',
    size: { width: 130, height: 130 },
    // The scale (bar): the feedwater pressure of the plant fits
    defaults: { label: { text: 'Gauge', position: 'bottom' }, unit: 'bar', plant: { min: 0, max: 16, value: 10.5 } },
    Drawing: GaugeChartDrawing,
    rotatable: false,
    layer: 'instruments',
    tagPrefix: 'PI',
    accentField: { key: 'accent', defaultValue: LIQUID_COLOR },
});

/** The shapes of the charts group of the palette (two tables: with a header, and a list of states). */
export const CHARTS_SHAPES: readonly ShapeSpec[] = [TABLE, STATE_LIST, LINE_CHART, BAR_CHART, DONUT_CHART, GAUGE_CHART];
