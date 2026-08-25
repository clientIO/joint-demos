// Paste-identity repair. The built-in clipboard pastes a cell with a FRESH cell
// id but clones `data` VERBATIM — so a pasted table arrives with the original's
// table.id, table.name, and every column id. Duplicate column ids across tables
// bleed the relationship hover onto unrelated columns and make column magnets
// ambiguous; a duplicate table name breaks the generated DDL (`create table if
// not exists` silently skips the second one).
//
// This runs inside the controlled `onCellsChange` path (see app.tsx): the
// `table.id !== cell.id` mismatch is the paste discriminator (every cell this
// app mints keeps them equal), and the repaired cells flow back into the graph
// through the controlled re-sync. Identity-preserving when nothing needs fixing
// — the SAME array (and untouched cells) come back, so clean commits cost one
// scan and no re-sync churn. Idempotent by construction.

import { newId } from '../schema/id';
import {
    columnMagnet,
    isGroupCell,
    isTableCell,
    parseColumnMagnet,
    type Cell,
} from './cell-data';

type LinkEnd = Extract<Cell, { type: 'link' }>['source'];

export function normalizePastedCells(cells: readonly Cell[]): readonly Cell[] {
    // Table names already legitimately in use (clean cells only), for uniquifying.
    const takenNames = new Set<string>();
    for (const cell of cells) {
        if (
            cell.type === 'element' &&
      isTableCell(cell.data) &&
      String(cell.data.table.id) === String(cell.id)
        ) {
            takenNames.add(cell.data.table.name);
        }
    }

    // Per re-minted CELL id: old column id -> fresh column id, so link ends
    // attached to that cell can follow.
    const columnRemap = new Map<string, ReadonlyMap<string, string>>();

    let changed = false;
    const next = cells.map((cell): Cell => {
        if (cell.type !== 'element' || cell.id === undefined) return cell;
        if (isTableCell(cell.data)) {
            const { table } = cell.data;
            if (String(table.id) === String(cell.id)) return cell; // minted here — clean
            changed = true;
            const remap = new Map<string, string>();
            const columns = table.columns.map((column) => {
                const id = newId('col');
                remap.set(column.id, id);
                return { ...column, id };
            });
            const indexes = table.indexes.map((index) => ({
                ...index,
                columnIds: index.columnIds.map((id) => remap.get(id) ?? id),
            }));
            let name = table.name;
            while (takenNames.has(name)) name = `${name}_copy`;
            takenNames.add(name);
            columnRemap.set(String(cell.id), remap);
            return {
                ...cell,
                data: { ...cell.data, table: { ...table, id: String(cell.id), name, columns, indexes }},
            };
        }
        if (isGroupCell(cell.data)) {
            const { group } = cell.data;
            if (String(group.id) === String(cell.id)) return cell;
            changed = true;
            return { ...cell, data: { ...cell.data, group: { ...group, id: String(cell.id) }}};
        }
        return cell;
    });

    if (!changed) return cells;

    // Second pass: link ends attached to a re-minted table follow its fresh
    // column ids (pasting a table WITH its relations keeps them connected).
    const remapEnd = (end: LinkEnd): LinkEnd => {
        if (end?.id === undefined || typeof end.magnet !== 'string') return end;
        const remap = columnRemap.get(String(end.id));
        if (!remap) return end;
        const oldColumn = parseColumnMagnet(end.magnet);
        const fresh = oldColumn === null ? undefined : remap.get(oldColumn);
        return fresh === undefined ? end : { ...end, magnet: columnMagnet(fresh) };
    };
    return next.map((cell): Cell => {
        if (cell.type !== 'link') return cell;
        const source = remapEnd(cell.source);
        const target = remapEnd(cell.target);
        return source === cell.source && target === cell.target
            ? cell
            : { ...cell, source, target };
    });
}
