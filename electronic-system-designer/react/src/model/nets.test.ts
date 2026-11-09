// Net derivation contract: union-find grouping, naming, and the electrical
// truth of seeded problem #3 (two signals merging through one MCU pin).

import { describe, expect, it } from 'vitest';
import { INITIAL_DESIGN } from './initial-design';
import { deriveNets } from './nets';
import type { Design } from './design';

describe('deriveNets', () => {
    const nets = deriveNets(INITIAL_DESIGN);

    it('groups the I²C data line into one named net across both boards', () => {
        const sda = nets.nets.find((net) => net.name === 'SDA');
        expect(sda).toBeDefined();
        const keys = sda?.pins.map((pin) => pin.key) ?? [];
        expect(keys).toEqual(expect.arrayContaining(['U3:pb7', 'R1:b', 'J3:sda', 'U6:sda']));
        expect(sda?.iface).toBe('i2c');
    });

    it('merges ALERT with the LED drive through the double-assigned PB1', () => {
        const alert = nets.nets.find((net) => net.name === 'ALERT');
        const keys = alert?.pins.map((pin) => pin.key) ?? [];
        // The mistake made real: the LED's series resistor sits on the ALERT net.
        expect(keys).toContain('U3:pb1');
        expect(keys).toContain('R3:a');
    });

    it('classifies rails and grounds', () => {
        const rail = nets.nets.find((net) => net.name === '3V3');
        const ground = nets.nets.find((net) => net.name === 'GND');
        expect(rail?.iface).toBe('power');
        expect(ground?.iface).toBe('gnd');
        // The 3.3 V rail feeds MCU, PHY, transceiver, and both pull-ups.
        expect(rail?.pins.map((pin) => pin.key)).toEqual(
            expect.arrayContaining(['U3:vdd', 'U5:vdd', 'U4:vdd', 'R1:a', 'R2:a']),
        );
    });

    it('keeps net names unique and auto-names unlabeled nets', () => {
        const names = nets.nets.map((net) => net.name);
        expect(new Set(names).size).toBe(names.length);

        const anonymous: Design = {
            boards: INITIAL_DESIGN.boards,
            subsystems: [],
            components: INITIAL_DESIGN.components,
            wires: [{ id: 'w', from: { component: 'R1', pin: 'a' }, to: { component: 'R2', pin: 'a' }}],
            archVertices: {},
        };
        const [only] = deriveNets(anonymous).nets;
        expect(only?.name).toBe('N$1');
    });

    it('joins disjoint wire groups that carry the same net label', () => {
    // Two wires with no shared pin — schematic net labels make them ONE net.
        const labeled: Design = {
            boards: INITIAL_DESIGN.boards,
            subsystems: [],
            components: INITIAL_DESIGN.components,
            wires: [
                { id: 'wa', label: 'SYNC', from: { component: 'R1', pin: 'a' }, to: { component: 'R1', pin: 'b' }},
                { id: 'wb', label: 'SYNC', from: { component: 'R2', pin: 'a' }, to: { component: 'R2', pin: 'b' }},
            ],
            archVertices: {},
        };
        const derived = deriveNets(labeled);
        expect(derived.nets).toHaveLength(1);
        expect(derived.nets[0]?.name).toBe('SYNC');
        expect(derived.byWire.get('wa')).toBe(derived.byWire.get('wb'));
        // The join is marked so the view can draw these labels as flags.
        expect(derived.nets[0]?.labelJoined).toBe(true);
        // Seeded nets are all drawn copper — none is label-joined.
        expect(nets.nets.every((net) => !net.labelJoined)).toBe(true);
    });

    it('keeps differently-labeled disjoint groups apart', () => {
        const labeled: Design = {
            boards: INITIAL_DESIGN.boards,
            subsystems: [],
            components: INITIAL_DESIGN.components,
            wires: [
                { id: 'wa', label: 'SYNC', from: { component: 'R1', pin: 'a' }, to: { component: 'R1', pin: 'b' }},
                { id: 'wb', label: 'CLK', from: { component: 'R2', pin: 'a' }, to: { component: 'R2', pin: 'b' }},
            ],
            archVertices: {},
        };
        expect(deriveNets(labeled).nets).toHaveLength(2);
    });

    it('indexes nets by wire and by pin', () => {
        const viaWire = nets.byWire.get('w-sda-hdr');
        const viaPin = nets.byPin.get('U6:sda');
        expect(viaWire).toBeDefined();
        expect(viaWire).toBe(viaPin);
    });
});
