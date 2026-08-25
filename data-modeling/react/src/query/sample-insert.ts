// Builds a ready-to-run INSERT template for the first table in the schema, used to
// seed the Query Runner with example data. Pure (no React, no engine): given the
// schema + dialect it returns a single sample query, or null when there's nothing
// to insert into.

import type { SampleQuery } from '@/schema/generate-query';
import type { ColumnType } from '@/schema/sql-types';
import type { Dialect, Schema } from '@/schema/types';

// A best-effort literal per column type so the generated INSERT actually runs on
// SQLite and Postgres. ponytail: covers the common ERD types; exotic ones fall
// back to a quoted string the user tweaks — it's a starting template, not a fixture.
function sampleLiteral(type: ColumnType, dialect: Dialect): string {
    switch (type.kind) {
        case 'integer':
        case 'bigint':
        case 'smallint':
            return '1';
        case 'real':
        case 'double':
        case 'numeric':
            return '1.5';
        case 'boolean':
            return dialect === 'postgres' ? 'true' : '1';
        case 'date':
            return '\'2024-01-01\'';
        case 'time':
            return '\'12:00:00\'';
        case 'timestamp':
            return '\'2024-01-01 12:00:00\'';
        case 'uuid':
            return '\'00000000-0000-0000-0000-000000000000\'';
        case 'json':
            return '\'{}\'';
        default:
            return '\'sample\''; // text, varchar, char, blob, raw
    }
}

// An INSERT template for the first table. Identifiers are double-quoted (standard
// SQL, accepted by SQLite + Postgres — the only engines that run this).
export function insertSample(schema: Schema, dialect: Dialect): SampleQuery | null {
    const table = schema.tables[0];
    if (!table || table.columns.length === 0) return null;
    const cols = table.columns.map((column) => `"${column.name}"`).join(', ');
    const vals = table.columns.map((column) => sampleLiteral(column.type, dialect)).join(', ');
    // Qualify with the schema on Postgres/MySQL so the INSERT hits the same table the
    // seeded DDL created; SQLite has no schemas (see generate-ddl's qualifiedName).
    const target = dialect !== 'sqlite' && table.schema ? `"${table.schema}"."${table.name}"` : `"${table.name}"`;
    return {
        title: `Insert into ${table.name}`,
        sql: `INSERT INTO ${target} (${cols}) VALUES (${vals})`,
    };
}
