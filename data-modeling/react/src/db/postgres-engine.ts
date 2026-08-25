// Postgres engine backed by pglite (real Postgres compiled to WASM). The driver is
// ~3MB, so it is imported LAZILY via a dynamic `import()` inside init — keeping it
// out of the main bundle until the user actually runs Postgres. The static
// `import type` below is erased at build time and pulls in no runtime code.
import type { PGlite, Results } from '@electric-sql/pglite';
import type { EngineKind, QueryResult, SqlEngine } from './types';

const KIND: EngineKind = 'postgres';

// User-defined guard: narrows to `readonly unknown[]` (unlike built-in
// Array.isArray, which widens to any[]) so row cells stay `unknown`.
function isUnknownArray(value: unknown): value is readonly unknown[] {
    return Array.isArray(value);
}

// pglite `exec` runs a multi-statement script and returns one Results per
// statement; we report the last. With rowMode 'array' each row is a positional
// array aligned with `fields`.
function toQueryResult(results: readonly Results[], elapsedMs: number): QueryResult {
    const last = results.at(-1);
    if (!last) {
        return { columns: [], rows: [], rowCount: 0, elapsedMs };
    }
    const columns = last.fields.map((field) => field.name);
    const rawRows: readonly unknown[] = last.rows;
    const rows = rawRows.map((row): readonly unknown[] =>
        isUnknownArray(row) ? row : [],
    );
    // SELECT reports its rows; INSERT/UPDATE/DELETE report affected-row count.
    const rowCount = rows.length > 0 ? rows.length : (last.affectedRows ?? 0);
    return { columns, rows, rowCount, elapsedMs };
}

export function createPostgresEngine(): SqlEngine {
    let dbPromise: Promise<PGlite> | undefined;

    function getDb(): Promise<PGlite> {
    // Dynamic import = the heavy WASM driver downloads only on first Postgres use.
        dbPromise ??= import('@electric-sql/pglite').then(
            ({ PGlite }) => new PGlite(),
        );
        return dbPromise;
    }

    return {
        kind: KIND,
        async exec(sql: string): Promise<QueryResult> {
            const db = await getDb();
            const started = performance.now();
            const results = await db.exec(sql, { rowMode: 'array' });
            return toQueryResult(results, performance.now() - started);
        },
        async reset(): Promise<void> {
            if (!dbPromise) return;
            const db = await dbPromise;
            await db.close();
            dbPromise = undefined;
        },
        dispose(): void {
            // Interface is sync; close in the background once the DB resolves.
            void dbPromise?.then((db) => db.close());
            dbPromise = undefined;
        },
    };
}
