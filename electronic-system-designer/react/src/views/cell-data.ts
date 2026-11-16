// The typed `data` payloads carried on graph cells, plus the guards that
// narrow them back.
//
// Connectivity cells are the document: a part's or wire's cell carries its
// whole record. Architecture cells carry identity only (a subsystem id, a
// bundle id), since that sheet is a view of the subsystems and the wires.
// Palette drops keep their `data` verbatim through the stencil clone, so the
// store can tell WHAT was dropped.

import type { GraphProviderProps } from '@joint/react-plus';
import {
    PART_CATALOG,
    type InterfaceKind,
    type PartKindId,
} from '@/model/catalog';
import {
    isSubsystemTemplateId,
    type SubsystemTemplateId,
} from './subsystem-templates';

/** The element/link JSON the graph accepts (same shape both views). */
export type Cell = NonNullable<GraphProviderProps['cells']>[number];

// --- Architecture view -----------------------------------------------------

/** An architecture block (one subsystem). */
export interface SubsystemCellData {
  readonly kind: 'subsystem';
  readonly subsystemId: string;
}

/** A typed interface bundle between two subsystem ports (collapsed bus). */
export interface BundleCellData {
  readonly kind: 'bundle';
  readonly bundleId: string;
}

/** One member signal of an EXPANDED bundle (bus expansion). */
export interface BundleWireCellData {
  readonly kind: 'bundle-wire';
  readonly bundleId: string;
  readonly wireId: string;
}

// --- Connectivity view -----------------------------------------------------

/**
 * A schematic part. The cell IS the component's record: everything but its
 * position (the cell's own) and its board (the cell's embedding parent).
 */
export interface ComponentCellData {
  readonly kind: 'component';
  readonly componentId: string;
  readonly ref: string;
  readonly part: PartKindId;
  readonly subsystemId: string;
  readonly notes?: string;
}

/** A pin-to-pin wire. The cell IS the wire's record; its ends are the link's ports. */
export interface WireCellData {
  readonly kind: 'wire';
  readonly wireId: string;
  readonly label?: string;
  readonly labelAt?: number;
  readonly iface?: InterfaceKind;
}

/** A board outline: the parent element of the board's parts. */
export interface BoardFrameCellData {
  readonly kind: 'board-frame';
  readonly board: string;
  readonly name: string;
}

// --- Palette drops ---------------------------------------------------------

/** Dropped from the connectivity palette: mint a component of this part. */
export interface PartDropCellData {
  readonly kind: 'palette-part';
  readonly part: PartKindId;
}

/** Dropped from the architecture palette: instantiate a subsystem template. */
export interface SubsystemDropCellData {
  readonly kind: 'palette-subsystem';
  readonly template: SubsystemTemplateId;
}

export type AnyCellData =
  | SubsystemCellData
  | BundleCellData
  | BundleWireCellData
  | ComponentCellData
  | WireCellData
  | BoardFrameCellData
  | PartDropCellData
  | SubsystemDropCellData;

// --- Guards ----------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

export function isSubsystemCell(data: unknown): data is SubsystemCellData {
    return (
        isRecord(data) &&
    data.kind === 'subsystem' &&
    typeof data.subsystemId === 'string'
    );
}

export function isBundleCell(data: unknown): data is BundleCellData {
    return (
        isRecord(data) &&
    data.kind === 'bundle' &&
    typeof data.bundleId === 'string'
    );
}

export function isBundleWireCell(data: unknown): data is BundleWireCellData {
    return (
        isRecord(data) &&
    data.kind === 'bundle-wire' &&
    typeof data.bundleId === 'string' &&
    typeof data.wireId === 'string'
    );
}

export function isComponentCell(data: unknown): data is ComponentCellData {
    return (
        isRecord(data) &&
    data.kind === 'component' &&
    typeof data.componentId === 'string' &&
    typeof data.ref === 'string' &&
    typeof data.part === 'string' &&
    data.part in PART_CATALOG &&
    typeof data.subsystemId === 'string'
    );
}

export function isWireCell(data: unknown): data is WireCellData {
    return (
        isRecord(data) && data.kind === 'wire' && typeof data.wireId === 'string'
    );
}

export function isBoardFrameCell(data: unknown): data is BoardFrameCellData {
    return (
        isRecord(data) &&
    data.kind === 'board-frame' &&
    typeof data.board === 'string' &&
    typeof data.name === 'string'
    );
}

export function isPartDropCell(data: unknown): data is PartDropCellData {
    return (
        isRecord(data) &&
    data.kind === 'palette-part' &&
    typeof data.part === 'string' &&
    data.part in PART_CATALOG
    );
}

export function isSubsystemDropCell(
    data: unknown,
): data is SubsystemDropCellData {
    return (
        isRecord(data) &&
    data.kind === 'palette-subsystem' &&
    typeof data.template === 'string' &&
    isSubsystemTemplateId(data.template)
    );
}

// --- Shared cell helpers (used by both view projections) -------------------

/** Indexes cells by their (stringified) id — the write-backs' lookup table. */
export function cellsById(cells: readonly Cell[]): Map<string, Cell> {
    const map = new Map<string, Cell>();
    for (const cell of cells) {
        if (cell.id !== undefined) map.set(String(cell.id), cell);
    }
    return map;
}

// --- Link-end helpers (shared by both write-backs) -------------------------

/** Reads the element id off a link end; undefined for a dangling/point end. */
export function readEndId(end: unknown): string | undefined {
    if (!isRecord(end) || !('id' in end)) return undefined;
    const { id } = end;
    return typeof id === 'string'
        ? id
        : typeof id === 'number'
            ? String(id)
            : undefined;
}

/**
 * Reads the pin/port identity off a link end. When a user-drawn wire lands on
 * a magnet carrying a `port` DOM attribute (every pin/port stub sets one),
 * the library records that value as `end.port` — the one channel we need.
 */
export function readEndPort(end: unknown): string | undefined {
    if (!isRecord(end)) return undefined;
    return typeof end.port === 'string' ? end.port : undefined;
}

/** True when two link ends point at the same element and port. */
function sameEnd(a: unknown, b: unknown): boolean {
    return readEndId(a) === readEndId(b) && readEndPort(a) === readEndPort(b);
}

/**
 * Applies a record built from the domain model over the cell the graph holds
 * under the same id, keeping what only the graph writes: libavoid's vertices
 * and end anchors, the embedding. A link keeps its ends (and so its route)
 * only while it still connects the same two ports.
 */
export function mergeCell(previous: Cell | undefined, record: Cell): Cell {
    if (previous === undefined || previous.type !== record.type) return record;
    if (record.type !== 'link') return { ...previous, ...record };
    if (
        !sameEnd(previous.source, record.source) ||
    !sameEnd(previous.target, record.target)
    )
        return record;
    return {
        ...previous,
        ...record,
        source: previous.source,
        target: previous.target,
    };
}
