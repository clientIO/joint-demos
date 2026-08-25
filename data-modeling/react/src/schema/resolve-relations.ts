// The RESOLUTION phase of the SQL importer, split out of import-sql.ts to keep it
// under the size cap: turn collected foreign keys into domain Relations, and apply
// standalone CREATE INDEX statements to the tables they name. Both run after every
// CREATE TABLE has been walked, so all referenced tables/columns already exist.

import { columnNames, firstTableName, identifierName, lookupTable, parseReference, resolveLocalColumns } from './sql-ast';
import type { DraftTable, PendingFk } from './sql-ast';
import { isRecord } from './sql-type-import';
import type { Relation } from './types';

// Apply an `ALTER TABLE … ADD CONSTRAINT` to an already-built table. Many dumps
// (pg_dump especially) declare PRIMARY KEY / UNIQUE / FOREIGN KEY as separate ALTER
// statements rather than inline, so without this every imported table would be
// key-less and relation-less. PK/UNIQUE patch the draft columns in place; a FK is
// pushed as a PendingFk to resolve with the inline ones. Runs AFTER all tables are
// built and BEFORE resolveRelations (whose 1:1-vs-N:1 heuristic reads primaryKey).
export function applyAlter(
    statement: Record<string, unknown>,
    tables: Map<string, DraftTable>,
    fks: PendingFk[],
): void {
    const tableName = firstTableName(statement.table);
    if (tableName === undefined) return;
    const draft = lookupTable(tables, tableName);
    if (!draft) return; // ALTER on something we didn't import (a view, a skipped table) — ignore
    const exprs = Array.isArray(statement.expr) ? statement.expr : [statement.expr];
    for (const expr of exprs) {
        if (!isRecord(expr) || expr.action !== 'add') continue;
        const constraint = isRecord(expr.create_definitions) ? expr.create_definitions : expr;
        // node-sql-parser is inconsistent about keyword case ('primary key' vs 'FOREIGN
        // KEY'), so normalise before matching.
        const kind = typeof constraint.constraint_type === 'string' ? constraint.constraint_type.toLowerCase() : '';
        const cols = columnNames(constraint.definition);
        if (kind === 'primary key') {
            for (const name of cols) {
                const col = draft.byName.get(name);
                if (col) {
                    col.primaryKey = true;
                    col.nullable = false;
                }
            }
        } else if (kind === 'unique' || kind === 'unique key' || kind === 'unique index') {
            for (const name of cols) {
                const col = draft.byName.get(name);
                if (col) col.unique = true;
            }
        } else if (kind === 'foreign key') {
            const ref = parseReference(constraint.reference_definition);
            if (ref) {
                fks.push({
                    childTable: draft.name,
                    localColumns: cols,
                    refTable: ref.table,
                    refColumns: ref.columns,
                    onDelete: ref.onDelete,
                    onUpdate: ref.onUpdate,
                });
            }
        }
    }
}

// FK CARDINALITY HEURISTIC: a foreign key points from the child (referencing) row
// to exactly one parent (referenced PK) row, so the child is the `source` and the
// default is `N:1`. When the FK column is itself UNIQUE or PRIMARY KEY, at most one
// child maps to each parent, so we emit `1:1` instead.
export function resolveRelations(
    fks: readonly PendingFk[],
    tables: Map<string, DraftTable>,
    nextId: (prefix: string) => string,
    errors: string[],
): Relation[] {
    const relations: Relation[] = [];
    for (const fk of fks) {
        const child = lookupTable(tables, fk.childTable);
        const parent = lookupTable(tables, fk.refTable);
        if (!parent) {
            errors.push(`Foreign key on "${fk.childTable}" references unknown table "${fk.refTable}".`);
            continue;
        }
        if (!child) continue; // unreachable — child was just built — but keeps types honest

        const pairs = Math.min(fk.localColumns.length, fk.refColumns.length);
        for (let i = 0; i < pairs; i += 1) {
            const local = child.byName.get(fk.localColumns[i]);
            const remote = parent.byName.get(fk.refColumns[i]);
            if (!local || !remote) {
                errors.push(
                    `Foreign key "${fk.childTable}.${fk.localColumns[i]}" -> "${fk.refTable}.${fk.refColumns[i]}" ` +
            'references an unknown column.',
                );
                continue;
            }
            relations.push({
                id: nextId('rel'),
                source: { tableId: child.id, columnId: local.id },
                target: { tableId: parent.id, columnId: remote.id },
                cardinality: local.unique || local.primaryKey ? '1:1' : 'N:1',
                ...(fk.onDelete ? { onDelete: fk.onDelete } : {}),
                ...(fk.onUpdate ? { onUpdate: fk.onUpdate } : {}),
            });
        }
    }
    return relations;
}

export function resolveCreateIndex(
    statement: Record<string, unknown>,
    tables: Map<string, DraftTable>,
    nextId: (prefix: string) => string,
    errors: string[],
): void {
    const tableName = firstTableName(statement.table);
    if (tableName === undefined) return;
    const table = lookupTable(tables, tableName);
    if (!table) {
        errors.push(`CREATE INDEX targets unknown table "${tableName}".`);
        return;
    }
    const cols = Array.isArray(statement.index_columns) ? statement.index_columns : [];
    const names: string[] = [];
    for (const col of cols) {
        const name = identifierName(col);
        if (name !== undefined) names.push(name);
    }
    const columnIds = resolveLocalColumns(names, table);
    if (columnIds.length === 0) {
        errors.push(`CREATE INDEX on "${tableName}" names no known columns.`);
        return;
    }
    // The index name is a bare string on postgres/mysql but `{ name }` on sqlite.
    const indexName =
    typeof statement.index === 'string'
        ? statement.index
        : isRecord(statement.index) && typeof statement.index.name === 'string'
            ? statement.index.name
            : `idx_${tableName}`;
    table.indexes.push({ id: nextId('idx'), name: indexName, columnIds, unique: statement.index_type === 'unique' });
}
