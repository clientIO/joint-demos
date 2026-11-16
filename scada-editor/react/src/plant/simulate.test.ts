import { describe, expect, it } from 'vitest';
import type { EquipmentData, EquipmentKind, Medium } from './model';
import { simulate, type SimElement, type SimPipe } from './simulate';

const SECOND = 1;

function element(id: string, kind: EquipmentKind, data: Partial<EquipmentData> = {}): SimElement {
    return { id, data: { kind, tag: id, name: id, ...data }};
}

function pipe(id: string, source: string, target: string, medium: Medium = 'water', sourcePort = 'out', targetPort = 'in'): SimPipe {
    return { id, source, sourcePort, target, targetPort, data: { medium }};
}

// A tank feeding a pump through a valve, the pump filling a second tank.
function transfer({ isPumpRunning = true, isValveOpen = true, isOutletOpen = true } = {}) {
    const elements = [
        element('TK-1', 'tank', { level: 50 }),
        element('HV-1', 'handValve', { active: isValveOpen }),
        element('P-1', 'pump', { active: isPumpRunning }),
        element('CV-1', 'controlValve', { active: isOutletOpen }),
        element('TK-2', 'tank', { level: 10 }),
    ];
    const pipes = [
        pipe('p1', 'TK-1', 'HV-1'),
        pipe('p2', 'HV-1', 'P-1'),
        pipe('p3', 'P-1', 'CV-1'),
        pipe('p4', 'CV-1', 'TK-2'),
    ];
    return { elements, pipes };
}

describe('simulate', () => {
    it('moves the liquid from tank to tank while the pump runs', () => {
        const { elements, pipes } = transfer();
        const step = simulate(elements, pipes, SECOND);
        expect([...step.pipes.entries()].filter(([, isFlowing]) => isFlowing).map(([id]) => id).sort()).toEqual(['p1', 'p2', 'p3', 'p4']);
        expect(step.elements.get('TK-1')?.level).toBeLessThan(50);
        expect(step.elements.get('TK-2')?.level).toBeGreaterThan(10);
    });

    it('moves nothing while the pump is stopped', () => {
        const { elements, pipes } = transfer({ isPumpRunning: false });
        const step = simulate(elements, pipes, SECOND);
        expect(step.pipes.size).toBe(0);
        expect(step.elements.get('TK-1')?.level ?? 50).toBe(50);
    });

    it('starves the pump behind a closed suction valve', () => {
        const { elements, pipes } = transfer({ isValveOpen: false });
        const step = simulate(elements, pipes, SECOND);
        expect(step.pipes.size).toBe(0);
    });

    it('stops the flow at a closed valve: nothing flows into it', () => {
        const { elements, pipes } = transfer({ isOutletOpen: false });
        const step = simulate(elements, pipes, SECOND);
        expect(step.pipes.get('p3')).toBeUndefined();
        expect(step.pipes.get('p4')).toBeUndefined();
        expect(step.elements.get('TK-2')?.level ?? 10).toBe(10);
    });

    it('raises the boiler alarm when its steam has nowhere to go', () => {
        const elements = [element('B-1', 'boiler', { active: true, value: 13.8 }), element('CV-1', 'controlValve', { active: false })];
        const pipes = [pipe('s1', 'B-1', 'CV-1', 'steam', 'steam')];
        const step = simulate(elements, pipes, SECOND);
        expect(step.elements.get('B-1')?.alarm).toBe(true);
        expect(step.elements.get('B-1')?.value).toBeGreaterThan(14);
    });

    it('lets the boiler push steam from its steam port only', () => {
        const elements = [element('B-1', 'boiler', { active: true, value: 10 }), element('E-1', 'heatExchanger'), element('TK-1', 'tank', { level: 50 })];
        const pipes = [pipe('s1', 'B-1', 'E-1', 'steam', 'steam'), pipe('w1', 'B-1', 'TK-1', 'water', 'in')];
        const step = simulate(elements, pipes, SECOND);
        expect(step.pipes.get('s1')).toBe(true);
        expect(step.pipes.get('w1')).toBeUndefined();
        expect(step.elements.get('E-1')?.active).toBe(true);
    });

    it('energizes a motor through a closed breaker, not through an open one', () => {
        const circuit = (isClosed: boolean) => simulate(
            [element('G-1', 'generator', { active: true }), element('CB-1', 'breaker', { active: isClosed }), element('M-1', 'motor')],
            [pipe('e1', 'G-1', 'CB-1', 'power', 'e1'), pipe('e2', 'CB-1', 'M-1', 'power', 'e2')],
            SECOND,
        );
        expect(circuit(true).elements.get('M-1')?.active).toBe(true);
        expect(circuit(false).elements.get('M-1')?.active).toBe(false);
    });

    it('shows on an instrument the reading of the equipment it reads', () => {
        const elements = [element('B-1', 'boiler', { active: true, value: 9, temperature: 150 }), element('PI-1', 'pressureGauge', { source: 'B-1' }), element('TI-1', 'thermometer', { source: 'B-1' })];
        const step = simulate(elements, [], SECOND);
        const boiler = step.elements.get('B-1');
        expect(step.elements.get('PI-1')?.value).toBe(boiler?.value);
        expect(step.elements.get('TI-1')?.value).toBe(boiler?.temperature);
    });

    it('flows from outlet to inlet, whichever end the pipe was drawn from', () => {
        const elements = [element('TK-1', 'tank', { level: 50 }), element('P-1', 'pump', { active: true }), element('TK-2', 'tank', { level: 10 })];
        // Both pipes drawn against the flow: from the inlet back to the outlet.
        const pipes = [pipe('p1', 'P-1', 'TK-1', 'water', 'in', 'out'), pipe('p2', 'TK-2', 'P-1', 'water', 'in', 'out')];
        const step = simulate(elements, pipes, SECOND);
        expect(step.elements.get('TK-1')?.level).toBeLessThan(50);
        expect(step.elements.get('TK-2')?.level).toBeGreaterThan(10);
    });

    it('conducts power through a wire drawn either way', () => {
        const step = simulate(
            [element('G-1', 'generator', { active: true }), element('M-1', 'motor')],
            [pipe('e1', 'M-1', 'G-1', 'power', 'e1', 'e1')],
            SECOND,
        );
        expect(step.elements.get('M-1')?.active).toBe(true);
    });

    it('runs a booster pump fed by another pump', () => {
        const elements = [element('TK-1', 'tank', { level: 50 }), element('P-1', 'pump', { active: true }), element('P-2', 'pump', { active: true }), element('TK-2', 'tank', { level: 10 })];
        const pipes = [pipe('p1', 'TK-1', 'P-1'), pipe('p2', 'P-1', 'P-2'), pipe('p3', 'P-2', 'TK-2')];
        const step = simulate(elements, pipes, SECOND);
        expect(step.pipes.get('p3')).toBe(true);
    });

    it('reports nothing for a plant that did not change', () => {
        const step = simulate([element('TK-1', 'tank', { level: 40, alarm: false })], [], SECOND);
        expect(step.elements.size).toBe(0);
        expect(step.pipes.size).toBe(0);
    });
});
