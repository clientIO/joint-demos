// Runnable self-check for the SCHEMA <-> CELLS round-trip. Import and call
// `runSchemaCellsChecks()` — it builds cells from the seed schema, projects them
// back, and asserts tables/columns/relations/groups counts plus a sample FK
// survive. No side effects on import.

import assert from 'node:assert';
import { isNoteCell, isTableCell } from './cell-data';
import { INITIAL_NOTES, INITIAL_SCHEMA } from './initial-schema';
import { cellsToSchema, schemaToCells } from './schema-cells';
import { applySqlSchema } from './apply-sql-schema';
import type { Schema } from '../schema/types';

export function runSchemaCellsChecks(): void {
    const cells = schemaToCells(INITIAL_SCHEMA, INITIAL_NOTES);

    // Every table/group/relation/note becomes exactly one cell.
    const noteCount = cells.filter((cell) => isNoteCell(cell.data)).length;
    assert.strictEqual(noteCount, INITIAL_NOTES.length, 'note cells');
    assert.strictEqual(
        cells.length,
        INITIAL_SCHEMA.tables.length +
      INITIAL_SCHEMA.groups.length +
      INITIAL_SCHEMA.relations.length +
      INITIAL_NOTES.length,
        'total cell count',
    );

    const back = cellsToSchema(cells);

    // Counts survive the round-trip (notes are dropped — not a Schema concept).
    assert.strictEqual(back.tables.length, INITIAL_SCHEMA.tables.length, 'table count');
    assert.strictEqual(back.groups.length, INITIAL_SCHEMA.groups.length, 'group count');
    assert.strictEqual(back.relations.length, INITIAL_SCHEMA.relations.length, 'relation count');

    // Columns and group membership survive per table.
    for (const original of INITIAL_SCHEMA.tables) {
        const projected = back.tables.find((table) => table.id === original.id);
        assert.ok(projected, `table ${original.id} survives`);
        assert.strictEqual(projected.columns.length, original.columns.length, `columns of ${original.id}`);
        assert.strictEqual(projected.groupId, original.groupId, `group of ${original.id}`);
    }

    // A specific FK survives with its exact endpoints and cardinality.
    const fk = back.relations.find((relation) => relation.id === 'rel_task_project');
    assert.ok(fk, 'sample FK rel_task_project survives');
    assert.strictEqual(fk.source.tableId, 'tbl_tasks', 'FK source table');
    assert.strictEqual(fk.source.columnId, 'col_task_project', 'FK source column');
    assert.strictEqual(fk.target.tableId, 'tbl_projects', 'FK target table');
    assert.strictEqual(fk.target.columnId, 'col_proj_id', 'FK target column');
    assert.strictEqual(fk.cardinality, 'N:1', 'FK cardinality');
}

// applySqlSchema (the SQL-panel Save path) re-parses SQL into FRESH ids. An
// unchanged (same-name) table must keep its PREVIOUS cell id and position, or Save
// would drop the current selection and re-layout the table as brand-new.
export function runApplySqlChecks(): void {
    const original = INITIAL_SCHEMA.tables[0];
    assert.ok(original, 'seed has at least one table');

    const current = schemaToCells(INITIAL_SCHEMA);
    const currentCell = current.find((cell) => isTableCell(cell.data) && cell.data.table.name === original.name);
    assert.ok(currentCell, 'current cell for first table exists');
    const currentPosition = Reflect.get(currentCell, 'position');

    // Simulate importSql: SAME table name, brand-new ids (as the parser would mint).
    const parsed: Schema = {
        tables: [
            {
                ...original,
                id: 'tbl_fresh_id',
                columns: original.columns.map((col) => ({ ...col, id: `${col.id}_fresh` })),
            },
        ],
        relations: [],
        groups: [],
    };

    const applied = applySqlSchema(current, parsed);
    const appliedCell = applied.find((cell) => isTableCell(cell.data) && cell.data.table.name === original.name);
    assert.ok(appliedCell, 'applied cell for first table exists');
    assert.strictEqual(String(appliedCell.id), original.id, 'unchanged table keeps its previous cell id after Save');
    assert.deepStrictEqual(
        Reflect.get(appliedCell, 'position'),
        currentPosition,
        'unchanged table keeps its position after Save',
    );
}
