// Dialect-correct DDL generation. Emits CREATE TABLE (with NOT NULL / PRIMARY
// KEY / UNIQUE / DEFAULT + FK constraints derived from Relations) and CREATE
// INDEX, using kysely's schema builder in compile-only mode (see compile-db.ts).
//
// WHY foreign keys come from `schema.relations`, not columns: the domain model
// stores FKs exclusively as Relations (see types.ts). We walk the relations for
// each table and emit one FOREIGN KEY constraint per matching relation.

import type { CreateTableBuilder } from 'kysely';
import { sql } from 'kysely';
import { compileOnlyDb } from './compile-db';
import { columnById, findTable, fkChild, fkParent, qualifiedTableName } from './schema-helpers';
import { SQL_TYPE_KEYWORDS } from './sql-types';
import type { ColumnType } from './sql-types';
import { DIALECT_REFERENTIAL_ACTIONS } from './types';
import type { Dialect, Index, Schema, Table } from './types';

// Render a ColumnType as the dialect's SQL type string, appending
// length/precision for the parameterised kinds. `raw` passes through verbatim.
function columnSqlType(type: ColumnType, dialect: Dialect): string {
    if (type.kind === 'raw') return type.sql;
    const base = SQL_TYPE_KEYWORDS[type.kind][dialect];
    // SQLite uses storage-class affinity: a length/precision is ignored, and a
    // parenthesised affinity like `TEXT(255)` is not accepted by the parser on
    // round-trip (Save re-parses the generated DDL). Emit the bare keyword.
    if (dialect === 'sqlite') return base;
    if (type.kind === 'varchar' || type.kind === 'char') {
        return type.length === undefined ? base : `${base}(${type.length})`;
    }
    if (type.kind === 'numeric') {
        if (type.precision === undefined) return base;
        const scale = type.scale === undefined ? '' : `, ${type.scale}`;
        return `${base}(${type.precision}${scale})`;
    }
    return base;
}

// Resolve a relation endpoint to concrete table + column names, or undefined if
// the relation dangles (references a deleted table/column) — such a relation is
// skipped rather than emitting broken SQL. Table qualification is shared via
// `qualifiedTableName` (see schema-helpers) so every emitter agrees.
function endpointNames(
    schema: Schema,
    tableId: string,
    columnId: string,
    dialect: Dialect,
): { readonly table: string; readonly qualifiedTable: string; readonly column: string } | undefined {
    const table = findTable(schema, tableId);
    const column = columnById(schema, columnId);
    if (!table || !column) return undefined;
    return { table: table.name, qualifiedTable: qualifiedTableName(table, dialect), column: column.name };
}

// A single CREATE TABLE statement (no trailing semicolon — added by generateDdl).
export function generateCreateTable(table: Table, schema: Schema, dialect: Dialect): string {
    const db = compileOnlyDb(dialect);

    // A COMPOSITE primary key (>1 column flagged) must become ONE table-level
    // `PRIMARY KEY (a, b)` constraint — emitting inline `.primaryKey()` on each
    // column would produce multiple PRIMARY KEY clauses, which every engine rejects.
    // A single-column PK stays inline (simpler DDL, identical meaning).
    const pkColumns = table.columns.filter((column) => column.primaryKey);
    const compositePk = pkColumns.length > 1;

    // Columns. `sql.raw` injects our own dialect type string; the callback chains
    // the modifiers. defaultValue is emitted as a raw SQL expression, so the user
    // supplies their own literal quoting (e.g. `'active'`, `0`, `CURRENT_TIMESTAMP`).
    const withColumns = table.columns.reduce<CreateTableBuilder<string, string>>(
        (builder, column) =>
            builder.addColumn(column.name, sql.raw(columnSqlType(column.type, dialect)), (col) => {
                let def = col;
                if (!column.nullable) def = def.notNull();
                if (column.primaryKey && !compositePk) def = def.primaryKey();
                if (column.unique) def = def.unique();
                if (column.defaultValue !== undefined) def = def.defaultTo(sql.raw(column.defaultValue));
                return def;
            }),
        db.schema.createTable(qualifiedTableName(table, dialect)).ifNotExists(),
    );

    const withPrimaryKey = compositePk
        ? withColumns.addPrimaryKeyConstraint(
            `pk_${table.name}`,
            pkColumns.map((column) => column.name),
        )
        : withColumns;

    // FK constraints from relations whose SOURCE (child, FK-holding) side is this table.
    // Referential actions are added via kysely's builder (its action enum is exactly
    // our ReferentialAction), emitting the lower-case `on delete cascade`; we then
    // upper-case just the action token — keywords stay kysely-lower-case, matching
    // this generator's convention of upper-casing only injected values (type keywords).
    const withForeignKeys = schema.relations
    // The FK lives on the child/many side, which for a 1:N link is the TARGET, not
    // the source — see fkChild. Emit the constraint on the table that OWNS the FK.
        .filter((relation) => fkChild(relation).tableId === table.id)
        .reduce<CreateTableBuilder<string, string>>((builder, relation) => {
            const child = endpointNames(schema, fkChild(relation).tableId, fkChild(relation).columnId, dialect);
            const parent = endpointNames(schema, fkParent(relation).tableId, fkParent(relation).columnId, dialect);
            if (!child || !parent) return builder;
            return builder.addForeignKeyConstraint(
                // Include the parent table so a column with FKs to two different parents
                // gets two DISTINCT constraint names (a bare fk_<table>_<column> would
                // collide and the DB would reject the duplicate constraint name).
                `fk_${child.table}_${child.column}_${parent.table}`,
                [child.column],
                parent.qualifiedTable,
                [parent.column],
                (fk) => {
                    // Skip an action this dialect doesn't support (e.g. SET DEFAULT on MySQL),
                    // so the emitted SQL stays runnable.
                    const supported = DIALECT_REFERENTIAL_ACTIONS[dialect];
                    const withDelete =
            relation.onDelete && supported.includes(relation.onDelete)
                ? fk.onDelete(relation.onDelete)
                : fk;
                    return relation.onUpdate && supported.includes(relation.onUpdate)
                        ? withDelete.onUpdate(relation.onUpdate)
                        : withDelete;
                },
            );
        }, withPrimaryKey);

    return upperReferentialActions(withForeignKeys.compile().sql);
}

// Upper-case the referential-action keyword in a compiled FK clause, leaving the
// `on delete` / `on update` prefix as kysely emits it (lower-case). Scoped to the
// exact action vocabulary so nothing else in the SQL is touched.
const REFERENTIAL_ACTION = /(\bon (?:delete|update) )(no action|restrict|cascade|set null|set default)/gi;

function upperReferentialActions(sql: string): string {
    return sql.replace(REFERENTIAL_ACTION, (_match, prefix: string, action: string) => `${prefix}${action.toUpperCase()}`);
}

// A single CREATE INDEX statement. Column ids resolve within the owning table.
function generateCreateIndex(
    db: ReturnType<typeof compileOnlyDb>,
    table: Table,
    index: Index,
    dialect: Dialect,
): string | undefined {
    const columns = index.columnIds
        .map((id) => table.columns.find((column) => column.id === id)?.name)
        .filter((name): name is string => name !== undefined);
    if (columns.length === 0) return undefined;
    const base = index.unique ? db.schema.createIndex(index.name).unique() : db.schema.createIndex(index.name);
    return base.on(qualifiedTableName(table, dialect)).columns(columns).compile().sql;
}

// Order tables so every FK-referenced (parent) table is created before the table
// that references it. Postgres (the in-app pglite engine) and MySQL reject a
// REFERENCES to a table that doesn't exist yet, and the seed order is not
// guaranteed parent-first once the user draws links in any order. DFS post-order:
// a table is emitted only after its referenced tables; a cycle (self/circular FK)
// falls back to input order for the tables it touches.
function sortTablesByFkDependency(schema: Schema): readonly Table[] {
    const byId = new Map(schema.tables.map((table) => [table.id, table]));
    const referencedBy = new Map<string, Set<string>>();
    for (const table of schema.tables) referencedBy.set(table.id, new Set());
    for (const relation of schema.relations) {
        const child = fkChild(relation).tableId;
        const parent = fkParent(relation).tableId;
        const deps = referencedBy.get(child);
        if (deps && child !== parent && byId.has(parent)) deps.add(parent);
    }

    const sorted: Table[] = [];
    const done = new Set<string>();
    const onStack = new Set<string>();
    function visit(id: string): void {
        if (done.has(id) || onStack.has(id)) return; // onStack guard breaks cycles
        onStack.add(id);
        const deps = referencedBy.get(id);
        if (deps) for (const parent of deps) visit(parent);
        onStack.delete(id);
        done.add(id);
        const table = byId.get(id);
        if (table) sorted.push(table);
    }
    for (const table of schema.tables) visit(table.id);
    return sorted;
}

// A SQL single-quoted string literal (doubling embedded quotes). Used for COMMENT.
function sqlStringLiteral(value: string): string {
    return `'${value.replace(/'/g, '\'\'')}'`;
}

// Quote an identifier for the target dialect (mysql uses backticks, others "").
// The COMMENT statements are built by hand (kysely has no COMMENT ON builder), so
// they must quote identifiers themselves rather than relying on the builder.
function quoteIdent(name: string, dialect: Dialect): string {
    const q = dialect === 'mysql' ? '`' : '"';
    return `${q}${name.split(q).join(q + q)}${q}`;
}

function quotedTableName(table: Table, dialect: Dialect): string {
    return dialect !== 'sqlite' && table.schema
        ? `${quoteIdent(table.schema, dialect)}.${quoteIdent(table.name, dialect)}`
        : quoteIdent(table.name, dialect);
}

// A table's comment as a runnable statement, dialect-appropriate:
//   postgres → COMMENT ON TABLE <t> IS '...'
//   mysql    → ALTER TABLE <t> COMMENT = '...'
//   sqlite   → a `-- ` line comment (SQLite has no table-comment syntax), so the
//              text still shows in the panel/export and is harmless when run.
// Undefined when the table has no comment.
function tableCommentStatement(table: Table, dialect: Dialect): string | undefined {
    const comment = table.comment?.trim();
    if (!comment) return undefined;
    if (dialect === 'sqlite') {
    // Collapse newlines so the whole comment stays on the single `--` line.
        return `-- ${qualifiedTableName(table, dialect)}: ${comment.replace(/\s*\n\s*/g, ' ')}`;
    }
    const name = quotedTableName(table, dialect);
    if (dialect === 'mysql') {
        return `ALTER TABLE ${name} COMMENT = ${sqlStringLiteral(comment)};`;
    }
    return `COMMENT ON TABLE ${name} IS ${sqlStringLiteral(comment)};`;
}

// Full DDL script: every CREATE TABLE first (FK-dependency ordered so referenced
// tables exist), then every CREATE INDEX, then table COMMENTs. Each statement
// terminated with a semicolon (COMMENT/ALTER carry their own).
export function generateDdl(schema: Schema, dialect: Dialect): string {
    const db = compileOnlyDb(dialect);
    const statements: string[] = [];

    // CREATE SCHEMA for each distinct namespace first, so the qualified CREATE TABLEs
    // below have somewhere to live (Postgres rejects a table in a missing schema; the
    // in-browser pglite runner needs it too). SQLite has no schemas, so names are never
    // qualified there (see qualifiedTableName) and no CREATE SCHEMA is emitted.
    if (dialect !== 'sqlite') {
        const schemas = [...new Set(schema.tables.map((table) => table.schema).filter((name): name is string => !!name))];
        for (const name of schemas) {
            statements.push(`${db.schema.createSchema(name).ifNotExists().compile().sql};`);
        }
    }

    for (const table of sortTablesByFkDependency(schema)) {
        statements.push(`${generateCreateTable(table, schema, dialect)};`);
    }
    for (const table of schema.tables) {
        for (const index of table.indexes) {
            const sqlText = generateCreateIndex(db, table, index, dialect);
            if (sqlText !== undefined) statements.push(`${sqlText};`);
        }
    }

    // Table comments last (after every table exists), so COMMENT ON / ALTER succeed.
    for (const table of schema.tables) {
        const comment = tableCommentStatement(table, dialect);
        if (comment !== undefined) statements.push(comment);
    }

    return statements.join('\n\n');
}
