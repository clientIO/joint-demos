// Connectivity (schematic) cells: the document of the connectivity sheet.
//
// The store keeps these cells exactly as the graph reports them through
// `onCellsChange`, so everything the graph writes stays: libavoid's routes,
// the board each part is embedded in, positions. The `Design` the model
// engines read (nets, validation, outputs) is computed FROM the cells
// (`designFromSchCells`). Domain edits made off the canvas (inspector, fixes,
// the architecture view) go the other way through `toSchCells`, which only
// patches the domain fields of the cells the graph already holds.
//
// A board is the parent element of its parts (JointJS embedding): dragging it
// carries them, and a graph listener fits it to them (`fitToChildren`).

import { getPart, hidesPinNames, type PartKindId } from '@/model/catalog';
import { newId, nextRef, type Board, type Component, type Design, type PinRef, type Point, type Subsystem, type Wire } from '@/model/design';
import {
    isBoardFrameCell,
    isComponentCell,
    isPartDropCell,
    isWireCell,
    mergeCell,
    cellsById,
    readEndId,
    readEndPort,
    type Cell,
} from './cell-data';
import { PORT_MAGNET_SELECTOR, schematicPorts } from '@/symbols/port-markup';

// Z-tiers: frames under everything, wires under symbols.
export const Z_FRAME = 0;
export const Z_SCH_WIRE = 1;
export const Z_SCH_PART = 2;

/** Space between a board's outline and its parts (`fitToChildren` padding). */
export const BOARD_PADDING = 56;

/** Footprint of a new, empty board: big enough to read its name and catch drops. */
export const EMPTY_BOARD_SIZE = { width: 360, height: 260 } as const;

/** Cell id of a board's outline frame — the one place the convention lives. */
export function frameCellId(boardId: string): string {
    return `frame-${boardId}`;
}

/** The board id behind a frame cell id, or undefined for any other cell. */
export function parseFrameCellId(cellId: string): string | undefined {
    return cellId.startsWith('frame-') ? cellId.slice('frame-'.length) : undefined;
}

/**
 * A part's ports depend on its catalog entry only, so they are built once per
 * part kind. The controlled sync deep-compares `ports` on every commit (every
 * drag frame); handing it the same object ends that compare on identity.
 */
const portsByPart = new Map<string, ReturnType<typeof schematicPorts>>();
function partPorts(partId: PartKindId): ReturnType<typeof schematicPorts> {
    let ports = portsByPart.get(partId);
    if (ports === undefined) {
        const part = getPart(partId);
        const { width, height } = part.size;
        ports = schematicPorts(
            part.pins.map((pin) => ({ ...pin, name: hidesPinNames(part) ? undefined : pin.name })),
            width,
            height,
        );
        portsByPart.set(partId, ports);
    }
    return ports;
}

function cellPosition(cell: Cell): Point {
    return 'position' in cell && cell.position !== undefined ? { x: cell.position.x, y: cell.position.y } : { x: 0, y: 0 };
}

/** The pin a link end points at. */
function readPin(end: unknown): PinRef | undefined {
    const component = readEndId(end);
    const pin = readEndPort(end);
    return component === undefined || pin === undefined ? undefined : { component, pin };
}

/** The Design the model engines read, computed from the connectivity cells. */
export function designFromSchCells(cells: readonly Cell[], subsystems: readonly Subsystem[]): Design {
    const boards: Board[] = [];
    const components: Component[] = [];
    const wires: Wire[] = [];
    for (const cell of cells) {
        const { data } = cell;
        if (cell.type === 'link') {
            const from = readPin(cell.source);
            const to = readPin(cell.target);
            if (!isWireCell(data) || from === undefined || to === undefined) continue;
            wires.push({ id: data.wireId, from, to, label: data.label, labelAt: data.labelAt, iface: data.iface });
        } else if (isBoardFrameCell(data)) {
            const size = 'size' in cell && cell.size !== undefined ? cell.size : EMPTY_BOARD_SIZE;
            boards.push({ id: data.board, name: data.name, origin: cellPosition(cell), size: { width: size.width, height: size.height }});
        } else if (isComponentCell(data)) {
            const parent = typeof cell.parent === 'string' ? parseFrameCellId(cell.parent) : undefined;
            components.push({
                id: data.componentId,
                ref: data.ref,
                part: data.part,
                board: parent ?? '',
                subsystemId: data.subsystemId,
                position: cellPosition(cell),
                notes: data.notes,
            });
        }
    }
    // Parts are always embedded in a board (the paper refuses unembedding);
    // a missing parent can only come from foreign data.
    const fallbackBoard = boards[0]?.id ?? '';
    return {
        boards,
        subsystems,
        components: components.map((component) => (component.board === '' ? { ...component, board: fallbackBoard } : component)),
        wires,
    };
}

/**
 * The connectivity cells for a Design, patched over the cells the graph holds
 * (`current`): domain fields come from the Design, everything else (routes,
 * graph-written geometry) stays.
 */
export function toSchCells(current: readonly Cell[], design: Design): Cell[] {
    const previous = cellsById(current);
    const cells: Cell[] = [];
    for (const board of design.boards) {
        const id = frameCellId(board.id);
        cells.push(mergeCell(previous.get(id), {
            id,
            type: 'element',
            position: { x: board.origin.x, y: board.origin.y },
            size: { width: board.size.width, height: board.size.height },
            z: Z_FRAME,
            embeds: design.components.filter((component) => component.board === board.id).map((component) => component.id),
            data: { kind: 'board-frame', board: board.id, name: board.name },
        }));
    }
    for (const component of design.components) {
        const { width, height } = getPart(component.part).size;
        cells.push(mergeCell(previous.get(component.id), {
            id: component.id,
            type: 'element',
            position: { x: component.position.x, y: component.position.y },
            size: { width, height },
            z: Z_SCH_PART,
            parent: frameCellId(component.board),
            // One native port per pin, on the body edge (see symbols/port-markup).
            ports: partPorts(component.part),
            data: {
                kind: 'component',
                componentId: component.id,
                ref: component.ref,
                part: component.part,
                subsystemId: component.subsystemId,
                notes: component.notes,
            },
        }));
    }
    for (const wire of design.wires) {
        cells.push(mergeCell(previous.get(wire.id), {
            id: wire.id,
            type: 'link',
            source: { id: wire.from.component, port: wire.from.pin, magnet: PORT_MAGNET_SELECTOR },
            target: { id: wire.to.component, port: wire.to.pin, magnet: PORT_MAGNET_SELECTOR },
            z: Z_SCH_WIRE,
            data: { kind: 'wire', wireId: wire.id, label: wire.label, labelAt: wire.labelAt, iface: wire.iface },
        }));
    }
    return cells;
}

// --- Canvas edits ----------------------------------------------------------

/** The board whose outline contains the point, defaulting to the first one.
 * Later boards win when outlines overlap (they draw on top). */
export function boardAt(design: Design, point: Point): string {
    for (let index = design.boards.length - 1; index >= 0; index -= 1) {
        const board = design.boards[index];
        if (board === undefined) continue;
        const { origin, size } = board;
        if (point.x >= origin.x && point.x <= origin.x + size.width && point.y >= origin.y && point.y <= origin.y + size.height) {
            return board.id;
        }
    }
    return design.boards[0]?.id ?? 'main';
}

/** Nearest subsystem (by its members' centroid) on the given board. */
export function nearestSubsystem(design: Design, board: string, point: Point): string | undefined {
    let best: { id: string; distance: number } | undefined;
    for (const subsystem of design.subsystems) {
        const members = design.components.filter((component) => component.subsystemId === subsystem.id);
        if (members.length === 0 || subsystem.board !== board) continue;
        const cx = members.reduce((sum, member) => sum + member.position.x, 0) / members.length;
        const cy = members.reduce((sum, member) => sum + member.position.y, 0) / members.length;
        const distance = Math.hypot(cx - point.x, cy - point.y);
        if (best === undefined || distance < best.distance) best = { id: subsystem.id, distance };
    }
    return best?.id ?? design.subsystems.find((subsystem) => subsystem.board === board)?.id;
}

/**
 * True when an edit removed a board that must stay: one that still had parts
 * (removing a parent removes its embedded parts with it) or the last one.
 */
export function removesKeptBoard(before: Design, after: Design): boolean {
    const kept = new Set(after.boards.map((board) => board.id));
    return before.boards.some(
        (board) =>
            !kept.has(board.id) &&
      (after.boards.length === 0 || before.components.some((component) => component.board === board.id)),
    );
}

/**
 * Turns what the user drew on the canvas into domain records: a palette drop
 * becomes a part (on the board under it, in the nearest subsystem), a link
 * drawn pin to pin becomes a wire. `drawn` reports that the cells hold such
 * a drop or link (minted or not), so the store rewrites them from the
 * Design; `declined` reports a connected link that is not pin to pin.
 */
export function addDrawnCells(
    design: Design,
    cells: readonly Cell[],
): { readonly design: Design; readonly drawn: boolean; readonly declined: boolean } {
    let next = design;
    let drawn = false;
    let declined = false;
    for (const cell of cells) {
        const { data } = cell;
        if (cell.type !== 'link' && isPartDropCell(data)) {
            drawn = true;
            const point = cellPosition(cell);
            const board = boardAt(next, point);
            // Nearest subsystem on the drop board, else ANY subsystem (a part
            // dropped on a brand-new board still needs an architecture home).
            const subsystemId = nearestSubsystem(next, board, point) ?? next.subsystems[0]?.id;
            if (subsystemId === undefined) continue;
            const ref = nextRef(next, data.part);
            next = { ...next, components: [...next.components, { id: ref, ref, part: data.part, board, subsystemId, position: point }] };
            continue;
        }
        if (cell.type !== 'link' || isWireCell(data)) continue;
        const sourceId = readEndId(cell.source);
        const targetId = readEndId(cell.target);
        // A link still being drawn has a point for its dragged end: leave it be.
        if (sourceId === undefined || targetId === undefined) continue;
        drawn = true;
        const from = readPin(cell.source);
        const to = readPin(cell.target);
        if (from === undefined || to === undefined || !isPinOf(next, from) || !isPinOf(next, to)) {
            declined = true;
            continue;
        }
        next = { ...next, wires: [...next.wires, { id: newId('wire'), from, to }] };
    }
    return { design: next, drawn, declined };
}

/** True when the pin exists on a part of the design. */
function isPinOf(design: Design, ref: PinRef): boolean {
    const component = design.components.find((candidate) => candidate.id === ref.component);
    return component !== undefined && getPart(component.part).pins.some((pin) => pin.id === ref.pin);
}
