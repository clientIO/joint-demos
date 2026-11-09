// Write-back contract: what each canvas edit does to the Design. These cover
// the exact cell shapes the controlled `onCellsChange` delivers — a stencil
// drop (fresh cell id, `data` payload intact), a drawn link carrying end
// `port`s, moved cells, dragged vertices, and deletions.

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
import { applySchCellsChange, boardBounds, deriveSchCells } from './sch-cells';
import type { Cell } from './cell-data';

const NONE: ReadonlySet<string> = new Set();
const bundles = deriveBundles(INITIAL_DESIGN);
const archCells = deriveArchCells(INITIAL_DESIGN, bundles, NONE);
const schCells = deriveSchCells(INITIAL_DESIGN);

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
        const cells2 = deriveArchCells(withCan, bundles2, NONE);
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
        const cells = deriveArchCells(INITIAL_DESIGN, bundles, expanded);
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

    it('stores dragged bundle vertices under the bundle id', () => {
        const powerBundle = bundles.bundles.find((bundle) => bundle.id.includes('s-input'));
        expect(powerBundle).toBeDefined();
        const edited = archCells.map((cell) =>
            cell.id === powerBundle?.id && cell.type === 'link'
                ? { ...cell, vertices: [{ x: 620, y: 40 }] }
                : cell,
        );
        const next = applyArchCellsChange(INITIAL_DESIGN, bundles, NONE, edited);
        expect(next.archVertices[powerBundle?.id ?? '']).toEqual([{ x: 620, y: 40 }]);
    });
});

describe('connectivity write-back', () => {
    it('mints a component from a part drop, assigned to board + subsystem', () => {
    // Dropped inside the main board outline, near the RS-485 area.
        const drop: Cell = {
            id: 'clone-part-1',
            type: 'element',
            position: { x: 620, y: 700 },
            size: { width: 28, height: 64 },
            data: { kind: 'palette-part', part: 'res-120' },
        };
        const next = applySchCellsChange(INITIAL_DESIGN, [...schCells, drop]);
        const added = next.components.find((component) => component.part === 'res-120');
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
        const next = applySchCellsChange(INITIAL_DESIGN, [...schCells, drawn]);
        const minted = next.wires[next.wires.length - 1];
        expect(minted?.from).toEqual({ component: 'U3', pin: 'pb0' });
        expect(minted?.to).toEqual({ component: 'U6', pin: 'alert' });
        // The new wire joins the ALERT net on the next derive.
        const nets = deriveNets(next);
        expect(nets.byPin.get('U3:pb0')?.name).toBe('ALERT');
    });

    it('deleting a component takes its wires along', () => {
        const remaining = schCells.filter((cell) => cell.id !== 'U6');
        const next = applySchCellsChange(INITIAL_DESIGN, remaining);
        expect(next.components.some((component) => component.id === 'U6')).toBe(false);
        expect(
            next.wires.some((wire) => wire.from.component === 'U6' || wire.to.component === 'U6'),
        ).toBe(false);
    });

    it('dragging a board outline carries the board: origin, parts, internal routes', () => {
        const bounds = boardBounds(INITIAL_DESIGN, 'main');
        expect(bounds).toBeDefined();
        if (bounds === undefined) return;
        const moved = schCells.map((cell) =>
            cell.id === 'frame-main' && cell.type === 'element'
                ? { ...cell, position: { x: bounds.x + 100, y: bounds.y + 50 }}
                : cell,
        );
        const next = applySchCellsChange(INITIAL_DESIGN, moved);
        const originBefore = INITIAL_DESIGN.boards.find((board) => board.id === 'main')?.origin;
        expect(next.boards.find((board) => board.id === 'main')?.origin).toEqual({
            x: (originBefore?.x ?? 0) + 100,
            y: (originBefore?.y ?? 0) + 50,
        });
        // Parts on the board translate; the other board's parts stay put.
        const u3Before = INITIAL_DESIGN.components.find((component) => component.id === 'U3');
        const u3After = next.components.find((component) => component.id === 'U3');
        expect(u3After?.position).toEqual({ x: (u3Before?.position.x ?? 0) + 100, y: (u3Before?.position.y ?? 0) + 50 });
        expect(next.components.find((component) => component.id === 'U6')?.position).toEqual(
            INITIAL_DESIGN.components.find((component) => component.id === 'U6')?.position,
        );
    });

    it('resizing a board outline stores the rect; parts stay put', () => {
        const bounds = boardBounds(INITIAL_DESIGN, 'sensor');
        expect(bounds).toBeDefined();
        if (bounds === undefined) return;
        const resized = schCells.map((cell) =>
            cell.id === 'frame-sensor' && cell.type === 'element'
                ? { ...cell, position: { x: bounds.x, y: bounds.y }, size: { width: 800, height: 600 }}
                : cell,
        );
        const next = applySchCellsChange(INITIAL_DESIGN, resized);
        const board = next.boards.find((candidate) => candidate.id === 'sensor');
        expect(board?.size).toEqual({ width: 800, height: 600 });
        expect(board?.origin).toEqual({ x: bounds.x, y: bounds.y });
        expect(next.components).toBe(INITIAL_DESIGN.components);
        // The stored rect never clips the parts: the derived bounds contain them.
        const after = boardBounds(next, 'sensor');
        expect(after?.width).toBeGreaterThanOrEqual(800);
    });

    it('a multi-selection drag of frame + parts translates each part once', () => {
    // A lasso over the board captures its frame too; the drag then delivers
    // the frame AND the selected parts already displaced in ONE event. The
    // board move must not translate those parts a second time.
        const bounds = boardBounds(INITIAL_DESIGN, 'main');
        expect(bounds).toBeDefined();
        if (bounds === undefined) return;
        const u3Before = INITIAL_DESIGN.components.find((component) => component.id === 'U3');
        const moved = schCells.map((cell) => {
            if (cell.id === 'frame-main' && cell.type === 'element') {
                return { ...cell, position: { x: bounds.x + 40, y: bounds.y + 24 }};
            }
            if (cell.id === 'U3' && cell.type === 'element' && u3Before !== undefined) {
                return { ...cell, position: { x: u3Before.position.x + 40, y: u3Before.position.y + 24 }};
            }
            return cell;
        });
        const next = applySchCellsChange(INITIAL_DESIGN, moved);
        // The dragged part moved exactly once; an undragged board-mate moved too.
        expect(next.components.find((component) => component.id === 'U3')?.position).toEqual({
            x: (u3Before?.position.x ?? 0) + 40,
            y: (u3Before?.position.y ?? 0) + 24,
        });
        const u1Before = INITIAL_DESIGN.components.find((component) => component.id === 'U1');
        expect(next.components.find((component) => component.id === 'U1')?.position).toEqual({
            x: (u1Before?.position.x ?? 0) + 40,
            y: (u1Before?.position.y ?? 0) + 24,
        });
    });

    it('a component drag never reads as a board move', () => {
        const moved = schCells.map((cell) =>
            cell.id === 'U6' && cell.type === 'element' ? { ...cell, position: { x: 1548, y: 436 }} : cell,
        );
        const next = applySchCellsChange(INITIAL_DESIGN, moved);
        expect(next.components.find((component) => component.id === 'U6')?.position).toEqual({ x: 1548, y: 436 });
        expect(next.boards).toBe(INITIAL_DESIGN.boards);
    });

    it('a deleted outline removes only an EMPTY, non-last board', () => {
        const withEmpty = {
            ...INITIAL_DESIGN,
            boards: [...INITIAL_DESIGN.boards, { id: 'b3', name: 'Board 3', origin: { x: 2400, y: 100 }}],
        };
        const cells = deriveSchCells(withEmpty);
        const next = applySchCellsChange(withEmpty, cells.filter((cell) => cell.id !== 'frame-b3'));
        expect(next.boards.some((board) => board.id === 'b3')).toBe(false);

        // A board that still has parts survives its outline's deletion untouched.
        const kept = applySchCellsChange(INITIAL_DESIGN, schCells.filter((cell) => cell.id !== 'frame-sensor'));
        expect(kept).toBe(INITIAL_DESIGN);
    });

    it('never reconciles wire vertices — the avoid router owns them', () => {
    // The routing service writes vertices continuously; persisting them
    // here would turn every routing pass into a Design commit (and an
    // undo entry). A vertex-only change must leave the Design untouched.
        const edited = schCells.map((cell) =>
            cell.id === 'w-tx2' && cell.type === 'link' ? { ...cell, vertices: [{ x: 600, y: 350 }] } : cell,
        );
        const next = applySchCellsChange(INITIAL_DESIGN, edited);
        expect(next).toBe(INITIAL_DESIGN);
    });
});

describe('wire write-back', () => {
    const first = INITIAL_DESIGN.wires[0];
    it('leaves an auto wire\'s vertices to the router', () => {
        const cells = deriveSchCells(INITIAL_DESIGN).map((cell) =>
            cell.id === first.id && cell.type === 'link' ? { ...cell, vertices: [{ x: 140, y: 130 }] } : cell,
        );
        expect(applySchCellsChange(INITIAL_DESIGN, cells)).toBe(INITIAL_DESIGN);
    });

    it('re-pins a wire whose end was dragged onto another pin', () => {
        const component = INITIAL_DESIGN.components.find((candidate) => candidate.id === first.to.component);
        const otherPin = component === undefined ? undefined : getPart(component.part).pins.find((pin) => pin.id !== first.to.pin);
        expect(otherPin).toBeDefined();
        if (otherPin === undefined) return;
        const cells = deriveSchCells(INITIAL_DESIGN).map((cell) =>
            cell.id === first.id && cell.type === 'link' ? { ...cell, target: { id: first.to.component, port: otherPin.id }} : cell,
        );
        const wire = applySchCellsChange(INITIAL_DESIGN, cells).wires.find((candidate) => candidate.id === first.id);
        expect(wire?.to).toEqual({ component: first.to.component, pin: otherPin.id });
        expect(wire?.from).toEqual(first.from);
    });

    it('ignores an end dragged onto a pin the design does not have', () => {
        const cells = deriveSchCells(INITIAL_DESIGN).map((cell) =>
            cell.id === first.id && cell.type === 'link' ? { ...cell, target: { id: first.to.component, port: 'no-such-pin' }} : cell,
        );
        expect(applySchCellsChange(INITIAL_DESIGN, cells)).toBe(INITIAL_DESIGN);
    });
});
