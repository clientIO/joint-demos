// Read-only sample SELECT queries for an ERD, compiled to the target dialect via
// kysely's query builder (compile-only, see compile-db.ts). These are examples a
// user could copy and run — a full-table scan per table plus one JOIN across the
// first relation. No mutations are ever generated.

import { compileOnlyDb } from './compile-db';
import { findTable, qualifiedTableName } from './schema-helpers';
import type { Dialect, Schema } from './types';

export interface SampleQuery {
  readonly title: string;
  readonly sql: string;
}

// SELECT * per table, then a JOIN following the first relation (child -> parent).
export function generateSampleQueries(schema: Schema, dialect: Dialect): SampleQuery[] {
    const db = compileOnlyDb(dialect);
    const queries: SampleQuery[] = [];

    for (const table of schema.tables) {
        queries.push({
            title: `All rows from ${table.name}`,
            // Schema-qualified so the query runs against the same qualified tables
            // generate-ddl seeds the DB with (a bare name errors on a schema-qualified
            // Postgres table). Titles keep the bare name for readability.
            sql: db.selectFrom(qualifiedTableName(table, dialect)).selectAll().compile().sql,
        });
    }

    const relation = schema.relations[0];
    if (relation) {
        const source = findTable(schema, relation.source.tableId);
        const target = findTable(schema, relation.target.tableId);
        const sourceColumn = source?.columns.find((c) => c.id === relation.source.columnId);
        const targetColumn = target?.columns.find((c) => c.id === relation.target.columnId);
        if (source && target && sourceColumn && targetColumn) {
            const sourceRef = qualifiedTableName(source, dialect);
            const targetRef = qualifiedTableName(target, dialect);
            const sql = db
                .selectFrom(sourceRef)
                .innerJoin(
                    targetRef,
                    `${targetRef}.${targetColumn.name}`,
                    `${sourceRef}.${sourceColumn.name}`,
                )
                .selectAll()
                .compile().sql;
            queries.push({ title: `${source.name} joined with ${target.name}`, sql });
        }
    }

    return queries;
}
