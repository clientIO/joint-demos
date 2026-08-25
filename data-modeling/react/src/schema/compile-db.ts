// Compile-only Kysely factory. We use kysely purely as a SQL *string* emitter:
// a DummyDriver that never connects, paired with the target dialect's Adapter +
// QueryCompiler (+ Introspector, required by the Dialect interface but unused).
// Calling `.compile()` on any builder returns the dialect-correct SQL without a
// database. This is the officially-supported way to render SQL offline.

import {
    DummyDriver,
    Kysely,
    MysqlAdapter,
    MysqlIntrospector,
    MysqlQueryCompiler,
    PostgresAdapter,
    PostgresIntrospector,
    PostgresQueryCompiler,
    SqliteAdapter,
    SqliteIntrospector,
    SqliteQueryCompiler,
} from 'kysely';
import type { Dialect as KyselyDialect } from 'kysely';
import type { Dialect } from './types';

// Open schema: any table name, any column name. An ERD's tables aren't known at
// TypeScript-compile time, so we model the DB as fully open. This keeps the
// query/schema builders happy for arbitrary runtime names WITHOUT `any`.
export type OpenDatabase = Record<string, Record<string, unknown>>;

// Build the kysely Dialect object for a target. `db` in createIntrospector is
// contextually typed by kysely's interface (Kysely<any>) — not an `any` we wrote
// — and the introspector is never invoked in compile-only mode.
function kyselyDialect(dialect: Dialect): KyselyDialect {
    switch (dialect) {
        case 'sqlite':
            return {
                createDriver: () => new DummyDriver(),
                createQueryCompiler: () => new SqliteQueryCompiler(),
                createAdapter: () => new SqliteAdapter(),
                createIntrospector: (db) => new SqliteIntrospector(db),
            };
        case 'postgres':
            return {
                createDriver: () => new DummyDriver(),
                createQueryCompiler: () => new PostgresQueryCompiler(),
                createAdapter: () => new PostgresAdapter(),
                createIntrospector: (db) => new PostgresIntrospector(db),
            };
        case 'mysql':
            return {
                createDriver: () => new DummyDriver(),
                createQueryCompiler: () => new MysqlQueryCompiler(),
                createAdapter: () => new MysqlAdapter(),
                createIntrospector: (db) => new MysqlIntrospector(db),
            };
    }
}

// A Kysely bound to the dialect but with no live connection. Reuse per call is
// cheap; there's no pool to leak because the driver is a no-op.
export function compileOnlyDb(dialect: Dialect): Kysely<OpenDatabase> {
    return new Kysely<OpenDatabase>({ dialect: kyselyDialect(dialect) });
}
