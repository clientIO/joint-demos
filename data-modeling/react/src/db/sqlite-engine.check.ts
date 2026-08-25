// Smallest runnable check that fails if the sql.js mapping breaks. Side-effect
// free on import — call runSqliteChecks() explicitly (e.g. from a scratch script
// or the browser console) to exercise it. No pglite check here: it would drag the
// ~3MB Postgres WASM into whatever imports this, defeating the lazy-load design.
import { createSqliteEngine } from './sqlite-engine';

function assert(condition: boolean, message: string): void {
    if (!condition) throw new Error(`sqlite-engine check failed: ${message}`);
}

export async function runSqliteChecks(): Promise<void> {
    const engine = createSqliteEngine();
    try {
        const result = await engine.exec(
            'CREATE TABLE t(id INTEGER PRIMARY KEY, name TEXT);' +
        'INSERT INTO t VALUES (1,\'a\');' +
        'SELECT * FROM t;',
        );
        assert(result.rowCount === 1, `expected 1 row, got ${result.rowCount}`);
        assert(result.rows.length === 1, 'expected one row array back');

        const [row] = result.rows;
        assert(row.length === 2, `expected 2 columns, got ${row.length}`);
        // Cells are `unknown` by contract — narrow before asserting on values.
        const [id, name] = row;
        assert(id === 1, `expected id 1, got ${String(id)}`);
        assert(name === 'a', `expected name 'a', got ${String(name)}`);
        assert(
            result.columns.length === 2 && result.columns[0] === 'id',
            `unexpected columns: ${result.columns.join(', ')}`,
        );

        // A SELECT matching 0 rows must return an empty RESULT SET (columns present,
        // 0 rows) — NOT be misreported as "1 row affected" carried over from the INSERT
        // above (sql.js's getRowsModified is not reset by a SELECT).
        const empty = await engine.exec('SELECT * FROM t WHERE id = 999;');
        assert(empty.columns.length === 2, `0-row SELECT should keep its columns, got ${empty.columns.length}`);
        assert(empty.rows.length === 0, `0-row SELECT should return 0 rows, got ${empty.rows.length}`);
        assert(empty.rowCount === 0, `0-row SELECT rowCount should be 0, got ${empty.rowCount}`);
    } finally {
        engine.dispose();
    }
}
