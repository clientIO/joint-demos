// APPLY EDITED SQL (non-destructive), split out of schema-cells.ts to keep both
// files under the size cap. `importSql` re-parses the whole panel into FRESH ids, so
// this layer (a) reuses the previous cell ids of unchanged same-name tables/columns
// and (b) preserves the position/size/colour/group membership that SQL can't express
// — while the parsed SQL still drives columns and relations.

import { schemaToCells } from './schema-cells';
import { isGroupCell, isNoteCell, isTableCell, type Cell } from './cell-data';
import type { Schema } from '../schema/types';

// Reuse the ids of unchanged (same-name) tables and columns when applying edited
// SQL. `importSql` mints fresh ids for everything it parses, so a Save would give
// every table a new id even if untouched — which drops the current selection (its
// ids no longer exist) and re-lays-out the table as brand-new. Matching by name,
// we map each parsed table/column id back onto the previous cell's id and remap
// relations + indexes to match, so unchanged tables keep stable identity. Renamed
// tables/columns have no match and get fresh ids (unavoidable without a structural
// diff) — only the renamed one loses its selection/layout, not the whole schema.
function reusePreviousIds(parsed: Schema, current: readonly Cell[]): Schema {
    const prevTableId = new Map<string, string>();
    const prevColsByTable = new Map<string, Map<string, string>>();
    for (const cell of current) {
        if (!isTableCell(cell.data) || typeof cell.id !== 'string') continue;
        const prev = cell.data.table;
        prevTableId.set(prev.name, cell.id);
        prevColsByTable.set(prev.name, new Map(prev.columns.map((col) => [col.name, col.id])));
    }

    const idMap = new Map<string, string>();
    for (const table of parsed.tables) {
        const prevId = prevTableId.get(table.name);
        if (prevId !== undefined) idMap.set(table.id, prevId);
        const prevCols = prevColsByTable.get(table.name);
        if (prevCols) {
            for (const col of table.columns) {
                const prevColId = prevCols.get(col.name);
                if (prevColId !== undefined) idMap.set(col.id, prevColId);
            }
        }
    }
    if (idMap.size === 0) return parsed;

    const remap = (id: string): string => idMap.get(id) ?? id;
    return {
        tables: parsed.tables.map((table) => ({
            ...table,
            id: remap(table.id),
            columns: table.columns.map((col) => ({ ...col, id: remap(col.id) })),
            indexes: table.indexes.map((index) => ({ ...index, columnIds: index.columnIds.map(remap) })),
        })),
        relations: parsed.relations.map((relation) => ({
            ...relation,
            source: { tableId: remap(relation.source.tableId), columnId: remap(relation.source.columnId) },
            target: { tableId: remap(relation.target.tableId), columnId: remap(relation.target.columnId) },
        })),
        groups: parsed.groups,
    };
}

// Apply a schema PARSED FROM SQL without discarding what SQL can't express.
// Groups and notes have no SQL representation, so a plain re-projection would wipe
// them (and removing embedded parents wholesale can crash joint-react). Instead we
// KEEP existing group + note cells, and for each surviving table (matched by name)
// preserve its position, size, colour, and group membership, while the parsed SQL
// drives columns and relations. New tables land via layout; deleted tables drop.
export function applySqlSchema(current: readonly Cell[], parsedRaw: Schema): Cell[] {
    // Stabilise ids first so unchanged tables keep the same cell id across a Save.
    const parsed = reusePreviousIds(parsedRaw, current);
    const previousTables = new Map<string, Cell>();
    const groups: Cell[] = [];
    const notes: Cell[] = [];
    for (const cell of current) {
        if (isTableCell(cell.data)) previousTables.set(cell.data.table.name, cell);
        else if (isGroupCell(cell.data)) groups.push(cell);
        else if (isNoteCell(cell.data)) notes.push(cell);
    }

    const projected = schemaToCells(parsed).map((cell): Cell => {
        if (cell.type !== 'element' || !isTableCell(cell.data)) return cell;
        const previous = previousTables.get(cell.data.table.name);
        if (previous === undefined || previous.type !== 'element' || !isTableCell(previous.data)) {
            return cell;
        }
        // Typed reads off the previous element record — presentation SQL can't carry.
        const { position, size, parent } = previous;
        return {
            ...cell,
            ...(position ? { position } : {}),
            ...(size ? { size } : {}),
            ...(parent !== undefined ? { parent } : {}),
            // Keep the presentation tint the SQL can't carry.
            data: { ...cell.data, fill: previous.data.fill },
        };
    });

    // Groups + notes first (back of the z-order), then the merged tables + relations.
    return [...groups, ...notes, ...projected];
}
