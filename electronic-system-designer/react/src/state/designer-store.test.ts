// Store contract: the fix → derive → undo loop and net renaming, exercised
// through the real zustand store (it runs fine outside React).

import { beforeEach, describe, expect, it } from 'vitest';
import { useDesignerStore } from './designer-store';

describe('designer store', () => {
    beforeEach(() => {
        useDesignerStore.getState().reset();
    });

    it('derives the three seeded findings and clears them through fixes', () => {
        const initial = useDesignerStore.getState();
        expect(initial.findings).toHaveLength(3);

        for (let round = 0; round < 3; round += 1) {
            const { findings, applyFix } = useDesignerStore.getState();
            const fixable = findings.find((finding) => finding.fix !== undefined);
            expect(fixable).toBeDefined();
            if (fixable !== undefined) applyFix(fixable.id);
        }
        expect(useDesignerStore.getState().findings).toHaveLength(0);

        // Three undos bring the seeded problems back.
        useDesignerStore.getState().undo();
        useDesignerStore.getState().undo();
        useDesignerStore.getState().undo();
        expect(useDesignerStore.getState().findings).toHaveLength(3);
    });

    it('renames a whole net and keeps an active trace on it', () => {
        const { nets, setTracedNet, renameNet } = useDesignerStore.getState();
        const sda = nets.nets.find((net) => net.name === 'SDA');
        expect(sda).toBeDefined();
        if (sda === undefined) return;

        setTracedNet(sda.id);
        renameNet(sda.id, 'I2C_SDA');

        const state = useDesignerStore.getState();
        const renamed = state.nets.nets.find((net) => net.name === 'I2C_SDA');
        expect(renamed).toBeDefined();
        expect(state.nets.nets.some((net) => net.name === 'SDA')).toBe(false);
        // The rename keeps the same pins and the trace follows the new identity.
        expect(renamed?.pins.map((pin) => pin.key)).toEqual(sda.pins.map((pin) => pin.key));
        expect(state.trace?.netId).toBe('I2C_SDA');

        // And it undoes like any other edit.
        state.undo();
        expect(useDesignerStore.getState().nets.nets.some((net) => net.name === 'SDA')).toBe(true);
    });

    it('merges two nets when one is renamed to the other\'s name', () => {
        const { nets, renameNet } = useDesignerStore.getState();
        const sda = nets.nets.find((net) => net.name === 'SDA');
        const scl = nets.nets.find((net) => net.name === 'SCL');
        expect(sda).toBeDefined();
        expect(scl).toBeDefined();
        if (sda === undefined || scl === undefined) return;

        // Net-label semantics: same name = same copper, no drawn wire needed.
        renameNet(scl.id, 'SDA');
        const after = useDesignerStore.getState().nets;
        const merged = after.nets.find((net) => net.name === 'SDA');
        const keys = merged?.pins.map((pin) => pin.key) ?? [];
        for (const pin of [...sda.pins, ...scl.pins]) expect(keys).toContain(pin.key);
        expect(after.nets.some((net) => net.name === 'SCL')).toBe(false);
    });

    it('flags a narrowed bus (bus-width) and repairs it through its fix', () => {
    // Drop one RMII signal: the ETH bus between MCU and PHY loses MDIO.
        const state = useDesignerStore.getState();
        useDesignerStore
            .getState()
            .onSchCellsChange(state.schCells.filter((cell) => cell.id !== 'w-mdio'));

        const finding = useDesignerStore
            .getState()
            .findings.find((candidate) => candidate.rule === 'bus-width');
        expect(finding).toBeDefined();
        expect(finding?.detail).toContain('MDIO');
        expect(finding?.fix).toBeDefined();

        if (finding !== undefined) useDesignerStore.getState().applyFix(finding.id);
        expect(
            useDesignerStore.getState().findings.some((candidate) => candidate.rule === 'bus-width'),
        ).toBe(false);
        // The repaired wire reconnects the MDIO pins.
        const nets = useDesignerStore.getState().nets;
        expect(nets.byPin.get('U3:mdio')).toBe(nets.byPin.get('U5:mdio'));
    });

    it('expands and collapses a bundle projection', () => {
        const state = useDesignerStore.getState();
        const i2c = state.bundles.bundles.find((bundle) => bundle.iface === 'i2c');
        expect(i2c).toBeDefined();
        if (i2c === undefined) return;
        state.toggleBundle(i2c.id);
        expect(useDesignerStore.getState().archCells.some((cell) => String(cell.id).startsWith('bx|'))).toBe(true);
        useDesignerStore.getState().toggleBundle(i2c.id);
        expect(useDesignerStore.getState().archCells.some((cell) => String(cell.id).startsWith('bx|'))).toBe(false);
    });

    it('creates, renames, and removes boards — with an empty outline on the sheet', () => {
        const before = useDesignerStore.getState().design.boards.length;
        useDesignerStore.getState().addBoard('Relay Board');

        const state = useDesignerStore.getState();
        expect(state.design.boards).toHaveLength(before + 1);
        const added = state.design.boards[state.design.boards.length - 1];
        expect(added?.name).toBe('Relay Board');
        if (added === undefined) return;
        // An empty board still draws a frame so parts can be dropped onto it.
        expect(state.schCells.some((cell) => cell.id === `frame-${added.id}`)).toBe(true);

        useDesignerStore.getState().renameBoard(added.id, 'Relay PCB');
        expect(
            useDesignerStore.getState().design.boards.find((board) => board.id === added.id)?.name,
        ).toBe('Relay PCB');

        // A part moved onto the board pins it; the board refuses to be removed.
        useDesignerStore.getState().setComponentBoard('R1', added.id);
        useDesignerStore.getState().removeBoard(added.id);
        expect(useDesignerStore.getState().design.boards).toHaveLength(before + 1);

        // Move the part back — now empty, the board can go.
        useDesignerStore.getState().setComponentBoard('R1', 'main');
        useDesignerStore.getState().removeBoard(added.id);
        expect(useDesignerStore.getState().design.boards).toHaveLength(before);
    });

    it('moves a subsystem to another board together with its components', () => {
        const state = useDesignerStore.getState();
        const subsystem = state.design.subsystems.find((candidate) => candidate.board === 'main');
        expect(subsystem).toBeDefined();
        if (subsystem === undefined) return;

        state.setSubsystemBoard(subsystem.id, 'sensor');
        const after = useDesignerStore.getState().design;
        expect(after.subsystems.find((candidate) => candidate.id === subsystem.id)?.board).toBe('sensor');
        for (const component of after.components) {
            if (component.subsystemId === subsystem.id) expect(component.board).toBe('sensor');
        }
    });

    it('ignores echo cell changes — undo/redo must survive the controlled round-trip', () => {
    // Apply a fix, undo it. The controlled <Diagram> then reports the synced
    // cells back through onCellsChange with NOTHING changed — that echo must
    // not become a commit (it would clear the redo stack and pollute history).
        const { findings, applyFix } = useDesignerStore.getState();
        const fixable = findings.find((finding) => finding.fix !== undefined);
        expect(fixable).toBeDefined();
        if (fixable !== undefined) applyFix(fixable.id);
        useDesignerStore.getState().undo();

        const before = useDesignerStore.getState();
        expect(before.future.length).toBe(1);

        before.onSchCellsChange(before.schCells);
        before.onArchCellsChange(useDesignerStore.getState().archCells);

        const after = useDesignerStore.getState();
        expect(after.design).toBe(before.design);
        expect(after.past.length).toBe(before.past.length);
        expect(after.future.length).toBe(1);

        // And redo still lands on the fixed design.
        after.redo();
        expect(useDesignerStore.getState().findings).toHaveLength(before.findings.length - 1);
    });

    it('keyboard placement finds CLEAR space and reports id + name', () => {
        const state = useDesignerStore.getState();
        const mcu = state.design.components.find((component) => component.id === 'U3');
        expect(mcu).toBeDefined();
        if (mcu === undefined) return;

        // Ask for a spot dead on top of the MCU — the store must move it clear
        // instead of burying it under the existing wiring.
        const placed = state.addPartAt('res-10k', { x: mcu.position.x, y: mcu.position.y });
        expect(placed).toBeDefined();
        if (placed === undefined) return;
        const added = useDesignerStore
            .getState()
            .design.components.find((component) => component.id === placed.id);
        expect(added).toBeDefined();
        if (added === undefined) return;
        const overlapsMcu =
      added.position.x < mcu.position.x + 148 &&
      added.position.x + 28 > mcu.position.x &&
      added.position.y < mcu.position.y + 220 &&
      added.position.y + 64 > mcu.position.y;
        expect(overlapsMcu).toBe(false);

        // Same contract for subsystems on the architecture sheet.
        const target = state.design.subsystems.find((subsystem) => subsystem.id === 's-mcu');
        expect(target).toBeDefined();
        if (target === undefined) return;
        const block = useDesignerStore.getState().addSubsystemAt('can', { ...target.position });
        const subsystem = useDesignerStore
            .getState()
            .design.subsystems.find((candidate) => candidate.id === block.id);
        expect(subsystem).toBeDefined();
        expect(subsystem?.position).not.toEqual(target.position);
    });

    it('clears the design to one empty board and undoes back', () => {
        useDesignerStore.getState().clearDesign();
        const cleared = useDesignerStore.getState();
        expect(cleared.design.subsystems).toHaveLength(0);
        expect(cleared.design.components).toHaveLength(0);
        expect(cleared.design.wires).toHaveLength(0);
        expect(cleared.design.boards).toHaveLength(1);
        expect(cleared.findings).toHaveLength(0);
        // The connectivity sheet keeps one empty-board placeholder to drop onto.
        expect(cleared.schCells).toHaveLength(1);
        cleared.undo();
        expect(useDesignerStore.getState().design.components.length).toBeGreaterThan(0);
    });

    it('toasts a drawn wire with its net, and amber when immediately flagged', () => {
        const state = useDesignerStore.getState();
        // A benign strap: redundant copper on the GND net flags nothing.
        useDesignerStore.getState().onSchCellsChange([
            ...state.schCells,
            {
                id: 'draft-toast-1',
                type: 'link',
                source: { id: 'U1', port: 'gnd' },
                target: { id: 'U5', port: 'gnd' },
                data: { kind: 'draft' },
            },
        ]);
        const success = useDesignerStore.getState().toast;
        expect(success?.kind).toBe('success');
        expect(success?.detail).toContain('GND');

        // PB0 joins the 5 V ALERT net → the commit's own validation flags it and
        // the toast turns amber, naming the finding at the gesture.
        useDesignerStore.getState().onSchCellsChange([
            ...useDesignerStore.getState().schCells,
            {
                id: 'draft-toast-2',
                type: 'link',
                source: { id: 'U3', port: 'pb0' },
                target: { id: 'J3', port: 'alert' },
                data: { kind: 'draft' },
            },
        ]);
        expect(useDesignerStore.getState().toast?.kind).toBe('warning');

        // A part MOVE must not toast (wires unchanged).
        const moved = useDesignerStore.getState().schCells.map((cell) =>
            cell.id === 'U6' && cell.type === 'element' ? { ...cell, position: { x: 1500, y: 440 }} : cell,
        );
        useDesignerStore.getState().dismissToast();
        useDesignerStore.getState().onSchCellsChange(moved);
        expect(useDesignerStore.getState().toast).toBeNull();
    });

    it('re-syncs away a part drop the write-back could not mint', () => {
    // After clearDesign there is no subsystem to assign a dropped part to —
    // the write-back declines and the design stays put, so the controlled
    // cells must be RE-ISSUED to prune the ghost clone from the graph.
        useDesignerStore.getState().clearDesign();
        const before = useDesignerStore.getState().schCells;
        useDesignerStore.getState().onSchCellsChange([
            ...before,
            {
                id: 'clone-ghost-1',
                type: 'element',
                position: { x: 120, y: 120 },
                data: { kind: 'palette-part', part: 'res-10k' },
            },
        ]);
        const state = useDesignerStore.getState();
        expect(state.design.components).toHaveLength(0);
        // New array identity = the resync that prunes the foreign element.
        expect(state.schCells).not.toBe(before);
        expect(state.schCells.some((cell) => cell.id === 'clone-ghost-1')).toBe(false);
    });

    it('coalesces geometry-only cell changes into one history entry', () => {
        const first = useDesignerStore.getState();
        const pastBefore = first.past.length;
        const moveTo = (x: number) =>
            first.archCells.map((cell) =>
                cell.id === 's-mcu' && cell.type === 'element' ? { ...cell, position: { x, y: 72 }} : cell,
            );
        // Two frames of the same drag gesture arrive back to back.
        useDesignerStore.getState().onArchCellsChange(moveTo(940));
        useDesignerStore.getState().onArchCellsChange(moveTo(960));
        expect(useDesignerStore.getState().past.length).toBe(pastBefore + 1);
        // One undo restores the pre-drag position.
        useDesignerStore.getState().undo();
        const restored = useDesignerStore
            .getState()
            .design.subsystems.find((subsystem) => subsystem.id === 's-mcu');
        expect(restored?.position.x).toBe(928);
    });
});
