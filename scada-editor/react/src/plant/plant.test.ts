import { describe, expect, it, vi } from 'vitest';
import { Plant, type PlantMessage } from './plant';
import { element, testDiagram } from './plant-test-diagram';
import { propertiesOf, readProperty, writeProperty } from './properties';

describe('properties', () => {
    it('reads and writes the properties of each kind as the plant knows them', () => {
        const pump = element('P-101', 'Pump', { power: 0 });
        expect(propertiesOf('Pump')).toEqual(['power']);
        expect(readProperty(pump.data, 'power')).toBe(false);
        expect(writeProperty(pump.data, 'power', true)?.plant).toEqual({ power: 1 });

        const valve = element('CV-101', 'ControlValve', { open: 0.75 });
        expect(readProperty(valve.data, 'open')).toBe(75);
        expect(writeProperty(valve.data, 'open', 50)?.plant).toEqual({ open: 0.5 });

        const display = element('DI-101', 'Display', { value: 1 });
        expect(writeProperty(display.data, 'value', 10.456)?.plant?.value).toBe(10.5);

        expect(readProperty(element('HV-101', 'HandValve', { open: true }).data, 'open')).toBe(true);
        expect(readProperty(element('LI-101', 'Panel', { level: 42 }).data, 'level')).toBe(42);
    });

    it('knows no property of a kind the plant does not have, nor a missing property', () => {
        expect(propertiesOf('Label')).toEqual([]);
        expect(readProperty(element('X', 'Pump').data, 'level')).toBeUndefined();
        expect(writeProperty(element('X', 'Label').data, 'value', 1)).toBeNull();
        // Not a property of the prototype
        expect(propertiesOf('toString')).toEqual([]);
    });
});

describe('Plant', () => {
    it('shows an update on the cell of the tag and tells its listeners', () => {
        const diagram = testDiagram([element('LI-101', 'Panel', { level: 10 })]);
        const plant = new Plant(diagram);
        const updates: PlantMessage[] = [];
        plant.on('update', (message) => updates.push(message));

        expect(plant.update('LI-101', 'level', 90)).toBe(true);
        expect(diagram.dataOf('LI-101').plant?.level).toBe(90);
        expect(plant.get('LI-101', 'level')).toBe(90);
        expect(updates.map(({ tag, property, value }) => [tag, property, value])).toEqual([['LI-101', 'level', 90]]);
    });

    it('shows nothing for an unknown tag or property', () => {
        const diagram = testDiagram([element('LI-101', 'Panel', { level: 10 })]);
        const plant = new Plant(diagram);
        const listener = vi.fn();
        plant.on('update', listener);
        expect(plant.update('LI-999', 'level', 1)).toBe(false);
        expect(plant.update('LI-101', 'power', true)).toBe(false);
        expect(diagram.writes).toEqual([]);
        expect(listener).not.toHaveBeenCalled();
    });

    it('sends a command without changing the diagram; a listener stops listening', () => {
        const diagram = testDiagram([element('P-101', 'Pump', { power: 0 })]);
        const plant = new Plant(diagram);
        const listener = vi.fn();
        const stop = plant.on('command', listener);
        plant.send('P-101', 'power', true);
        expect(listener).toHaveBeenCalledWith(expect.objectContaining({ tag: 'P-101', property: 'power', value: true }));
        expect(diagram.dataOf('P-101').plant?.power).toBe(0);
        stop();
        plant.send('P-101', 'power', false);
        expect(listener).toHaveBeenCalledTimes(1);
    });

    it('addresses a tag taken twice to the first cell', () => {
        const diagram = testDiagram([element('a', 'Panel', { level: 1 }, { tag: 'T-1' }), element('b', 'Panel', { level: 2 }, { tag: 'T-1' })]);
        new Plant(diagram).update('T-1', 'level', 50);
        expect(diagram.dataOf('a').plant?.level).toBe(50);
        expect(diagram.dataOf('b').plant?.level).toBe(2);
    });
});
