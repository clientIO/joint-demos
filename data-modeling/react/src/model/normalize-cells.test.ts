// The paste-identity bug: the built-in clipboard clones a table cell with a FRESH
// cell id but the SAME `data` — table.id, table.name, and every column id come
// along verbatim. Duplicate column ids across tables bleed the relationship
// hover-highlight onto unrelated columns, make column magnets ambiguous, and a
// duplicate table name breaks the generated DDL (`create table if not exists`
// silently skips the second one). `normalizePastedCells` runs in the controlled
// onCellsChange path and re-mints a pasted table's identity.

import { describe, expect, it } from 'vitest';
import type { Cell } from './cell-data';
import { normalizePastedCells } from './normalize-cells';
import { isTableCell } from './cell-data';
import { columnMagnet } from './cell-data';

const ORIGINAL: Cell = {
    id: 'tbl_users',
    type: 'element',
    position: { x: 0, y: 0 },
    size: { width: 340, height: 200 },
    data: {
        kind: 'table',
        table: {
            id: 'tbl_users',
            name: 'users',
            columns: [
                { id: 'col_users_id', name: 'id', type: { kind: 'uuid' }, primaryKey: true, unique: true, nullable: false },
                { id: 'col_users_email', name: 'email', type: { kind: 'varchar' }, primaryKey: false, unique: true, nullable: false },
            ],
            indexes: [{ id: 'idx_email', name: 'users_email_idx', columnIds: ['col_users_email'], unique: true }],
        },
    },
};

// What the clipboard actually produces (verified in-browser): new cell id,
// identical `data` payload.
const PASTED: Cell = {
    ...ORIGINAL,
    id: 'c09e15bd-7528-4b8e-9985-76687d78d1e5',
    position: { x: 400, y: 0 },
};

function tableOf(cell: Cell) {
    if (cell.type !== 'element' || !isTableCell(cell.data)) throw new Error('not a table cell');
    return cell.data.table;
}

describe('normalizePastedCells', () => {
    it('re-mints a pasted table: table.id = cell id, fresh column ids, remapped indexes, unique name', () => {
        const result = normalizePastedCells([ORIGINAL, PASTED]);
        const [keptCell, pastedCell] = result;

        // The original is untouched — same reference.
        expect(keptCell).toBe(ORIGINAL);

        const pasted = tableOf(pastedCell);
        // Identity restored: the domain table id matches its cell id again.
        expect(pasted.id).toBe(String(PASTED.id));
        // Every column id is fresh — disjoint from the original's.
        const originalIds = new Set(tableOf(ORIGINAL).columns.map((column) => column.id));
        for (const column of pasted.columns) {
            expect(originalIds.has(column.id)).toBe(false);
        }
        // Column NAMES and order survive.
        expect(pasted.columns.map((column) => column.name)).toEqual(['id', 'email']);
        // Indexes follow the re-minted ids.
        expect(pasted.indexes[0]?.columnIds).toEqual([pasted.columns[1]?.id]);
        // The duplicate table name is uniquified (SQL needs distinct names).
        expect(pasted.name).not.toBe('users');
        expect(pasted.name.startsWith('users')).toBe(true);
    });

    it('remaps link end magnets that point at the pasted cell', () => {
        const link: Cell = {
            id: 'rel_x',
            type: 'link',
            source: { id: PASTED.id, magnet: columnMagnet('col_users_id') },
            target: { id: 'tbl_users', magnet: columnMagnet('col_users_id') },
            data: { kind: 'relation', relationId: 'rel_x', cardinality: 'N:1' },
        };
        const result = normalizePastedCells([ORIGINAL, PASTED, link]);
        const pasted = tableOf(result[1]);
        const normalizedLink = result[2];
        if (normalizedLink.type !== 'link') throw new Error('expected link');
        // The pasted-side end follows the fresh column id…
        expect(normalizedLink.source?.magnet).toBe(columnMagnet(pasted.columns[0]?.id ?? ''));
        // …while the original-side end is untouched.
        expect(normalizedLink.target?.magnet).toBe(columnMagnet('col_users_id'));
    });

    it('returns the SAME array for already-clean cells (identity, no re-sync churn) and is idempotent', () => {
        const clean = [ORIGINAL];
        expect(normalizePastedCells(clean)).toBe(clean);

        const once = normalizePastedCells([ORIGINAL, PASTED]);
        expect(normalizePastedCells(once)).toBe(once);
    });
});
