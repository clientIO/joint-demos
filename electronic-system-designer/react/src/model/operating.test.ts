// Operating-point contract: rails conduct through passthrough parts,
// open-drain buses sit at their pull-up rail (the mechanism behind seeded
// problem #1 — the fault travels through the ALERT pull-up, not the I²C
// bus), and the rail-current tree respects each regulator's topology.

import { describe, expect, it } from 'vitest';
import { INITIAL_DESIGN } from './initial-design';
import { deriveNets } from './nets';
import { solveOperating } from './operating';

describe('solveOperating', () => {
    const nets = deriveNets(INITIAL_DESIGN);
    const operating = solveOperating(INITIAL_DESIGN, nets);
    const volts = (name: string): number | undefined => {
        const net = nets.nets.find((candidate) => candidate.name === name);
        return net === undefined ? undefined : operating.netVolts.get(net.id);
    };

    it('carries the 24 V rail through the fuse and the eFuse', () => {
        expect(volts('24V_IN')).toBe(24);
        expect(volts('24V_F')).toBe(24);
        expect(volts('24V_P')).toBe(24);
    });

    it('settles the regulator rails', () => {
        expect(volts('5V')).toBe(5);
        expect(volts('3V3')).toBe(3.3);
        expect(volts('GND')).toBe(0);
    });

    it('kills every downstream rail when the feed is cut', () => {
    // Remove the eFuse→buck wire: with no input the buck must not deliver,
    // and the LDO (fed by the buck) dies with it — regulator outputs are
    // conditional on their input, not free-running sources.
        const cut = {
            ...INITIAL_DESIGN,
            wires: INITIAL_DESIGN.wires.filter((wire) => wire.id !== 'w-24v-p'),
        };
        const cutNets = deriveNets(cut);
        const dead = solveOperating(cut, cutNets);
        const deadVolts = (name: string): number | undefined => {
            const net = cutNets.nets.find((candidate) => candidate.name === name);
            return net === undefined ? undefined : dead.netVolts.get(net.id);
        };
        expect(deadVolts('24V_IN')).toBe(24); // the root source itself stays live
        expect(deadVolts('5V') ?? 0).toBe(0);
        expect(deadVolts('3V3') ?? 0).toBe(0);
    });

    it('keeps the open-drain I²C bus at its pull-up rail despite the 5 V sensor', () => {
    // U6 sits on the 5 V rail (seeded problem #1) — but I²C is open-drain:
    // devices only pull LOW, so SDA/SCL sit at the R1/R2 pull-up rail (3.3 V).
        expect(operating.supplyVolts.get('U6')).toBe(5);
        expect(volts('SDA')).toBe(3.3);
        expect(volts('SCL')).toBe(3.3);
        // The fault path is ALERT: its pull-up (R4) rides VS, so 5 V really does
        // reach the MCU's PB1 there.
        expect(volts('ALERT')).toBe(5);
    });

    it('sums consumer draw per rail with LDO 1:1 and buck power conversion', () => {
        const current = (name: string): number => {
            const net = nets.nets.find((candidate) => candidate.name === name);
            return net === undefined ? 0 : operating.railCurrentMa.get(net.id) ?? 0;
        };
        // MCU 45 + PHY 60 + RS-485 20 on the 3.3 V rail.
        expect(current('3V3')).toBe(125);
        // The LDO passes current 1:1 — its input can never draw LESS than its
        // output (conservation of charge).
        expect(current('5V')).toBeGreaterThanOrEqual(current('3V3'));
        // Series feed elements mirror current: the fused input path carries the
        // same feed the buck draws.
        expect(current('24V_IN')).toBe(current('24V_P'));
        expect(current('24V_F')).toBe(current('24V_P'));
        // ≈0.85 W at the 24 V input for this load.
        expect(operating.inputPowerW).toBeGreaterThan(0.8);
        expect(operating.inputPowerW).toBeLessThan(0.9);
    });
});
