// The SCHEMA <-> CELLS bridge vocabulary: the typed `data` payloads carried on
// graph cells, their guards, and the per-column FK-anchor magnet helpers.
//
// WHY a discriminated union on `data.kind`: <Diagram cells> stores plain JSON
// cells whose `data` is `unknown`. We tag every element with `data.kind`
// ('table' | 'group' | 'note') and every relation link with `data.kind ===
// 'relation'`, so the renderer and the reverse projection can narrow with a
// single guard instead of guessing from geometry.

import type { CellRecord } from '@joint/react-plus';
import type { Cardinality, Group, ReferentialAction, Table } from '../schema/types';

// Named preset colors for the appearance pickers (tables + groups). Presentation
// only — a swatch key resolves to tailwind/SVG classes in appearance/swatches.ts
// and is stored on the cell `data`, never on the SQL domain model.
export type SwatchKey = 'default' | 'violet' | 'blue' | 'green' | 'amber' | 'rose' | 'slate';

// One cell of this app, as the library's typed record union: `cell.type`
// discriminates 'element' | 'link', and `data` carries our payload unions — so
// position/size/parent and source/target/style are TYPED reads everywhere (no
// Reflect escape hatches). The guards below still narrow real `unknown` data
// (raw graph reads on the canvas side).
export type Cell = CellRecord<ElementCellData, RelationLinkData>;

// --- Element `data` payloads (discriminated on `kind`) ---------------------

// A table card. Carries the full domain Table so the card renders and the
// reverse projection reads it back without re-deriving from geometry.
export interface TableCellData {
  readonly kind: 'table';
  readonly table: Table;
  // Optional background tint preset. Presentation only — not part of the SQL model.
  readonly fill?: SwatchKey;
}

// A group container (embedding target for grouped tables).
export interface GroupCellData {
  readonly kind: 'group';
  readonly group: Group;
  // Height to restore when the group is expanded again (remembered on collapse).
  // Presentation only — it lives on the cell, not on the domain Group.
  readonly expandedHeight?: number;
  // Optional body background tint + header badge color presets (presentation).
  readonly fill?: SwatchKey;
  readonly badge?: SwatchKey;
}

// A free-floating sticky note. Not part of the Schema domain — lives only in
// cell-land, so `cellsToSchema` ignores it.
export interface NoteCellData {
  readonly kind: 'note';
  readonly text: string;
}

export type ElementCellData = TableCellData | GroupCellData | NoteCellData;

// --- Link `data` payload ---------------------------------------------------

// A relationship (foreign key). The endpoints live on the link's
// `source`/`target` (table id + column magnet); this payload keeps the relation
// id and cardinality so the link renderer can pick markers and the reverse
// projection can rebuild the Relation.
export interface RelationLinkData {
  readonly kind: 'relation';
  readonly relationId: string;
  readonly cardinality: Cardinality;
  // Optional FK referential actions, mirrored from the domain Relation so the
  // reverse projection can rebuild them without a second lookup.
  readonly onDelete?: ReferentialAction;
  readonly onUpdate?: ReferentialAction;
}

// A note to seed at the cells level (Schema has no note concept). Explicit
// position keeps schema-cells free of note-placement logic.
export interface NoteSeed {
  readonly id: string;
  readonly text: string;
  readonly position: { readonly x: number; readonly y: number };
  // Optional explicit size (the getting-started note is larger than a quick sticky).
  readonly size?: { readonly width: number; readonly height: number };
}

// --- Guards (narrow the `unknown` data read off a cell) --------------------

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

export function isTableCell(data: unknown): data is TableCellData {
    return isRecord(data) && data.kind === 'table';
}

export function isGroupCell(data: unknown): data is GroupCellData {
    return isRecord(data) && data.kind === 'group';
}

// A group folded to just its header. Its members stay embedded (only hidden), so
// containment logic must NOT re-file them out while it is collapsed.
export function isCollapsedGroupCell(data: unknown): boolean {
    return isGroupCell(data) && data.group.collapsed === true;
}

export function isNoteCell(data: unknown): data is NoteCellData {
    return isRecord(data) && data.kind === 'note';
}

export function isRelationLink(data: unknown): data is RelationLinkData {
    return isRecord(data) && data.kind === 'relation';
}

// --- Column magnets --------------------------------------------------------
// Per-column FK anchor id. A column row exposes `columnMagnet(column.id)` as a
// markup selector + `magnet="active"` attribute; links bind their endpoints to
// it via `source/target: { id: tableId, magnet: columnMagnet(colId) }`.

const MAGNET_PREFIX = 'col-';

export function columnMagnet(columnId: string): string {
    return `${MAGNET_PREFIX}${columnId}`;
}

// Inverse of columnMagnet: the column id, or null if not a column magnet.
export function parseColumnMagnet(magnet: string): string | null {
    return magnet.startsWith(MAGNET_PREFIX) ? magnet.slice(MAGNET_PREFIX.length) : null;
}
