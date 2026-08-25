// AST-navigation layer for the SQL importer: the guard-based readers that pull
// names, types and defaults out of node-sql-parser's output, plus the mutable
// draft accumulators the walker fills before freezing into the domain model.
//
// WHY treat the parser output as `unknown` and hand-narrow it: node-sql-parser's
// published .d.ts drifts from its real AST (e.g. column PK arrives as
// `primary_key`, not `primary`; a column name is sometimes a bare string,
// sometimes `{ expr: { value } }`). Navigating the declared union types would
// force `as` casts. Reading everything as `unknown` with typeof/`in` guards keeps
// the whole importer free of `any` and type assertions.

import { isRecord, mapSqlType, renderDefaultValue } from './sql-type-import';
import type { Column, Index, ReferentialAction } from './types';
import type { ColumnType } from './sql-types';

// Mutable per-column accumulator. Column-level flags land on the first walk pass;
// table-level PRIMARY KEY / UNIQUE constraints patch them on the second.
export interface DraftColumn {
  id: string;
  name: string;
  type: ColumnType;
  nullable: boolean;
  primaryKey: boolean;
  unique: boolean;
  defaultValue?: string;
}

// Mutable per-table accumulator. `byName` indexes columns for FK/index resolution.
export interface DraftTable {
  id: string;
  name: string;
  schema?: string;
  columns: DraftColumn[];
  indexes: Index[];
  byName: Map<string, DraftColumn>;
}

// A foreign key awaiting resolution. Column arrays zip positionally so a
// composite key emits one Relation per column pair.
// Built once per FK and only read (unlike the Draft* accumulators above, which the
// walker mutates in place), so every field is readonly.
export interface PendingFk {
  readonly childTable: string;
  readonly localColumns: readonly string[];
  readonly refTable: string;
  readonly refColumns: readonly string[];
  readonly onDelete?: ReferentialAction;
  readonly onUpdate?: ReferentialAction;
}

// Rewrite T-SQL / SQL-Server-style [bracket] identifiers to standard "double-quote"
// identifiers, so dumps like Chinook (`CREATE TABLE [Album] ([AlbumId] INTEGER …)`)
// parse — node-sql-parser rejects brackets outright, which failed EVERY statement in
// such a file. Quote/comment-aware: brackets inside 'string literals' (real data like
// a track named "Rock [Live]"), "quoted identifiers", and comments pass through
// untouched. ponytail: T-SQL's `]]` escape inside an identifier is not handled —
// no real-world schema dump we target uses it.
export function replaceBracketIdentifiers(sql: string): string {
    if (!sql.includes('[')) return sql;
    let out = '';
    let i = 0;
    const n = sql.length;
    while (i < n) {
        const ch = sql[i];
        const next = sql[i + 1];
        if (ch === '-' && next === '-') {
            const nl = sql.indexOf('\n', i);
            const stop = nl === -1 ? n : nl;
            out += sql.slice(i, stop);
            i = stop;
        } else if (ch === '/' && next === '*') {
            const close = sql.indexOf('*/', i + 2);
            const stop = close === -1 ? n : close + 2;
            out += sql.slice(i, stop);
            i = stop;
        } else if (ch === '\'' || ch === '"') {
            // Quoted string / identifier, with doubled-quote escaping ('' or "").
            let j = i + 1;
            while (j < n) {
                if (sql[j] === ch) {
                    if (sql[j + 1] === ch) { j += 2; continue; }
                    j += 1;
                    break;
                }
                j += 1;
            }
            out += sql.slice(i, j);
            i = j;
        } else if (ch === '[') {
            out += '"';
            i += 1;
        } else if (ch === ']') {
            out += '"';
            i += 1;
        } else {
            out += ch;
            i += 1;
        }
    }
    return out;
}

// Split a SQL script into individual statements on TOP-LEVEL semicolons, skipping
// semicolons inside single-quote strings, double-quote identifiers, dollar-quoted
// bodies ($tag$…$tag$), line comments (-- …) and block comments (/* … */). This lets
// the importer astify each statement in its own try/catch and SALVAGE the schema when
// a few statements use syntax node-sql-parser can't parse (real dumps always have
// some) — instead of the whole import failing on one bad statement. Returns trimmed,
// non-empty statements without the trailing `;`.
export function splitSqlStatements(sql: string): string[] {
    const statements: string[] = [];
    let current = '';
    let i = 0;
    const n = sql.length;
    while (i < n) {
        const ch = sql[i];
        const next = sql[i + 1];
        if (ch === '-' && next === '-') {
            const nl = sql.indexOf('\n', i);
            const stop = nl === -1 ? n : nl;
            current += sql.slice(i, stop);
            i = stop;
        } else if (ch === '/' && next === '*') {
            const close = sql.indexOf('*/', i + 2);
            const stop = close === -1 ? n : close + 2;
            current += sql.slice(i, stop);
            i = stop;
        } else if (ch === '\'' || ch === '"') {
            // Quoted string / identifier, with doubled-quote escaping ('' or "").
            let j = i + 1;
            while (j < n) {
                if (sql[j] === ch) {
                    if (sql[j + 1] === ch) { j += 2; continue; }
                    j += 1;
                    break;
                }
                j += 1;
            }
            current += sql.slice(i, j);
            i = j;
        } else if (ch === '$') {
            // Dollar-quoted body: $tag$ … $tag$ (Postgres function bodies etc).
            const tag = /^\$[A-Za-z0-9_]*\$/.exec(sql.slice(i))?.[0];
            if (tag) {
                const close = sql.indexOf(tag, i + tag.length);
                const stop = close === -1 ? n : close + tag.length;
                current += sql.slice(i, stop);
                i = stop;
            } else {
                current += ch;
                i += 1;
            }
        } else if (ch === ';') {
            const trimmed = current.trim();
            if (trimmed) statements.push(trimmed);
            current = '';
            i += 1;
        } else {
            current += ch;
            i += 1;
        }
    }
    const tail = current.trim();
    if (tail) statements.push(tail);
    return statements;
}

// Map a column definition's `definition` node to a canonical ColumnType.
export function readColumnType(definition: unknown): ColumnType {
    if (!isRecord(definition) || typeof definition.dataType !== 'string') return { kind: 'raw', sql: 'UNKNOWN' };
    const length = typeof definition.length === 'number' ? definition.length : undefined;
    const scale = typeof definition.scale === 'number' ? definition.scale : undefined;
    return mapSqlType(definition.dataType, length, scale);
}

// Render a column's DEFAULT to a SQL literal string, or undefined when absent.
export function readDefault(defaultVal: unknown): string | undefined {
    return isRecord(defaultVal) ? renderDefaultValue(defaultVal.value) : undefined;
}

// True when a column's `nullable` node marks it NOT NULL.
export function isNotNull(nullable: unknown): boolean {
    return isRecord(nullable) && nullable.type === 'not null';
}

// A column identifier across the parser's shapes: a bare string (`{ column: 'x' }`,
// mysql), a nested ref (`{ column: { expr: { value: 'x' } } }`, postgres), or — for
// SQLite index columns — the name directly on `{ value: 'x' }` with no `column`
// wrapper. Handling all three keeps CREATE INDEX importing on every dialect.
export function identifierName(ref: unknown): string | undefined {
    if (!isRecord(ref)) return undefined;
    const col = ref.column;
    if (typeof col === 'string') return col;
    if (isRecord(col)) {
        if (typeof col.value === 'string') return col.value;
        if (isRecord(col.expr) && typeof col.expr.value === 'string') return col.expr.value;
    }
    // SQLite index-column shape: `{ type: 'double_quote_string', value: 'email' }`.
    if (typeof ref.value === 'string') return ref.value;
    return undefined;
}

// Column names from a ColumnRef[] (constraint / index `definition` arrays).
export function columnNames(definition: unknown): string[] {
    if (!Array.isArray(definition)) return [];
    const names: string[] = [];
    for (const item of definition) {
        const name = identifierName(item);
        if (name !== undefined) names.push(name);
    }
    return names;
}

// A CREATE-TABLE `table` is `[{ table }]`; a CREATE-INDEX `table` is `{ table }`.
export function firstTableName(table: unknown): string | undefined {
    const first = Array.isArray(table) ? table[0] : table;
    return isRecord(first) && typeof first.table === 'string' ? first.table : undefined;
}

// The schema/namespace qualifier of a table ref, e.g. `public` from `public.users`.
// node-sql-parser puts it in `db`; undefined for an unqualified table.
export function firstTableSchema(table: unknown): string | undefined {
    const first = Array.isArray(table) ? table[0] : table;
    return isRecord(first) && typeof first.db === 'string' && first.db !== '' ? first.db : undefined;
}

// Narrow an untrusted parser string to a ReferentialAction (or undefined). The
// tuple's element type IS ReferentialAction, so `.includes` acts as a type guard —
// no cast needed.
const REFERENTIAL_ACTIONS: readonly ReferentialAction[] = [
    'cascade',
    'set null',
    'restrict',
    'no action',
    'set default',
];

function toReferentialAction(value: unknown): ReferentialAction | undefined {
    if (typeof value !== 'string') return undefined;
    const action = value.toLowerCase();
    return REFERENTIAL_ACTIONS.find((candidate) => candidate === action);
}

// Read a `reference_definition`'s `on_action` array into its ON DELETE / ON
// UPDATE actions. node-sql-parser shapes each entry as
// `{ type: 'on delete' | 'on update', value: { value: 'set null' } }`. Unknown
// actions are dropped so a stray keyword can't produce an invalid Relation.
export function parseReferentialActions(onAction: unknown): {
  onDelete?: ReferentialAction;
  onUpdate?: ReferentialAction;
} {
    if (!Array.isArray(onAction)) return {};
    const actions: { onDelete?: ReferentialAction; onUpdate?: ReferentialAction } = {};
    for (const entry of onAction) {
        if (!isRecord(entry) || typeof entry.type !== 'string') continue;
        const action = toReferentialAction(isRecord(entry.value) ? entry.value.value : undefined);
        if (action === undefined) continue;
        if (entry.type === 'on delete') actions.onDelete = action;
        else if (entry.type === 'on update') actions.onUpdate = action;
    }
    return actions;
}

// Parse a `reference_definition` node into its referenced table, columns, and
// (optional) ON DELETE / ON UPDATE referential actions.
export function parseReference(
    ref: unknown,
): { table: string; columns: string[]; onDelete?: ReferentialAction; onUpdate?: ReferentialAction } | undefined {
    if (!isRecord(ref)) return undefined;
    const table = firstTableName(ref.table);
    if (table === undefined) return undefined;
    return { table, columns: columnNames(ref.definition), ...parseReferentialActions(ref.on_action) };
}

// Resolve column names to ids within one table, dropping any that don't exist.
export function resolveLocalColumns(names: readonly string[], table: DraftTable): string[] {
    const ids: string[] = [];
    for (const name of names) {
        const col = table.byName.get(name);
        if (col) ids.push(col.id);
    }
    return ids;
}

// Exact table-name match first, then case-insensitive (unquoted SQL folds case,
// and dialects disagree on fold direction — a lenient importer accepts both).
export function lookupTable(tables: Map<string, DraftTable>, name: string): DraftTable | undefined {
    const exact = tables.get(name);
    if (exact) return exact;
    const lower = name.toLowerCase();
    for (const [key, table] of tables) {
        if (key.toLowerCase() === lower) return table;
    }
    return undefined;
}

// Freeze a mutable draft column into the immutable domain Column.
export function freezeColumn(draft: DraftColumn): Column {
    return {
        id: draft.id,
        name: draft.name,
        type: draft.type,
        nullable: draft.nullable,
        primaryKey: draft.primaryKey,
        unique: draft.unique,
        defaultValue: draft.defaultValue,
    };
}
