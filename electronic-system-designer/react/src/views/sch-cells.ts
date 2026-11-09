// Connectivity (schematic) view projection: Design → cells, and canvas edits
// → Design.
//
// Components render as schematic symbols whose pins are native ports; every
// wire connects port to port and libavoid routes it. Board outlines are
// DERIVED cells grabbable by their edge: dragging one carries the whole board
// (origin + parts), resizing stores the outline rect.

import { getPart, hidesPinNames, type PartKindId } from '@/model/catalog';
import {
    newId,
    nextRef,
    type Component,
    type Design,
    type PinRef,
    type Point,
    type LinkAnchor,
    type Wire,
} from '@/model/design';
import { routerRouteOf, routeSignature, type RouterRoute } from './router-routes';
import {
    cellsById,
    isPartDropCell,
    isWireCell,
    readEndId,
    readEndPort,
    TRANSPARENT_WIRE_STYLE,
    type Cell,
} from './cell-data';
import { PORT_MAGNET_SELECTOR, schematicPorts } from '@/symbols/port-markup';

// Z-tiers: frames under everything, wires under symbols.
export const Z_FRAME = 0;
export const Z_SCH_WIRE = 1;
export const Z_SCH_PART = 2;

const FRAME_PADDING = 56;

/** Footprint of a board outline while the board has no components yet — big
 * enough to read its name and to catch part drops. */
const EMPTY_BOARD_SIZE = { width: 360, height: 260 } as const;

/** Cell id of a board's outline frame — the one place the convention lives. */
export function frameCellId(boardId: string): string {
    return `frame-${boardId}`;
}

/** The board id behind a frame cell id, or undefined for any other cell. */
export function parseFrameCellId(cellId: string): string | undefined {
    return cellId.startsWith('frame-') ? cellId.slice('frame-'.length) : undefined;
}

/** The box a board outline occupies: the user-set rect (origin + size) when
 * one exists, expanded to keep the components' padded bounding box inside —
 * the outline never clips its own parts. Without a stored size it hugs the
 * components (legacy behavior), or shows a placeholder while empty. */
export function boardBounds(design: Design, boardId: string):
  | { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
  | undefined {
    const board = design.boards.find((candidate) => candidate.id === boardId);
    if (board === undefined) return undefined;
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const component of design.components) {
        if (component.board !== boardId) continue;
        const { width, height } = getPart(component.part).size;
        minX = Math.min(minX, component.position.x);
        minY = Math.min(minY, component.position.y);
        maxX = Math.max(maxX, component.position.x + width);
        maxY = Math.max(maxY, component.position.y + height);
    }
    const content = Number.isFinite(minX)
        ? {
            x: minX - FRAME_PADDING,
            y: minY - FRAME_PADDING,
            width: maxX - minX + FRAME_PADDING * 2,
            height: maxY - minY + FRAME_PADDING * 2,
        }
        : undefined;
    if (board.size === undefined) {
        return content ?? { x: board.origin.x, y: board.origin.y, ...EMPTY_BOARD_SIZE };
    }
    const stored = { x: board.origin.x, y: board.origin.y, ...board.size };
    if (content === undefined) return stored;
    const x = Math.min(stored.x, content.x);
    const y = Math.min(stored.y, content.y);
    return {
        x,
        y,
        width: Math.max(stored.x + stored.width, content.x + content.width) - x,
        height: Math.max(stored.y + stored.height, content.y + content.height) - y,
    };
}

// NOTE on identity: every cell object is rebuilt on each call, and that is
// fine — the controlled `cells` prop goes through the graph's VALUE-based
// sync, so equal-but-new objects cause no graph change and no re-render.
/**
 * The end anchor a wire's record carries, as a link-end fragment: the
 * router's latest, so a re-sync leaves the ends the graph holds untouched.
 */
function endAnchor(end: 'from' | 'to', routed: RouterRoute | undefined): { readonly anchor?: LinkAnchor } {
    const anchor = routed?.[end];
    return anchor === undefined ? {} : { anchor: { name: anchor.name, ...(anchor.args ? { args: { ...anchor.args }} : {}) }};
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

/** The end of a wire libavoid has not routed for the current geometry. */
const UNROUTED_END = { anchor: { name: 'modelCenter' }} as const;

export function deriveSchCells(
    design: Design,
    routerRoutes: (wireId: string, at: string) => RouterRoute | undefined = routerRouteOf,
): readonly Cell[] {
    const cells: Cell[] = [];

    // Board outlines first (bottom of the z-order). Their geometry follows the
    // components, so they resize live while a part is dragged; empty boards
    // show a placeholder outline at their origin, ready for drops.
    for (const board of design.boards) {
        const bounds = boardBounds(design, board.id);
        if (bounds === undefined) continue;
        cells.push({
            id: frameCellId(board.id),
            type: 'element',
            position: { x: bounds.x, y: bounds.y },
            size: { width: bounds.width, height: bounds.height },
            z: Z_FRAME,
            data: { kind: 'board-frame', board: board.id, name: board.name, width: bounds.width, height: bounds.height },
        });
    }

    for (const component of design.components) {
        const part = getPart(component.part);
        const { width, height } = part.size;
        cells.push({
            id: component.id,
            type: 'element',
            position: { x: component.position.x, y: component.position.y },
            size: { width, height },
            z: Z_SCH_PART,
            // One native port per pin, on the body edge (see symbols/port-markup):
            // JointJS draws the stub and owns the magnet, and the avoid router
            // exits each pin along its side, collinear with the drawn stub.
            ports: partPorts(component.part),
            data: { kind: 'component', componentId: component.id },
        });
    }

    for (const wire of design.wires) {
        const from = design.components.find((component) => component.id === wire.from.component);
        const to = design.components.find((component) => component.id === wire.to.component);
        if (from === undefined || to === undefined) continue;
        // Ends are native PORT references. The avoid router owns the geometry —
        // anchors AND vertices (libavoid nudges end segments apart, and the
        // wrapper compensates through the anchors, so the two travel together);
        // the record repeats the router's last write (router-routes) so a
        // re-sync or a remount lands on the route the graph already holds.
        const routed = routerRoutes(
            wire.id,
            routeSignature(
                { id: from.id, position: from.position, pin: wire.from.pin },
                { id: to.id, position: to.position, pin: wire.to.pin },
            ),
        );
        cells.push({
            id: wire.id,
            type: 'link',
            // No valid route yet: end on the port position (the body edge, where
            // the router's ends land too) and stay hidden until it is routed.
            source: { id: from.id, port: wire.from.pin, magnet: PORT_MAGNET_SELECTOR, ...(routed ? endAnchor('from', routed) : UNROUTED_END) },
            target: { id: to.id, port: wire.to.pin, magnet: PORT_MAGNET_SELECTOR, ...(routed ? endAnchor('to', routed) : UNROUTED_END) },
            z: Z_SCH_WIRE,
            style: TRANSPARENT_WIRE_STYLE,
            // libavoid supplies orthogonal bends, so wires draw straight through them.
            router: { name: 'normal' },
            ...(routed?.vertices === undefined ? {} : { vertices: routed.vertices.map(({ x, y }) => ({ x, y })) }),
            data: routed ? { kind: 'wire', wireId: wire.id } : { kind: 'wire', wireId: wire.id, unrouted: true },
        });
    }

    return cells;
}

// --- Write-back ------------------------------------------------------------

/** The board whose outline contains the point, defaulting to the first one.
 * Later boards win when outlines overlap (they draw on top). */
export function boardAt(design: Design, point: Point): string {
    for (let index = design.boards.length - 1; index >= 0; index -= 1) {
        const board = design.boards[index];
        if (board === undefined) continue;
        const bounds = boardBounds(design, board.id);
        if (bounds === undefined) continue;
        if (
            point.x >= bounds.x &&
      point.x <= bounds.x + bounds.width &&
      point.y >= bounds.y &&
      point.y <= bounds.y + bounds.height
        ) {
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

/** The pin a link end points at, when it is a real pin of a part in the design. */
function readPinRef(design: Design, end: unknown): PinRef | undefined {
    const component = readEndId(end);
    const pin = readEndPort(end);
    if (component === undefined || pin === undefined) return undefined;
    const part = design.components.find((candidate) => candidate.id === component);
    if (part === undefined || !getPart(part.part).pins.some((candidate) => candidate.id === pin)) return undefined;
    return { component, pin };
}

function samePin(a: PinRef, b: PinRef): boolean {
    return a.component === b.component && a.pin === b.pin;
}

/**
 * Reconciles a connectivity `onCellsChange` back into the Design: part moves,
 * deletions, palette drops, drawn pin-to-pin wires, and dragged vertices.
 */
export function applySchCellsChange(design: Design, cells: readonly Cell[]): Design {
    let next = design;
    const seen = cellsById(cells);

    // 1) Deletions: a removed part takes its wires; wires can go alone.
    const goneComponents = new Set(
        design.components.filter((component) => !seen.has(component.id)).map((component) => component.id),
    );
    const goneWires = design.wires.filter((wire) => !seen.has(wire.id)).map((wire) => wire.id);
    if (goneComponents.size > 0 || goneWires.length > 0) {
        const goneWireIds = new Set(goneWires);
        next = {
            ...next,
            components: next.components.filter((component) => !goneComponents.has(component.id)),
            wires: next.wires.filter(
                (wire) =>
                    !goneWireIds.has(wire.id) &&
          !goneComponents.has(wire.from.component) &&
          !goneComponents.has(wire.to.component),
            ),
            // Subsystems stay even when emptied — the architecture block survives
            // while its detail is being reworked.
        };
    }

    // 2) Part moves.
    let componentsChanged = false;
    const movedComponents = next.components.map((component) => {
        const cell = seen.get(component.id);
        if (cell === undefined || !('position' in cell) || cell.position === undefined) return component;
        const { x, y } = cell.position;
        if (x === component.position.x && y === component.position.y) return component;
        componentsChanged = true;
        return { ...component, position: { x, y }};
    });
    if (componentsChanged) next = { ...next, components: movedComponents };

    // 3) Wires. The router owns their geometry, so vertices are never
    // reconciled — persisting its writes here would turn every routing pass
    // into a Design commit (and an undo-stack entry). An end dragged onto
    // another pin re-pins the wire.
    let wiresChanged = false;
    const reconciledWires = next.wires.map((wire) => {
        const cell = seen.get(wire.id);
        if (cell === undefined || cell.type !== 'link') return wire;
        let updated = wire;
        const from = 'source' in cell ? readPinRef(next, cell.source) : undefined;
        const to = 'target' in cell ? readPinRef(next, cell.target) : undefined;
        if (from !== undefined && !samePin(from, wire.from)) {
            updated = { ...updated, from };
        }
        if (to !== undefined && !samePin(to, wire.to)) {
            updated = { ...updated, to };
        }
        if (updated !== wire) wiresChanged = true;
        return updated;
    });
    if (wiresChanged) next = { ...next, wires: reconciledWires };

    // 3.5) Board outline edits. Baselines compare against the ORIGINAL design's
    // derived bounds — that is what the graph's frame cell held when this event
    // fired — so a component drag (frame cell untouched) never reads as a board
    // move. Resize wins over move: a corner drag changes position AND size.
    for (const board of design.boards) {
        const cell = seen.get(frameCellId(board.id));
        if (cell === undefined || cell.type === 'link' || !('position' in cell) || cell.position === undefined) continue;
        const bounds = boardBounds(design, board.id);
        if (bounds === undefined) continue;
        const size = 'size' in cell ? cell.size : undefined;
        if (size !== undefined && (size.width !== bounds.width || size.height !== bounds.height)) {
            const { x, y } = cell.position;
            next = {
                ...next,
                boards: next.boards.map((candidate) =>
                    candidate.id === board.id
                        ? { ...candidate, origin: { x, y }, size: { width: size.width, height: size.height }}
                        : candidate,
                ),
            };
            continue;
        }
        const dx = cell.position.x - bounds.x;
        const dy = cell.position.y - bounds.y;
        if (dx === 0 && dy === 0) continue;
        // Moving the outline moves the board: origin and its parts (the router
        // follows with the wires). A part that ALSO moved in this event (a
        // multi-selection drag carries the frame and some parts together — step
        // 2 already wrote its new position) must not be translated again.
        const selfMoved = new Set<string>();
        for (const component of design.components) {
            const own = seen.get(component.id);
            if (
                own !== undefined &&
        own.type !== 'link' &&
        'position' in own &&
        own.position !== undefined &&
        (own.position.x !== component.position.x || own.position.y !== component.position.y)
            ) {
                selfMoved.add(component.id);
            }
        }
        next = {
            ...next,
            boards: next.boards.map((candidate) =>
                candidate.id === board.id
                    ? { ...candidate, origin: { x: candidate.origin.x + dx, y: candidate.origin.y + dy }}
                    : candidate,
            ),
            components: next.components.map((component) =>
                component.board === board.id && !selfMoved.has(component.id)
                    ? { ...component, position: { x: component.position.x + dx, y: component.position.y + dy }}
                    : component,
            ),
        };
    }

    // 3.6) A deleted outline removes its board — only when the board is EMPTY
    // (after this event's own deletions) and not the last one; otherwise the
    // design stays put and the controlled re-sync restores the frame.
    const goneBoards = new Set(
        next.boards
            .filter(
                (board) =>
                    !seen.has(frameCellId(board.id)) &&
          !next.components.some((component) => component.board === board.id),
            )
            .map((board) => board.id),
    );
    if (goneBoards.size > 0 && goneBoards.size < next.boards.length) {
        const keptBoards = next.boards.filter((board) => !goneBoards.has(board.id));
        next = {
            ...next,
            boards: keptBoards,
            // Subsystems pointing at a removed board fall back to the first kept one.
            subsystems: next.subsystems.map((subsystem) =>
                goneBoards.has(subsystem.board) ? { ...subsystem, board: keptBoards[0]?.id ?? subsystem.board } : subsystem,
            ),
        };
    }

    // 4) Additions: palette drops and freshly drawn pin-to-pin wires.
    const knownIds = new Set<string>([
        ...next.components.map((component) => component.id),
        ...next.wires.map((wire) => wire.id),
    ]);
    for (const cell of cells) {
        const id = cell.id === undefined ? undefined : String(cell.id);
        if (id !== undefined && knownIds.has(id)) continue;

        if (cell.type !== 'link' && isPartDropCell(cell.data)) {
            const position = 'position' in cell && cell.position !== undefined ? cell.position : { x: 120, y: 120 };
            const point = { x: position.x, y: position.y };
            const board = boardAt(next, point);
            // Nearest subsystem on the drop board, else ANY subsystem (a part
            // dropped on a brand-new board still needs an architecture home).
            const subsystemId = nearestSubsystem(next, board, point) ?? next.subsystems[0]?.id;
            if (subsystemId === undefined) continue;
            const ref = nextRef(next, cell.data.part);
            const component: Component = {
                id: ref,
                ref,
                part: cell.data.part,
                board,
                subsystemId,
                position: point,
            };
            next = { ...next, components: [...next.components, component] };
            continue;
        }

        if (cell.type !== 'link' || isWireCell(cell.data)) continue;
        const sourceId = 'source' in cell ? readEndId(cell.source) : undefined;
        const targetId = 'target' in cell ? readEndId(cell.target) : undefined;
        const sourcePin = 'source' in cell ? readEndPort(cell.source) : undefined;
        const targetPin = 'target' in cell ? readEndPort(cell.target) : undefined;
        if (sourceId === undefined || targetId === undefined || sourcePin === undefined || targetPin === undefined) continue;
        const wire: Wire = {
            id: newId('wire'),
            from: { component: sourceId, pin: sourcePin },
            to: { component: targetId, pin: targetPin },
        };
        next = { ...next, wires: [...next.wires, wire] };
    }

    return next;
}

