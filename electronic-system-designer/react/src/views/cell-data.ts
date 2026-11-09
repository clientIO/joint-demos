// The typed `data` payloads carried on graph cells, plus the guards that
// narrow them back.
//
// Cells carry IDENTITY, not content: a subsystem cell holds only the
// subsystem id and the renderers look the real record up in the store. That
// keeps the Design the single source of truth — and it is what makes the
// stencil drop work in controlled mode: the drop clones the palette record
// (minting a fresh cell id), but the `data` payload survives verbatim, so the
// write-back can tell WHAT was dropped even though the id it minted is gone.

import type { GraphProviderProps } from '@joint/react-plus';
import { PART_CATALOG, type PartKindId } from '@/model/catalog';
import { isSubsystemTemplateId, type SubsystemTemplateId } from './subsystem-templates';

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

/** A schematic part (one component). */
export interface ComponentCellData {
  readonly kind: 'component';
  readonly componentId: string;
}

/** A pin-to-pin wire. */
export interface WireCellData {
  readonly kind: 'wire';
  readonly wireId: string;
  /** No route for the current part positions yet: drawn once libavoid answers. */
  readonly unrouted?: true;
}

/** The board outline behind a board's components — grabbable by its edge
 * (move) and resizable when selected. Geometry and the display name ride in
 * the data so the renderer needs no lookup. */
export interface BoardFrameCellData {
  readonly kind: 'board-frame';
  readonly board: string;
  readonly name: string;
  readonly width: number;
  readonly height: number;
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
    return isRecord(data) && data.kind === 'subsystem' && typeof data.subsystemId === 'string';
}

export function isBundleCell(data: unknown): data is BundleCellData {
    return isRecord(data) && data.kind === 'bundle' && typeof data.bundleId === 'string';
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
    return isRecord(data) && data.kind === 'component' && typeof data.componentId === 'string';
}

export function isWireCell(data: unknown): data is WireCellData {
    return isRecord(data) && data.kind === 'wire' && typeof data.wireId === 'string';
}

export function isBoardFrameCell(data: unknown): data is BoardFrameCellData {
    return (
        isRecord(data) &&
    data.kind === 'board-frame' &&
    typeof data.board === 'string' &&
    typeof data.name === 'string' &&
    typeof data.width === 'number' &&
    typeof data.height === 'number'
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

export function isSubsystemDropCell(data: unknown): data is SubsystemDropCellData {
    return (
        isRecord(data) &&
    data.kind === 'palette-subsystem' &&
    typeof data.template === 'string' &&
    isSubsystemTemplateId(data.template)
    );
}

// --- Shared cell helpers (used by both view projections) -------------------

/**
 * The native link line is transparent on purpose: renderLink draws the
 * typed-interface wire over the same routed path while the native wrapper
 * keeps the wide pointer hit-area (hover, selection, vertex dragging).
 */
export const TRANSPARENT_WIRE_STYLE = { color: 'transparent', width: 2, wrapperWidth: 16 } as const;

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
    return typeof id === 'string' ? id : typeof id === 'number' ? String(id) : undefined;
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
