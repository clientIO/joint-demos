// Factories for cells created from the toolbar's draw-to-create. Each returns a
// fresh Cell at the drawn bounds, reusing the schema id generator and the same
// cell-data shapes schema-cells produces, so new cells round-trip identically.

import { newId } from '../schema/id';
import type { Column, Table } from '../schema/types';
import type { Cell } from './cell-data';
import { TABLE_WIDTH, estimateTableHeight } from './layout';
// Canonical paint order (group < note < link < table), shared with the seed +
// the runtime z-order normalizer so a freshly drawn cell starts at the right depth.
import { Z_GROUP, Z_NOTE, Z_TABLE } from './z-order';

export interface Bounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

// A new table starts with a single primary-key `id` column. Model-sized + freely
// resizable, so the DRAWN bounds are respected (clamped to a usable minimum).
export function createTableCell(bounds: Bounds): Cell {
    const tableId = newId('tbl');
    const idColumn: Column = {
        id: newId('col'),
        name: 'id',
        type: { kind: 'integer' },
        primaryKey: true,
        unique: true,
        nullable: false,
    };
    const table: Table = { id: tableId, name: 'new_table', indexes: [], columns: [idColumn] };
    return {
        id: tableId,
        type: 'element',
        position: { x: bounds.x, y: bounds.y },
        size: {
            // Clamp to the SEED table width, not a cramped 220 — a click-to-create (0-width
            // bounds) table was too narrow to comfortably click a column name to rename it.
            width: Math.max(TABLE_WIDTH, bounds.width),
            height: Math.max(estimateTableHeight(table.columns.length), bounds.height),
        },
        z: Z_TABLE,
        data: { kind: 'table', table },
    };
}

// A group takes the drawn bounds (free-size container), clamped to a usable min.
export function createGroupCell(bounds: Bounds): Cell {
    const id = newId('grp');
    return {
        id,
        type: 'element',
        position: { x: bounds.x, y: bounds.y },
        size: { width: Math.max(220, bounds.width), height: Math.max(140, bounds.height) },
        z: Z_GROUP,
        data: { kind: 'group', group: { id, name: 'New group', collapsed: false }},
    };
}

// A note is model-sized + freely resizable, so the DRAWN bounds are respected
// (clamped to a usable minimum for a tiny drag).
export function createNoteCell(bounds: Bounds): Cell {
    return {
        id: newId('note'),
        type: 'element',
        position: { x: bounds.x, y: bounds.y },
        size: { width: Math.max(180, bounds.width), height: Math.max(100, bounds.height) },
        z: Z_NOTE,
        data: { kind: 'note', text: '' },
    };
}
