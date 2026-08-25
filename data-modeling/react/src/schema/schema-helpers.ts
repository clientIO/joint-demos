// Pure selectors over the schema model. No mutation, no I/O — every function
// is a plain read. FK-related helpers derive from `relations` only, honouring
// the "FK is a Relation" decision documented in types.ts.

import type { Column, Dialect, Relation, RelationEndpoint, Schema, Table } from './types';

// A table name for a kysely builder, schema-qualified as `schema.name` when a
// namespace is set — kysely parses the dotted string into a qualified identifier
// and quotes each part. SQLite has no schemas (a dotted name means an ATTACHed
// database), so it is never qualified there. Shared by generate-ddl / generate-query
// so every emitter qualifies identically.
export function qualifiedTableName(table: Table, dialect: Dialect): string {
    return dialect !== 'sqlite' && table.schema ? `${table.schema}.${table.name}` : table.name;
}

// The end of a relation that HOLDS the foreign key — the "many"/child side. A
// '1:N' relation draws the SOURCE as the "one"/parent and the TARGET as the
// "many"/child (crow's-foot on the target), so its FK lives on the TARGET; every
// other cardinality ('N:1', '1:1') keeps the FK on the source. `fkParent` is the
// referenced (one / primary-key) counterpart. Every FK-placement decision — DDL
// emission, CREATE-TABLE dependency order, the isForeignKey badge — MUST derive
// from these so the diagram's crow's-foot and the generated constraint agree.
export function fkChild(relation: Relation): RelationEndpoint {
    return relation.cardinality === '1:N' ? relation.target : relation.source;
}

export function fkParent(relation: Relation): RelationEndpoint {
    return relation.cardinality === '1:N' ? relation.source : relation.target;
}

// The table with this id, or undefined if none matches.
export function findTable(schema: Schema, tableId: string): Table | undefined {
    return schema.tables.find((table) => table.id === tableId);
}

// Global column lookup by id (column ids are unique across the schema).
// Undefined if no table holds it.
export function columnById(schema: Schema, columnId: string): Column | undefined {
    for (const table of schema.tables) {
        const column = table.columns.find((col) => col.id === columnId);
        if (column) return column;
    }
    return undefined;
}

// Is this column a foreign key? True when it is the FK-holding (child/many)
// endpoint of any relation — see fkChild for why that isn't always `source`.
export function isForeignKey(columnId: string, relations: readonly Relation[]): boolean {
    return relations.some((relation) => fkChild(relation).columnId === columnId);
}
