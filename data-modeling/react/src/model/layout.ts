// Deterministic, pure auto-layout for the ERD. No @joint import, no randomness:
// same Schema in -> same positions out, which keeps first-load and the
// round-trip check reproducible.
//
// ponytail: naive grid packer — tables tile into fixed-width columns, and
// tables sharing a groupId cluster side-by-side. It ignores relation topology
// (no edge-crossing minimisation). UPGRADE PATH: swap `layoutTables` for a
// layered/Sugiyama pass (e.g. @joint/layout-directed-graph) driven by
// schema.relations when a real ERD layout is wanted — callers only depend on
// the returned Map, so nothing else changes.

import type { Schema, Table } from '../schema/types';

export interface Point {
  readonly x: number;
  readonly y: number;
}

// Wider than strictly needed for the text so the row content (name · type · flags)
// has breathing room from the left/right link ports at the card edges.
export const TABLE_WIDTH = 340;

// Row / chrome heights that size a table card to its column count.
const TABLE_HEADER = 46;
const TABLE_ROW = 33;
const TABLE_FOOTER = 32;

// Model height a table needs to show its columns without scrolling.
export function estimateTableHeight(columnCount: number): number {
    return TABLE_HEADER + columnCount * TABLE_ROW + TABLE_FOOTER;
}

// Default table footprint for the packer's grid stride (a 4-column table).
export const TABLE_EST: { readonly width: number; readonly height: number } = {
    width: TABLE_WIDTH,
    height: estimateTableHeight(4),
};

// Padding a group container adds around its member tables; extra room on top
// for the group's header bar.
export const GROUP_PADDING = 28;
export const GROUP_HEADER = 44;
// A little extra room below the last table so it never looks flush with the group's
// bottom edge (added to the group height only).
export const GROUP_BOTTOM_EXTRA = 20;

// Spacing constants for the packer.
const COLUMN_GAP = TABLE_EST.width + 80; // x stride between table columns
const ROW_GAP = 64; // vertical GAP between stacked tables (added to each table's height)
const CLUSTER_GAP = 120; // x gap between clusters
const TABLES_PER_COLUMN = 3; // tables stacked vertically before wrapping
const ORIGIN = 80; // top-left inset of the whole diagram

// Tables in schema order that belong to the given group (undefined = ungrouped).
function tablesInCluster(schema: Schema, groupId: string | undefined): readonly Table[] {
    return schema.tables.filter((table) => table.groupId === groupId);
}

// Place one cluster's tables in a column-major grid anchored at xCursor.
// Returns the map entries and the width consumed so the next cluster follows.
function packCluster(
    tables: readonly Table[],
    xCursor: number,
    yTop: number,
    into: Map<string, Point>,
): number {
    // Stride each column by the ACTUAL height of the tables above it (+ ROW_GAP), not
    // a fixed 4-column estimate — otherwise a taller table (more columns) overlaps the
    // next one below it.
    const columnY = new Map<number, number>();
    tables.forEach((table, index) => {
        const col = Math.floor(index / TABLES_PER_COLUMN);
        const y = columnY.get(col) ?? yTop;
        into.set(table.id, { x: xCursor + col * COLUMN_GAP, y });
        columnY.set(col, y + estimateTableHeight(table.columns.length) + ROW_GAP);
    });
    const columnCount = Math.max(1, Math.ceil(tables.length / TABLES_PER_COLUMN));
    return columnCount * COLUMN_GAP;
}

// Map every table id -> its top-left position. Clusters are laid out left to
// right in group order, ungrouped tables last.
export function layoutTables(schema: Schema): Map<string, Point> {
    const positions = new Map<string, Point>();
    let xCursor = ORIGIN;

    const clusterKeys: readonly (string | undefined)[] = [
        ...schema.groups.map((group) => group.id),
        undefined,
    ];

    for (const key of clusterKeys) {
        const tables = tablesInCluster(schema, key);
        if (tables.length === 0) continue;
        // Grouped clusters sit lower so the group header bar has clear room above.
        const yTop = key === undefined ? ORIGIN : ORIGIN + GROUP_HEADER;
        const width = packCluster(tables, xCursor, yTop, positions);
        xCursor += width + CLUSTER_GAP;
    }

    return positions;
}
