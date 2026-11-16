// Outputs contract: the derived documents agree with the design — BOM counts,
// pinout destinations, netlist text, matrix symmetry, and the release check
// counting the open suggestions.

import { describe, expect, it } from 'vitest';
import { INITIAL_DESIGN } from './initial-design';
import { deriveNets } from './nets';
import { solveOperating } from './operating';
import { validateDesign } from './validation';
import {
    bomToCsv,
    deriveBom,
    deriveConnectionMatrix,
    deriveConnectorPinouts,
    deriveNetlistText,
    deriveReleaseCheck,
    deriveWireList,
    designToJson,
    pinoutsToCsv,
    wireListToCsv,
} from './outputs';
import type { Design } from './design';

const nets = deriveNets(INITIAL_DESIGN);
const findings = validateDesign(INITIAL_DESIGN, nets, solveOperating(INITIAL_DESIGN, nets));

describe('BOM', () => {
    const bom = deriveBom(INITIAL_DESIGN, findings);

    it('accounts for every component exactly once', () => {
        const total = bom.reduce((sum, row) => sum + row.quantity, 0);
        expect(total).toBe(INITIAL_DESIGN.components.length);
    });

    it('groups same parts and joins their refs', () => {
        const pullups = bom.find((row) => row.name === '10 kΩ Pull-up');
        expect(pullups?.quantity).toBe(3);
        expect(pullups?.refs).toBe('R1, R2, R4');
    });

    it('marks parts touched by findings for review', () => {
        const mcu = bom.find((row) => row.name === 'MCU LQFP-64');
        const fuse = bom.find((row) => row.name === '2 A Fuse');
        expect(mcu?.status).toBe('review');
        expect(fuse?.status).toBe('assigned');
    });
});

describe('connector pinouts', () => {
    const pinouts = deriveConnectorPinouts(INITIAL_DESIGN, nets);

    it('emits a table per multi-pin connector', () => {
        expect(pinouts.map((pinout) => pinout.ref).toSorted()).toEqual(['J1', 'J2', 'J3', 'J4']);
    });

    it('resolves nets and destinations for the field connector', () => {
        const j4 = pinouts.find((pinout) => pinout.ref === 'J4');
        const pinA = j4?.rows.find((row) => row.pinName === 'A');
        expect(pinA?.net).toBe('485_A');
        expect(pinA?.destination).toBe('U4·A');
    });
});

describe('wire list + netlist', () => {
    it('lists one row per wire with resolved end labels', () => {
        const rows = deriveWireList(INITIAL_DESIGN, nets);
        expect(rows).toHaveLength(INITIAL_DESIGN.wires.length);
        const sda = rows.find((row) => row.id === 'w-sda-hdr');
        expect(sda?.from).toBe('U3.SDA (59)');
        expect(sda?.net).toBe('SDA');
    });

    it('renders the classic text netlist', () => {
        const text = deriveNetlistText(INITIAL_DESIGN, nets);
        expect(text).toContain('NET SDA [I²C] (4 pins)');
        expect(text).toContain('  U3.SDA (59)');
    });
});

describe('connection matrix', () => {
    it('is symmetric and links the MCU with the sensor board', () => {
        const matrix = deriveConnectionMatrix(INITIAL_DESIGN, nets);
        const mcu = matrix.names.indexOf('MCU Controller');
        const sensor = matrix.names.indexOf('Sensor Board');
        expect(matrix.counts[mcu]?.[sensor]).toBe(matrix.counts[sensor]?.[mcu]);
        expect(matrix.counts[mcu]?.[sensor] ?? 0).toBeGreaterThanOrEqual(3);
    });
});

describe('release check', () => {
    it('counts the seeded suggestions and clears once every fix is applied', () => {
        const seeded = deriveReleaseCheck(INITIAL_DESIGN, findings);
        expect(seeded.errorCount).toBe(2);
        expect(seeded.warningCount).toBe(1);

        let design: Design = INITIAL_DESIGN;
        for (let round = 0; round < 5; round += 1) {
            const derived = deriveNets(design);
            const open = validateDesign(design, derived, solveOperating(design, derived));
            const fixable = open.find((finding) => finding.fix !== undefined);
            if (fixable?.fix === undefined) break;
            design = fixable.fix.apply(design);
        }
        const clean = deriveReleaseCheck(design, []);
        expect(clean.errorCount).toBe(0);
        expect(clean.warningCount).toBe(0);
        expect(clean.connectivityOk).toBe(true);
    });
});

describe('serializers', () => {
    it('emits well-formed CSV and JSON', () => {
        const bomCsv = bomToCsv(deriveBom(INITIAL_DESIGN, findings));
        expect(bomCsv.split('\n')[0]).toBe('Refs,Part,Footprint,Datasheet,Category,Qty,Status');
        expect(bomCsv).toContain('"R1, R2, R4"');
        // Real parts carry their manufacturer datasheet into the BOM.
        expect(bomCsv).toContain('https://www.ti.com/lit/ds/symlink/tps54360.pdf');

        const wiresCsv = wireListToCsv(deriveWireList(INITIAL_DESIGN, nets));
        expect(wiresCsv.split('\n')).toHaveLength(INITIAL_DESIGN.wires.length + 1);

        const pinoutCsv = pinoutsToCsv(deriveConnectorPinouts(INITIAL_DESIGN, nets));
        expect(pinoutCsv).toContain('J4,1,A,485_A');

        const parsed: unknown = JSON.parse(designToJson(INITIAL_DESIGN, nets, findings));
        expect(parsed).toMatchObject({ format: 'jointjs-system-designer/1' });
    });
});
