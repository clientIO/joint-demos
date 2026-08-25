// The SCHEMA <-> CELLS bridge. `schemaToCells` projects the domain model into
// the JSON cells <Diagram cells> renders; `cellsToSchema` reads them back for
// SQL generation / export. The pair round-trips: cellsToSchema(schemaToCells(s))
// preserves tables, columns, relations and groups (positions are presentation
// only and intentionally dropped on the way back).
//
// STYLE DECISION — links carry data only, not a resolved style. The link's
// cardinality markers are applied by the link renderer via
// `cardinalityToLinkStyle` in src/canvas/relationship-style.ts. Baking the
// style in here would make the model layer depend on the canvas layer (wrong
// direction) and duplicate presentation concerns, so we keep the model pure and
// let the renderer derive the style from `data.cardinality`.

import type { Group, Relation, RelationEndpoint, Schema, Table } from '../schema/types';
import {
    columnMagnet,
    isGroupCell,
    isNoteCell,
    isRelationLink,
    isTableCell,
    parseColumnMagnet,
    type Cell,
    type NoteSeed,
    type RelationLinkData,
} from './cell-data';
import {
    GROUP_BOTTOM_EXTRA,
    GROUP_HEADER,
    GROUP_PADDING,
    TABLE_WIDTH,
    estimateTableHeight,
    layoutTables,
    type Point,
} from './layout';
// Canonical paint order (group < note < link < table), shared with use-z-order so
// the seed z never disagrees with the runtime normalizer.
import { Z_GROUP, Z_LINK, Z_NOTE, Z_TABLE } from './z-order';


// The link half of the typed Cell union (relations are the only links here).
type RelationCell = Extract<Cell, { type: 'link' }>;

// --- SCHEMA -> CELLS -------------------------------------------------------

function groupCell(group: Group, tables: readonly Table[], positions: Map<string, Point>): Cell {
    const members = tables.filter((table) => table.groupId === group.id);
    const bounds = groupBounds(members, positions);
    return {
        id: group.id,
        type: 'element',
        position: { x: bounds.x, y: bounds.y },
        size: { width: bounds.width, height: bounds.height },
        z: Z_GROUP,
        data: { kind: 'group', group },
    };
}

interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

// Bounding box around a group's member tables (each sized to its column count),
// padded with header room. Falls back to a sensible default for an empty group.
function groupBounds(
    members: readonly Table[],
    positions: Map<string, Point>,
): { x: number; y: number; width: number; height: number } {
    const boxes = members
        .map((table): Box | null => {
            const point = positions.get(table.id);
            if (point === undefined) return null;
            return { x: point.x, y: point.y, w: TABLE_WIDTH, h: estimateTableHeight(table.columns.length) };
        })
        .filter((box): box is Box => box !== null);
    if (boxes.length === 0) {
        return { x: 0, y: 0, width: TABLE_WIDTH + GROUP_PADDING * 2, height: 160 };
    }
    const minX = Math.min(...boxes.map((box) => box.x));
    const minY = Math.min(...boxes.map((box) => box.y));
    const maxX = Math.max(...boxes.map((box) => box.x + box.w));
    const maxY = Math.max(...boxes.map((box) => box.y + box.h));
    return {
        x: minX - GROUP_PADDING,
        y: minY - GROUP_PADDING - GROUP_HEADER,
        width: maxX - minX + GROUP_PADDING * 2,
        height: maxY - minY + GROUP_PADDING * 2 + GROUP_HEADER + GROUP_BOTTOM_EXTRA,
    };
}

function tableCell(table: Table, positions: Map<string, Point>): Cell {
    const position = positions.get(table.id) ?? { x: 0, y: 0 };
    // Explicit model size (the card uses useModelGeometry): fits the columns on
    // first render and gives FreeTransform something to resize. The columns area
    // scrolls if the card is later resized shorter, so nothing is clipped.
    const base: Cell = {
        id: table.id,
        type: 'element',
        position: { x: position.x, y: position.y },
        size: { width: TABLE_WIDTH, height: estimateTableHeight(table.columns.length) },
        z: Z_TABLE,
        data: { kind: 'table', table },
    };
    return table.groupId === undefined ? base : { ...base, parent: table.groupId };
}

function relationCell(relation: Relation): Cell {
    return {
        id: relation.id,
        type: 'link',
        z: Z_LINK,
        source: { id: relation.source.tableId, magnet: columnMagnet(relation.source.columnId) },
        target: { id: relation.target.tableId, magnet: columnMagnet(relation.target.columnId) },
        data: {
            kind: 'relation',
            relationId: relation.id,
            cardinality: relation.cardinality,
            onDelete: relation.onDelete,
            onUpdate: relation.onUpdate,
        },
    };
}

function noteCell(note: NoteSeed): Cell {
    return {
        id: note.id,
        type: 'element',
        position: { x: note.position.x, y: note.position.y },
        // Notes are model-sized (useModelGeometry) + freely resizable, so seed an
        // explicit size the user can drag from.
        size: note.size ?? { width: 240, height: 132 },
        z: Z_NOTE,
        data: { kind: 'note', text: note.text },
    };
}

// Project a Schema (plus optional seed notes) into renderable cells: groups
// first (lowest z), then tables, then notes, then relation links.
export function schemaToCells(schema: Schema, notes: readonly NoteSeed[] = []): Cell[] {
    const positions = layoutTables(schema);
    return [
        ...schema.groups.map((group) => groupCell(group, schema.tables, positions)),
        ...schema.tables.map((table) => tableCell(table, positions)),
        ...notes.map(noteCell),
        ...schema.relations.map(relationCell),
    ];
}

// APPLY EDITED SQL lives in ./apply-sql-schema (kept out of this file for size).

// --- CELLS -> SCHEMA -------------------------------------------------------

// One relation endpoint from a link's `{ id, magnet }` end, or null when the
// end isn't a column-anchored connection (dangling / pinned to a point).
function readEndpoint(end: RelationCell['source']): RelationEndpoint | null {
    const id = end?.id;
    const magnet = end?.magnet;
    if (typeof id !== 'string' || typeof magnet !== 'string') return null;
    const columnId = parseColumnMagnet(magnet);
    return columnId === null ? null : { tableId: id, columnId };
}

function relationFromCell(cell: RelationCell, data: RelationLinkData): Relation | null {
    const source = readEndpoint(cell.source);
    const target = readEndpoint(cell.target);
    if (source === null || target === null) return null;
    return {
        id: data.relationId,
        source,
        target,
        cardinality: data.cardinality,
        onDelete: data.onDelete,
        onUpdate: data.onUpdate,
    };
}

// Group membership for a table is the embedding parent, which is AUTHORITATIVE:
// no parent means ungrouped. This makes drag-to-group AND drag-out survive — the
// seed's `data.table.groupId` is never rewritten on un-embed, so falling back to it
// would resurrect stale membership after a table is dragged out of its group.
// cellsToSchema runs on EVERY store commit (inside the useSchema selector). A
// table grouped by DRAGGING has an authoritative `parent` that its stale
// `data.table.groupId` never mirrors, so the naive `{ ...table, groupId }` would
// allocate a fresh object each frame — and useSchema's identity compare then
// re-renders/regenerates DDL every drag frame, exactly what its memo exists to
// avoid. Cache the derived Table per input ref (data.table is stable across
// position-only commits) so a stable (table, parent) pair yields a stable ref.
const tableWithParentCache = new WeakMap<Table, { parent: string | undefined; result: Table }>();

function tableWithParent(cell: Cell, table: Table): Table {
    const parent = cell.type === 'element' ? cell.parent : undefined;
    const groupId = typeof parent === 'string' ? parent : undefined;
    if (groupId === table.groupId) return table;
    const cached = tableWithParentCache.get(table);
    if (cached && cached.parent === groupId) return cached.result;
    const result = { ...table, groupId };
    tableWithParentCache.set(table, { parent: groupId, result });
    return result;
}

// Reverse projection: read tables/groups/relations back out of the cells. Note
// cells are ignored (they are not part of the Schema domain).
export function cellsToSchema(cells: readonly Cell[]): Schema {
    const tables: Table[] = [];
    const groups: Group[] = [];
    const relations: Relation[] = [];

    for (const cell of cells) {
    // `cell.type` narrows the typed union, so link ends read without escapes.
        if (cell.type === 'link') {
            if (isRelationLink(cell.data)) {
                const relation = relationFromCell(cell, cell.data);
                if (relation !== null) relations.push(relation);
            }
            continue;
        }
        const data = cell.data;
        if (isTableCell(data)) {
            tables.push(tableWithParent(cell, data.table));
        } else if (isGroupCell(data)) {
            groups.push(data.group);
        } else if (isNoteCell(data)) {
            // Notes have no Schema representation — skip.
            continue;
        }
    }

    return { tables, relations, groups };
}
