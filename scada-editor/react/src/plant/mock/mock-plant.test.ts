import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Plant, type PlantCell } from '../plant';
import { element, link, sequence, testDiagram } from '../plant-test-diagram';
import { energizedOf } from './energized';
import {
    chartUpdates,
    energizedWrites,
    filledTables,
    MAX_RESPONSE,
    MIN_RESPONSE,
    MockPlant,
    PUMP_FLOW,
    randomUpdate,
    readoutStates,
    type MockContext,
    type RunningValues,
} from './mock-plant';
import { indexByTag } from '../plant';

const contextOf = (cells: readonly PlantCell[], random = () => 0.5): MockContext => ({ cells, tags: indexByTag(cells), random });

const STATE_NUMBER_UNIT = [{ kind: 'state' }, { kind: 'number' }, { kind: 'text' }];

describe('energized circuits', () => {
    const grid = (breakerOpen: boolean, generatorPower: number) => [
        element('G-1', 'Generator', { power: generatorPower }),
        element('CB-1', 'CircuitBreaker', { open: breakerOpen }),
        element('L-1', 'Lamp'),
        link('w1', 'Wire', 'G-1', 'CB-1'),
        link('w2', 'Wire', 'CB-1', 'L-1'),
    ];

    it('carries the power from a running source through the wires and the closed breakers', () => {
        expect([...energizedOf(grid(false, 1))].sort()).toEqual(['CB-1', 'G-1', 'L-1', 'w1', 'w2']);
    });

    it('stops at an open breaker (energized itself, on its side of the source)', () => {
        expect([...energizedOf(grid(true, 1))].sort()).toEqual(['CB-1', 'G-1', 'w1']);
    });

    it('has no power from a stopped generator; a battery is always a source', () => {
        expect(energizedOf(grid(false, 0)).size).toBe(0);
        const battery = [element('B-1', 'BatteryBank', { level: 50 }), element('L-1', 'Lamp'), link('w', 'Wire', 'B-1', 'L-1'), link('p', 'Pipe', 'B-1', 'L-1')];
        expect([...energizedOf(battery)].sort()).toEqual(['B-1', 'L-1', 'w']);
    });

    it('writes the energized of the cells that changed only', () => {
        const cells = grid(true, 1).map((cell) => (cell.id === 'G-1' ? { ...cell, data: { ...cell.data, energized: true } } : cell));
        const writes = energizedWrites(cells);
        expect(writes.map(({ id }) => id).sort()).toEqual(['CB-1', 'w1']);
        expect(writes.every(({ data }) => data.energized === true)).toBe(true);
        const off = energizedWrites(cells.map((cell) => ({ ...cell, data: { ...cell.data, energized: true } })));
        expect(off.map(({ id }) => id).sort()).toEqual(['L-1', 'w2']);
        expect(off.every(({ data }) => data.energized === undefined)).toBe(true);
    });
});

describe('table readouts', () => {
    const table = (values: string[][], sourceTag?: string): PlantCell =>
        element('TBL-1', 'Table', { values }, { columns: STATE_NUMBER_UNIT, ...(sourceTag ? { sourceTag } : {}) });

    it('follows its source: off and zero while stopped, the numbers back when it runs again', () => {
        const runningValues: RunningValues = new Map();
        const stopped = [element('P-1', 'Pump', { power: 0 }), table([['on', '42.0', 'm³/h']], 'P-1')];
        const [off] = readoutStates(contextOf(stopped), runningValues);
        expect(off.data.plant?.values).toEqual([['off', '0.0', 'm³/h']]);

        const running = [element('P-1', 'Pump', { power: 1 }), { ...stopped[1], data: off.data }];
        const [on] = readoutStates(contextOf(running), runningValues);
        expect(on.data.plant?.values).toEqual([['on', '42.0', 'm³/h']]);
        expect(runningValues.size).toBe(0);
    });

    it('keeps an alarm state and writes nothing when nothing changes', () => {
        const cells = [element('P-1', 'Pump', { power: 1 }), table([['alarm', '1', 'x']], 'P-1')];
        expect(readoutStates(contextOf(cells), new Map())).toEqual([]);
    });

    it('fills the empty cells: a state running, a number like its column, a text the name of its row', () => {
        const cells = [element('TBL-1', 'Table', { values: [['', '10', ''], ['on', '', 'x']] }, { columns: STATE_NUMBER_UNIT })];
        const [filled] = filledTables(contextOf(cells, () => 0.5));
        expect(filled.data.plant?.values).toEqual([['on', '10', 'Row 1'], ['on', '10', 'x']]);
    });
});

describe('random updates', () => {
    it('switches a pump now and then through the plant (by its tag)', () => {
        const cells = [element('P-1', 'Pump', { power: 0 })];
        expect(randomUpdate(contextOf(cells, sequence(0, 0.1)))).toEqual({ tag: 'P-1', property: 'power', value: true });
        expect(randomUpdate(contextOf(cells, sequence(0, 0.9)))).toBeNull();
    });

    it('moves the flow towards the flow of the feed pumps running', () => {
        const cells = [element('P-1', 'Pump', { power: 1 }), element('P-2', 'Pump', { power: 1 }), element('FM-1', 'FlowMeter', { value: 0 })];
        // The flow meter picked (the last cell), no noise
        const update = randomUpdate(contextOf(cells, sequence(0.9, 0.5)));
        expect(update).toEqual({ tag: 'FM-1', property: 'value', value: 9 });
        expect(PUMP_FLOW[2] * 0.3).toBeCloseTo(9);
    });

    it('turns the alarm on above the high pressure of a display in bar (its unit by default)', () => {
        const display = { ...element('DI-1', 'Display', { value: 12 }), defaults: { unit: 'bar' } };
        const beacon = element('AL-1', 'Beacon', { power: 0 });
        expect(randomUpdate(contextOf([beacon, display], sequence(0)))).toEqual({ tag: 'AL-1', property: 'power', value: true });
    });

    it('changes a number of a table, not a state of a table of a source', () => {
        const cells = [element('P-1', 'Pump', { power: 1 }), element('TBL-1', 'Table', { values: [['on', '10.0', 'x']] }, { columns: STATE_NUMBER_UNIT, sourceTag: 'P-1' })];
        const update = randomUpdate(contextOf(cells, sequence(0.9, 0, 1)));
        expect(update).toMatchObject({ id: 'TBL-1' });
        expect(update && 'changes' in update ? update.changes.values : undefined).toEqual([['on', '10.5', 'x']]);
    });

    it('never updates a cell without an ID', () => {
        expect(randomUpdate(contextOf([element('x', 'Pump', { power: 0 }, { tag: undefined })]))).toBeNull();
    });
});

describe('charts', () => {
    it('adds the steam flow to a line chart, keeping its last points', () => {
        const values = Array.from({ length: 12 }, (_, index) => index);
        const cells = [element('FM-1', 'FlowMeter', { value: 20 }), element('LC-1', 'LineChart', { min: 0, max: 40, values })];
        const [update] = chartUpdates(contextOf(cells), 1, new Map());
        expect(update.changes.values).toEqual([...values.slice(1), 20]);
    });

    it('adds a bar of the mean flow of the period', () => {
        const cells = [element('FM-1', 'FlowMeter', { value: 20 }), element('BC-1', 'BarChart', { min: 0, max: 40, values: [1, 2, 3] })];
        const periodFlows = new Map();
        for (let tick = 1; tick < 10; tick++) {
            expect(chartUpdates(contextOf(cells), tick, periodFlows)).toEqual([]);
        }
        const [update] = chartUpdates(contextOf(cells), 10, periodFlows);
        expect(update.changes.values).toEqual([2, 3, 20]);
        expect(periodFlows.size).toBe(0);
    });

    it('splits the steam between the fuels of a donut: the first one up to the base load', () => {
        const slices = [{ name: 'Gas', value: 20 }, { name: 'Oil', value: 10 }, { name: 'Other', value: 3 }];
        const cells = [element('FM-1', 'FlowMeter', { value: 30 }), element('DC-1', 'DonutChart', { slices })];
        const [update] = chartUpdates(contextOf(cells), 1, new Map());
        expect(update.changes.slices).toEqual([{ name: 'Gas', value: 20 }, { name: 'Oil', value: 10 }, { name: 'Other', value: 3 }]);
    });

    it('updates the charts with an ID only', () => {
        const cells = [element('LC-1', 'LineChart', { min: 0, max: 10, values: [5] }, { tag: undefined })];
        expect(chartUpdates(contextOf(cells), 1, new Map())).toEqual([]);
    });
});

describe('MockPlant', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it('answers a command with the update asked for, after a while', () => {
        const diagram = testDiagram([element('P-1', 'Pump', { power: 0 })]);
        const plant = new Plant(diagram);
        // No random toggles: the chance is never met
        const mock = new MockPlant(diagram, () => 0.99);
        mock.start(plant);
        plant.send('P-1', 'power', true);
        vi.advanceTimersByTime(MIN_RESPONSE - 1);
        expect(diagram.dataOf('P-1').plant?.power).toBe(0);
        vi.advanceTimersByTime(MAX_RESPONSE);
        expect(diagram.dataOf('P-1').plant?.power).toBe(1);
        mock.stop();
    });

    it('energizes the circuits at the start and again when a switch changes', () => {
        const diagram = testDiagram([
            element('G-1', 'Generator', { power: 1 }),
            element('CB-1', 'CircuitBreaker', { open: false }),
            element('L-1', 'Lamp'),
            link('w1', 'Wire', 'G-1', 'CB-1'),
            link('w2', 'Wire', 'CB-1', 'L-1'),
        ]);
        const plant = new Plant(diagram);
        const mock = new MockPlant(diagram, () => 0.99);
        mock.start(plant);
        expect(diagram.dataOf('L-1').energized).toBe(true);
        plant.update('CB-1', 'open', true);
        expect(diagram.dataOf('L-1').energized).toBeUndefined();
        expect(diagram.dataOf('CB-1').energized).toBe(true);
        mock.stop();
    });

    it('stops every timer and answer when stopped', () => {
        const diagram = testDiagram([element('P-1', 'Pump', { power: 0 }), element('LC-1', 'LineChart', { min: 0, max: 10, values: [5] })]);
        const plant = new Plant(diagram);
        const mock = new MockPlant(diagram, () => 0.99);
        mock.start(plant);
        plant.send('P-1', 'power', true);
        mock.stop();
        expect(vi.getTimerCount()).toBe(0);
        const writes = diagram.writes.length;
        vi.advanceTimersByTime(10_000);
        expect(diagram.writes.length).toBe(writes);
    });
});
