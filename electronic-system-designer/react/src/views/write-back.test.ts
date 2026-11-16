// Canvas edits → domain records. These cover the exact cell shapes the
// controlled `onCellsChange` delivers: a stencil drop (fresh cell id, `data`
// payload intact), a drawn link carrying end `port`s, moved cells, routes the
// graph wrote, and deletions.

import { describe, expect, it } from 'vitest';
import { getPart } from '@/model/catalog';
import { INITIAL_DESIGN } from '@/model/initial-design';
import { deriveNets } from '@/model/nets';
import {
    applyArchCellsChange,
    bundleWireCellId,
    deriveArchCells,
    deriveBundles,
    parseBundleWireCellId,
} from './arch-cells';
import { addDrawnCells, designFromSchCells, removesKeptBoard, toSchCells } from './sch-cells';
import type { Cell } from './cell-data';

const NONE: ReadonlySet<string> = new Set();
const bundles = deriveBundles(INITIAL_DESIGN);
const archCells = deriveArchCells(INITIAL_DESIGN, bundles, NONE, []);
const schCells = toSchCells([], INITIAL_DESIGN);

describe('architecture write-back', () => {
    it('moves a subsystem when its cell position changes', () => {
        const moved = archCells.map((cell) =>
            cell.id === 's-mcu' && cell.type === 'element' ? { ...cell, position: { x: 1000, y: 60 }} : cell,
        );
        const next = applyArchCellsChange(INITIAL_DESIGN, bundles, NONE, moved);
        expect(next.subsystems.find((subsystem) => subsystem.id === 's-mcu')?.position).toEqual({ x: 1000, y: 60 });
        // Untouched subsystems keep their object identity (cheap re-derives).
        expect(next.subsystems.find((subsystem) => subsystem.id === 's-eth')).toBe(
            INITIAL_DESIGN.subsystems.find((subsystem) => subsystem.id === 's-eth'),
        );
    });

    it('instantiates a subsystem template from a stencil drop', () => {
    // The drop CLONES the palette record: fresh minted id, data verbatim.
        const drop: Cell = {
            id: 'clone-abc123',
            type: 'element',
            position: { x: 400, y: 800 },
            size: { width: 196, height: 132 },
            data: { kind: 'palette-subsystem', template: 'can' },
        };
        const next = applyArchCellsChange(INITIAL_DESIGN, bundles, NONE, [...archCells, drop]);
        expect(next.subsystems).toHaveLength(INITIAL_DESIGN.subsystems.length + 1);
        const added = next.subsystems.find((subsystem) => subsystem.name === 'CAN');
        expect(added?.position).toEqual({ x: 400, y: 800 });
        // The template minted its member component with a fresh ref.
        expect(next.components.some((component) => component.part === 'can-xcvr')).toBe(true);
    });

    it('expands a drawn port-to-port connection into pin wires (role matchmaking)', () => {
    // Drop a CAN block, then draw MCU.uart ↔ CAN.ctrl — tx/rx roles match.
        const withCan = applyArchCellsChange(INITIAL_DESIGN, bundles, NONE, [
            ...archCells,
            { id: 'clone-1', type: 'element', position: { x: 400, y: 800 }, data: { kind: 'palette-subsystem', template: 'can' }},
        ]);
        const canId = withCan.subsystems.find((subsystem) => subsystem.name === 'CAN')?.id;
        expect(canId).toBeDefined();
        const bundles2 = deriveBundles(withCan);
        const cells2 = deriveArchCells(withCan, bundles2, NONE, []);
        const drawn: Cell = {
            id: 'draft-77',
            type: 'link',
            source: { id: 's-mcu', port: 'uart' },
            target: { id: canId ?? '', port: 'ctrl' },
            data: { kind: 'draft' },
        };
        const next = applyArchCellsChange(withCan, bundles2, NONE, [...cells2, drawn]);
        const minted = next.wires.filter((candidate) => !withCan.wires.includes(candidate));
        expect(minted).toHaveLength(2); // tx↔tx, rx↔rx
        const ends = minted.flatMap((wire) => [wire.from, wire.to].map((end) => `${end.component}:${end.pin}`));
        expect(ends).toEqual(expect.arrayContaining(['U3:pa9', 'U3:pa10']));
    });

    it('removes a deleted bundle\'s member wires', () => {
        const i2cBundle = bundles.bundles.find((bundle) => bundle.iface === 'i2c');
        expect(i2cBundle).toBeDefined();
        const remaining = archCells.filter((cell) => cell.id !== i2cBundle?.id);
        const next = applyArchCellsChange(INITIAL_DESIGN, bundles, NONE, remaining);
        expect(next.wires.length).toBe(INITIAL_DESIGN.wires.length - (i2cBundle?.wireIds.length ?? 0));
    });

    it('expands a bundle into per-signal links and deletes members individually', () => {
        const i2cBundle = bundles.bundles.find((bundle) => bundle.iface === 'i2c');
        expect(i2cBundle).toBeDefined();
        if (i2cBundle === undefined) return;
        const expanded: ReadonlySet<string> = new Set([i2cBundle.id]);
        const cells = deriveArchCells(INITIAL_DESIGN, bundles, expanded, []);
        // The collapsed link is replaced by one link per member signal.
        expect(cells.some((cell) => cell.id === i2cBundle.id)).toBe(false);
        const memberIds = i2cBundle.wireIds.map((wireId) => bundleWireCellId(i2cBundle.id, wireId));
        for (const memberId of memberIds) expect(cells.some((cell) => cell.id === memberId)).toBe(true);

        // Deleting ONE member removes just that wire from the design.
        const [firstMember] = memberIds;
        const next = applyArchCellsChange(
            INITIAL_DESIGN,
            bundles,
            expanded,
            cells.filter((cell) => cell.id !== firstMember),
        );
        expect(next.wires.length).toBe(INITIAL_DESIGN.wires.length - 1);
        expect(next.wires.some((wire) => wire.id === i2cBundle.wireIds[0])).toBe(false);
    });

    it('round-trips member cell ids even though bundle ids contain pipes', () => {
        const bundleId = 'b|s-485.bus|s-field.bus';
        const cellId = bundleWireCellId(bundleId, 'w-485-a');
        expect(parseBundleWireCellId(cellId)).toEqual({ bundleId, wireId: 'w-485-a' });
        expect(parseBundleWireCellId('w-485-a')).toBeNull();
    });

    it('keeps the route the graph holds for an unchanged bundle', () => {
        const powerBundle = bundles.bundles.find((bundle) => bundle.id.includes('s-input'));
        expect(powerBundle).toBeDefined();
        const routed = archCells.map((cell) =>
            cell.id === powerBundle?.id && cell.type === 'link'
                ? { ...cell, vertices: [{ x: 620, y: 40 }], source: { ...cell.source, anchor: { name: 'modelCenter' }}}
                : cell,
        );
        // A route is no domain change...
        expect(applyArchCellsChange(INITIAL_DESIGN, bundles, NONE, routed)).toBe(INITIAL_DESIGN);
        // ...and re-deriving over the graph's cells keeps it.
        const again = deriveArchCells(INITIAL_DESIGN, bundles, NONE, routed).find((cell) => cell.id === powerBundle?.id);
        expect(again?.type === 'link' ? again.vertices : undefined).toEqual([{ x: 620, y: 40 }]);
    });
});

const SUBSYSTEMS = INITIAL_DESIGN.subsystems;

function withCell(id: string, patch: (cell: Cell) => Cell): Cell[] {
    return schCells.map((cell) => (cell.id === id ? patch(cell) : cell));
}

describe('connectivity cells', () => {
    it('round-trips the Design through the cells', () => {
        expect(designFromSchCells(schCells, SUBSYSTEMS)).toEqual(INITIAL_DESIGN);
    });

    it('reads a part\'s board from its embedding parent', () => {
        const moved = withCell('U6', (cell) => ({ ...cell, parent: 'frame-main' }));
        const design = designFromSchCells(moved, SUBSYSTEMS);
        expect(design.components.find((component) => component.id === 'U6')?.board).toBe('main');
    });

    it('embeds every part in its board', () => {
        const frame = schCells.find((cell) => cell.id === 'frame-sensor');
        const u6 = schCells.find((cell) => cell.id === 'U6');
        expect(u6?.parent).toBe('frame-sensor');
        expect(frame?.embeds).toEqual(expect.arrayContaining(['U6']));
    });

    it('keeps a wire\'s route while it connects the same pins', () => {
        const first = INITIAL_DESIGN.wires[0];
        const routed = withCell(first.id, (cell) => ({
            ...cell,
            vertices: [{ x: 140, y: 130 }],
            source: { ...cell.source, anchor: { name: 'modelCenter', args: { dx: 2, dy: 0 }}},
        }));
        // A route changes nothing in the Design.
        expect(designFromSchCells(routed, SUBSYSTEMS)).toEqual(INITIAL_DESIGN);
        // A domain edit (a net label) keeps the route...
        const relabeled = {
            ...INITIAL_DESIGN,
            wires: INITIAL_DESIGN.wires.map((wire) => (wire.id === first.id ? { ...wire, label: 'X' } : wire)),
        };
        const kept = toSchCells(routed, relabeled).find((cell) => cell.id === first.id);
        expect(kept?.type === 'link' ? kept.vertices : undefined).toEqual([{ x: 140, y: 130 }]);
        // ...a re-pin drops it: the router routes the new connection.
        const component = INITIAL_DESIGN.components.find((candidate) => candidate.id === first.to.component);
        const otherPin = component === undefined ? undefined : getPart(component.part).pins.find((pin) => pin.id !== first.to.pin);
        const repinned = {
            ...INITIAL_DESIGN,
            wires: INITIAL_DESIGN.wires.map((wire) =>
                wire.id === first.id ? { ...wire, to: { component: first.to.component, pin: otherPin?.id ?? '' }} : wire,
            ),
        };
        const fresh = toSchCells(routed, repinned).find((cell) => cell.id === first.id);
        expect(fresh?.type === 'link' ? fresh.vertices : undefined).toBeUndefined();
    });
});

describe('connectivity canvas edits', () => {
    it('mints a component from a part drop, assigned to board + subsystem', () => {
        // Dropped inside the main board outline, near the RS-485 area.
        const drop: Cell = {
            id: 'clone-part-1',
            type: 'element',
            position: { x: 620, y: 700 },
            size: { width: 28, height: 64 },
            data: { kind: 'palette-part', part: 'res-120' },
        };
        const { design } = addDrawnCells(INITIAL_DESIGN, [...schCells, drop]);
        const added = design.components.find((component) => component.part === 'res-120');
        expect(added?.ref).toBe('R5');
        expect(added?.board).toBe('main');
        expect(added?.subsystemId).toBeDefined();
    });

    it('mints a wire from a drawn pin-to-pin connection', () => {
        const drawn: Cell = {
            id: 'draft-9',
            type: 'link',
            source: { id: 'U3', port: 'pb0' },
            target: { id: 'U6', port: 'alert' },
            data: { kind: 'draft' },
        };
        const { design, declined } = addDrawnCells(INITIAL_DESIGN, [...schCells, drawn]);
        expect(declined).toBe(false);
        const minted = design.wires[design.wires.length - 1];
        expect(minted?.from).toEqual({ component: 'U3', pin: 'pb0' });
        expect(minted?.to).toEqual({ component: 'U6', pin: 'alert' });
        // The new wire joins the ALERT net.
        expect(deriveNets(design).byPin.get('U3:pb0')?.name).toBe('ALERT');
    });

    it('leaves a link still being drawn alone, and declines one that is not pin to pin', () => {
        const dragging: Cell = { id: 'draft-1', type: 'link', source: { id: 'U3', port: 'pb0' }, target: { x: 10, y: 10 }, data: { kind: 'draft' }};
        expect(addDrawnCells(INITIAL_DESIGN, [...schCells, dragging])).toEqual({ design: INITIAL_DESIGN, drawn: false, declined: false });
        const toBody: Cell = { id: 'draft-2', type: 'link', source: { id: 'U3', port: 'pb0' }, target: { id: 'U6' }, data: { kind: 'draft' }};
        expect(addDrawnCells(INITIAL_DESIGN, [...schCells, toBody]).declined).toBe(true);
    });

    it('deleting a component (and so its wires) removes them from the Design', () => {
        const remaining = schCells.filter(
            (cell) => cell.id !== 'U6' && !(cell.type === 'link' && [cell.source, cell.target].some((end) => typeof end === 'object' && end !== null && 'id' in end && end.id === 'U6')),
        );
        const design = designFromSchCells(remaining, SUBSYSTEMS);
        expect(design.components.some((component) => component.id === 'U6')).toBe(false);
        expect(design.wires.some((wire) => wire.from.component === 'U6' || wire.to.component === 'U6')).toBe(false);
    });

    it('refuses to remove a board with parts or the last board, allows an empty one', () => {
        // Removing a board removes its embedded parts with it.
        const withoutSensor = schCells.filter((cell) => cell.id !== 'frame-sensor' && cell.parent !== 'frame-sensor');
        expect(removesKeptBoard(INITIAL_DESIGN, designFromSchCells(withoutSensor, SUBSYSTEMS))).toBe(true);
        const withEmpty = {
            ...INITIAL_DESIGN,
            boards: [...INITIAL_DESIGN.boards, { id: 'b3', name: 'Board 3', origin: { x: 2400, y: 100 }, size: { width: 360, height: 260 }}],
        };
        const cells = toSchCells([], withEmpty).filter((cell) => cell.id !== 'frame-b3');
        expect(removesKeptBoard(withEmpty, designFromSchCells(cells, SUBSYSTEMS))).toBe(false);
    });
});
