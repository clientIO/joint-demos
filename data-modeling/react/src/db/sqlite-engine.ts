// SQLite engine backed by sql.js (SQLite compiled to WASM). The WASM module is
// compiled once per tab and shared; each engine instance owns one Database.
// "Eager on first use": the object is cheap to create, and the WASM + Database
// spin up lazily on the first exec/reset so nothing loads until SQL actually runs.
import initSqlJs, { type Database, type SqlJsStatic, type SqlValue } from 'sql.js';
// `?url` hands Vite the emitted .wasm asset URL so `locateFile` can find it.
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import type { EngineKind, QueryResult, SqlEngine } from './types';

const KIND: EngineKind = 'sqlite';

// Shared across every SQLite engine — the compiled module is stateless; only the
// Database instances hold data. Cached so we never recompile the WASM.
let sqlJsReady: Promise<SqlJsStatic> | undefined;

function loadSqlJs(): Promise<SqlJsStatic> {
    sqlJsReady ??= initSqlJs({ locateFile: () => wasmUrl });
    return sqlJsReady;
}

// Run each statement of `sql` in order and report the LAST one's outcome. We use
// prepared statements (not `db.exec`) on purpose: `exec` only returns an entry for
// a statement that actually yields a row, so a SELECT matching 0 rows is
// indistinguishable there from a DDL/DML — it would fall through to
// getRowsModified() (sqlite3_changes), which reflects the previous INSERT/UPDATE
// and mis-labels the empty result as "N rows affected". A prepared statement
// exposes its column names even with 0 rows, so a result-producing statement is
// detected by `getColumnNames().length > 0` and returns an (possibly empty) grid;
// only truly column-less statements fall back to the affected-row count.
function runSql(db: Database, sql: string): QueryResult {
    const started = performance.now();
    let columns: readonly string[] | null = null;
    let rows: SqlValue[][] = [];
    for (const statement of db.iterateStatements(sql)) {
        const names = statement.getColumnNames();
        if (names.length > 0) {
            columns = names;
            rows = [];
            while (statement.step()) rows.push(statement.get());
        } else {
            statement.step(); // DDL / DML — execute it; it produces no column set.
            columns = null;
        }
    }
    const elapsedMs = performance.now() - started;
    // SqlValue (number | string | Uint8Array | null) widens cleanly to unknown.
    if (columns !== null) {
        return { columns, rows, rowCount: rows.length, elapsedMs };
    }
    return { columns: [], rows: [], rowCount: db.getRowsModified(), elapsedMs };
}

export function createSqliteEngine(): SqlEngine {
    let dbPromise: Promise<Database> | undefined;

    function getDb(): Promise<Database> {
        dbPromise ??= loadSqlJs().then((sql) => new sql.Database());
        return dbPromise;
    }

    return {
        kind: KIND,
        async exec(sql: string): Promise<QueryResult> {
            const db = await getDb();
            return runSql(db, sql);
        },
        async reset(): Promise<void> {
            // Close the current DB (frees its WASM memory); next exec lazily makes a
            // fresh empty one. The compiled module stays cached.
            if (!dbPromise) return;
            const db = await dbPromise;
            db.close();
            dbPromise = undefined;
        },
        dispose(): void {
            // Interface is sync; close in the background once the DB resolves.
            void dbPromise?.then((db) => db.close());
            dbPromise = undefined;
        },
    };
}
