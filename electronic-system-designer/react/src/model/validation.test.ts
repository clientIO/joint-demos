// Validation contract: the seed reports EXACTLY its three engineered
// problems (no false positives), every finding carries a working fix, and
// applying all fixes leaves a clean design. The synthetic cases cover the
// rules the seed deliberately does not trip.

import { describe, expect, it } from 'vitest';
import { INITIAL_DESIGN } from './initial-design';
import { deriveNets } from './nets';
import { solveOperating } from './operating';
import { validateDesign, type Finding } from './validation';
import type { Design } from './design';

function validate(design: Design): readonly Finding[] {
    const nets = deriveNets(design);
    return validateDesign(design, nets, solveOperating(design, nets));
}

describe('validateDesign on the seeded gateway', () => {
    const findings = validate(INITIAL_DESIGN);

    it('reports exactly the three seeded problems', () => {
        expect(findings.map((finding) => finding.rule).toSorted()).toEqual([
            'pin-conflict',
            'termination',
            'voltage',
        ]);
    });

    it('roots the 5 V ALERT violation at the sensor board — and ONLY there', () => {
        const voltage = findings.find((finding) => finding.rule === 'voltage');
        expect(voltage?.severity).toBe('error');
        expect(voltage?.components).toContain('U6');
        expect(voltage?.components).toContain('U3');
        // Open-drain physics: only ALERT (pulled up to VS) carries 5 V. SDA must
        // NOT be flagged — its pull-up rides the 3.3 V rail.
        expect(voltage?.nets).toEqual(['ALERT']);
    });

    it('flags the double-assigned MCU pin with both wires', () => {
        const conflict = findings.find((finding) => finding.rule === 'pin-conflict');
        expect(conflict?.components).toEqual(['U3']);
        expect(conflict?.wires).toEqual(expect.arrayContaining(['w-alert-mcu', 'w-led-drv']));
    });

    it('flags the unterminated RS-485 bus at the field connector', () => {
        const termination = findings.find((finding) => finding.rule === 'termination');
        expect(termination?.severity).toBe('warning');
        expect(termination?.nets).toEqual(expect.arrayContaining(['485_A', '485_B']));
        expect(termination?.components).toEqual(['J4']);
    });

    it('resolves the whole design by applying every suggested fix', () => {
        let design: Design = INITIAL_DESIGN;
        for (let round = 0; round < 5; round += 1) {
            const open = validate(design);
            const fixable = open.find((finding) => finding.fix !== undefined);
            if (fixable?.fix === undefined) break;
            design = fixable.fix.apply(design);
        }
        expect(validate(design)).toEqual([]);
    });

    it('rewires the sensor supply feed onto the 3.3 V rail', () => {
        const voltage = findings.find((finding) => finding.rule === 'voltage');
        expect(voltage?.fix).toBeDefined();
        const fixed = voltage?.fix?.apply(INITIAL_DESIGN);
        expect(fixed).toBeDefined();
        if (fixed === undefined) return;
        const feed = fixed.wires.find((wire) => wire.id === 'w-5v-sense');
        expect(feed?.from).toEqual({ component: 'U2', pin: 'vout' });
        // The ALERT pull-up now rides 3.3 V — the violation is gone.
        const nets = deriveNets(fixed);
        const operating = solveOperating(fixed, nets);
        const alert = nets.nets.find((net) => net.name === 'ALERT');
        expect(alert === undefined ? undefined : operating.netVolts.get(alert.id)).toBe(3.3);
    });

    it('splits the merged nets when the LED drive moves to a free pin', () => {
        const conflict = findings.find((finding) => finding.rule === 'pin-conflict');
        const fixed = conflict?.fix?.apply(INITIAL_DESIGN);
        expect(fixed).toBeDefined();
        if (fixed === undefined) return;
        const moved = fixed.wires.find((wire) => wire.id === 'w-led-drv');
        const ends = [moved?.from, moved?.to].map((end) => `${end?.component}:${end?.pin}`);
        expect(ends).toContain('U3:pb4');
        const alert = deriveNets(fixed).nets.find((net) => net.name === 'ALERT');
        expect(alert?.pins.map((pin) => pin.key)).not.toContain('R3:a');
    });

    it('adds a termination resistor across A/B at the connector', () => {
        const termination = findings.find((finding) => finding.rule === 'termination');
        const fixed = termination?.fix?.apply(INITIAL_DESIGN);
        expect(fixed).toBeDefined();
        if (fixed === undefined) return;
        expect(fixed.components).toHaveLength(INITIAL_DESIGN.components.length + 1);
        const added = fixed.components.find((component) => component.part === 'res-120');
        expect(added?.board).toBe('main');
        expect(validate(fixed).some((finding) => finding.rule === 'termination')).toBe(false);
    });
});

describe('rules the seed does not trip', () => {
    it('detects two push-pull outputs fighting on one net', () => {
        const design: Design = {
            ...INITIAL_DESIGN,
            // PHY RXD0 (out) shorted into MCU TXD0 (out).
            wires: [
                ...INITIAL_DESIGN.wires,
                { id: 'w-bad', from: { component: 'U5', pin: 'rxd0' }, to: { component: 'U3', pin: 'txd0' }},
            ],
        };
        expect(validate(design).some((finding) => finding.rule === 'direction')).toBe(true);
    });

    it('detects a wire bridging two different protocols', () => {
        const design: Design = {
            ...INITIAL_DESIGN,
            // MCU I²C SDA wired straight into the RS-485 transceiver's UART DI.
            wires: [
                ...INITIAL_DESIGN.wires,
                { id: 'w-bad', from: { component: 'U3', pin: 'pb7' }, to: { component: 'U4', pin: 'di' }},
            ],
        };
        expect(validate(design).some((finding) => finding.rule === 'protocol')).toBe(true);
    });
});
