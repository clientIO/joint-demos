// The native look of wires and bundles: what each link root and label shows.

import { describe, expect, it } from 'vitest';
import { INITIAL_DESIGN } from '@/model/initial-design';
import { deriveNets } from '@/model/nets';
import { solveOperating } from '@/model/operating';
import { deriveArchCells, deriveBundles } from './arch-cells';
import type { Cell } from './cell-data';
import { lookArchCells, lookSchCells, type LookContext } from './link-look';
import { toSchCells } from './sch-cells';

const nets = deriveNets(INITIAL_DESIGN);
const bundles = deriveBundles(INITIAL_DESIGN);
const context: LookContext = {
    nets,
    bundles,
    operating: solveOperating(INITIAL_DESIGN, nets),
    flags: new Map(),
    trace: null,
    liveMode: false,
};
const schCells = toSchCells([], INITIAL_DESIGN);

function rootOf(cell: Cell | undefined): Record<string, unknown> {
    const root: unknown = cell?.attrs?.root;
    return typeof root === 'object' && root !== null ? { ...root } : {};
}

describe('link look', () => {
    it('colors and names each wire after its net', () => {
        const wire = lookSchCells(schCells, context).find((cell) => cell.id === 'w-tx2');
        expect(rootOf(wire)).toMatchObject({ 'data-iface': 'uart', 'aria-label': expect.stringContaining('wire, UART'), tabindex: 0 });
    });

    it('labels a net once, on its first wire', () => {
        const looked = lookSchCells(schCells, context);
        const net = nets.nets.find((candidate) => candidate.wires.length > 1 && !candidate.labelJoined);
        expect(net).toBeDefined();
        const [first, second] = net?.wires ?? [];
        expect(looked.find((cell) => cell.id === first?.id)?.labelMap).toHaveProperty('name');
        expect(looked.find((cell) => cell.id === second?.id)?.labelMap).toEqual({});
    });

    it('lifts the traced net and dims the rest', () => {
        const net = nets.nets[0];
        const traced = lookSchCells(schCells, {
            ...context,
            trace: { wires: new Set(net?.wires.map((wire) => wire.id)), bundles: new Set() },
        });
        const onNet = traced.find((cell) => cell.id === net?.wires[0]?.id);
        const offNet = traced.find((cell) => cell.type === 'link' && !net?.wires.some((wire) => wire.id === cell.id));
        expect(rootOf(onNet)['data-traced']).toBe('true');
        expect(rootOf(offNet)['data-dimmed']).toBe('true');
    });

    it('animates powered rails and buses only in live mode', () => {
        const live = lookSchCells(schCells, { ...context, liveMode: true });
        const values = live.map((cell) => rootOf(cell)['data-live']);
        expect(values).toContain('flow');
        expect(values).toContain('activity');
        expect(lookSchCells(schCells, context).every((cell) => rootOf(cell)['data-live'] === undefined || rootOf(cell)['data-live'] === null)).toBe(true);
    });

    it('labels a bundle with its signal count', () => {
        const archCells = deriveArchCells(INITIAL_DESIGN, bundles, new Set(), []);
        const multi = bundles.bundles.find((bundle) => bundle.wireIds.length > 1);
        const looked = lookArchCells(archCells, context).find((cell) => cell.id === multi?.id);
        expect(looked?.labelMap?.name?.text).toBe(`${multi?.label} ×${multi?.wireIds.length}`);
    });
});
