// SQL IMPORT: SQL DDL text -> domain Schema.
//
// Parses CREATE TABLE / CREATE INDEX with node-sql-parser and rebuilds our
// canonical Schema (tables, columns, relations, indexes). Pure and
// joint-independent. Never throws on a parse error: it returns a readable
// message in `errors` and salvages whatever parsed. The low-level "how to read
// the parser AST" layer lives in sql-ast.ts; this file is the orchestration.
//
// PER-DIALECT PARSER: we import node-sql-parser's per-dialect build entries
// (build/postgresql | mysql | sqlite) rather than the mega `index`, which bundles
// ~15 dialects. Importing only the three we support is the intended bundle win.
//
// CJS/ESM INTEROP: these build entries are UMD/CJS. The named `import { Parser }`
// works under vite/esbuild's cjs-named-export interop (verified against the
// package's own .d.ts, which declares `export class Parser`). If a future
// bundler drops that interop, switch to `import Pg from '…'; new Pg.Parser()`.
//
// FK CARDINALITY HEURISTIC: a foreign key points from the child (referencing)
// row to exactly one parent (referenced PK) row, so the child is the `source`
// and the default is `N:1`. When the FK column is itself UNIQUE or PRIMARY KEY,
// at most one child maps to each parent, so we emit `1:1` instead.

import { Parser as PostgresParser } from 'node-sql-parser/build/postgresql';
import { Parser as MysqlParser } from 'node-sql-parser/build/mysql';
import { Parser as SqliteParser } from 'node-sql-parser/build/sqlite';
import { newId } from './id';
import { isRecord } from './sql-type-import';
import {
    columnNames,
    firstTableName,
    firstTableSchema,
    freezeColumn,
    identifierName,
    isNotNull,
    parseReference,
    readColumnType,
    readDefault,
    replaceBracketIdentifiers,
    resolveLocalColumns,
    splitSqlStatements,
} from './sql-ast';
import type { DraftColumn, DraftTable, PendingFk } from './sql-ast';
import { applyAlter, resolveCreateIndex, resolveRelations } from './resolve-relations';
import type { Dialect, Schema } from './types';

// Result of an import: the salvaged schema plus any non-fatal messages. `dataSql`
// carries the file's INSERT statements (normalized, `;`-joined) so a dump that ships
// data — like Chinook — can seed the in-browser query-runner DB, not just the diagram.
export interface ImportResult {
  readonly schema: Schema;
  readonly errors: readonly string[];
  readonly dataSql: string;
}

type ParserCtor = { new (): { astify(sql: string, opt?: { database?: string }): unknown } };

const PARSERS: Readonly<Record<Dialect, ParserCtor>> = {
    postgres: PostgresParser,
    mysql: MysqlParser,
    sqlite: SqliteParser,
};
const DATABASE_OPTION: Readonly<Record<Dialect, string>> = {
    postgres: 'postgresql',
    mysql: 'mysql',
    sqlite: 'sqlite',
};

// Normalise spellings node-sql-parser rejects outright — each fails the whole
// statement and the table is silently lost. All show up in real dumps:
//   • T-SQL `[bracket]` identifiers (Chinook, SQL Server exports) → "double quotes"
//     (quote-aware; brackets inside string data stay intact),
//   • kysely/Drizzle SQLite `TEXT(255)` (the parser only allows a length on VARCHAR),
//   • Firebird/InterBase `BLOB SUB_TYPE TEXT` (the "…but 'S' found" error),
//   • `NVARCHAR` (SQL-Server-flavoured dumps like Chinook; sqlite's grammar knows
//     VARCHAR only — same storage class, so the rewrite is lossless for us).
function normalizeSql(sql: string): string {
    return replaceBracketIdentifiers(sql)
        .replace(/\bTEXT\s*\(\s*\d+\s*\)/gi, 'TEXT')
        .replace(/\bBLOB\s+SUB_TYPE\s+TEXT\b/gi, 'TEXT')
        .replace(/\bNVARCHAR\b/gi, 'VARCHAR');
}

// Parse SQL DDL and build a Schema. Collects errors instead of throwing.
export function importSql(sql: string, dialect: Dialect): ImportResult {
    const errors: string[] = [];
    const parser = new PARSERS[dialect]();
    const options = { database: DATABASE_OPTION[dialect] };

    // Use the SHARED app-wide id source (not an isolated seed-0 factory): the seed
    // schema uses hand-written ids, so a fresh factory's `tbl_1`/`col_1`/`rel_1` would
    // collide with the ids the toolbar/add-column/link factories mint from the same
    // seed-0 `newId` — producing duplicate cell ids (and silent data loss) the moment
    // the user draws anything after importing. One monotonic counter avoids that.
    const nextId = newId;
    const tables = new Map<string, DraftTable>();
    const fks: PendingFk[] = [];
    const indexStatements: Record<string, unknown>[] = [];
    const alterStatements: Record<string, unknown>[] = [];
    // Raw (normalized) INSERT statements, kept verbatim so the query runner can seed
    // the in-browser DB with the dump's data — parsed only to CLASSIFY, never rebuilt.
    const dataStatements: string[] = [];

    // Parse PER STATEMENT, not the whole file at once: a real dump (e.g. pg_dump) always
    // contains a few statements node-sql-parser can't parse (custom operator classes,
    // extensions, SET, functions). Whole-file astify throws on the first one and loses
    // EVERYTHING; per-statement astify skips only the unparseable ones and salvages the
    // rest — honouring the "never throw, collect errors, salvage what parsed" contract.
    let skipped = 0;
    for (const raw of splitSqlStatements(normalizeSql(sql))) {
        let ast: unknown;
        try {
            ast = parser.astify(raw, options);
        } catch {
            skipped += 1;
            continue;
        }
        for (const statement of Array.isArray(ast) ? ast : [ast]) {
            if (!isRecord(statement)) continue;
            if (statement.type === 'create' && statement.keyword === 'table') buildTable(statement, tables, fks, nextId, errors);
            else if (statement.type === 'create' && statement.keyword === 'index') indexStatements.push(statement);
            else if (statement.type === 'alter') alterStatements.push(statement);
            else if (statement.type === 'insert') {
                dataStatements.push(raw);
                break; // one raw statement = at most one insert; don't double-push
            }
        }
    }
    if (skipped > 0) {
        errors.push(`Skipped ${skipped} statement${skipped === 1 ? '' : 's'} that could not be parsed (unsupported syntax).`);
    }

    // ALTER TABLE ADD CONSTRAINT (PK/UNIQUE/FK) after every table exists, before
    // resolveRelations (its 1:1-vs-N:1 heuristic reads column.primaryKey).
    for (const statement of alterStatements) applyAlter(statement, tables, fks);

    const relations = resolveRelations(fks, tables, nextId, errors);
    for (const statement of indexStatements) resolveCreateIndex(statement, tables, nextId, errors);

    const schema: Schema = {
        tables: [...tables.values()].map((draft) => ({
            id: draft.id,
            name: draft.name,
            ...(draft.schema ? { schema: draft.schema } : {}),
            columns: draft.columns.map(freezeColumn),
            indexes: draft.indexes,
        })),
        relations,
        groups: [],
    };
    return { schema, errors, dataSql: dataStatements.map((statement) => `${statement};`).join('\n') };
}

// --- CREATE TABLE -----------------------------------------------------------

function buildTable(
    statement: Record<string, unknown>,
    tables: Map<string, DraftTable>,
    fks: PendingFk[],
    nextId: (prefix: string) => string,
    errors: string[],
): void {
    const name = firstTableName(statement.table);
    if (name === undefined) {
        errors.push('Skipped a CREATE TABLE with no resolvable table name.');
        return;
    }
    const tableSchema = firstTableSchema(statement.table);
    const draft: DraftTable = {
        id: nextId('tbl'),
        name,
        ...(tableSchema ? { schema: tableSchema } : {}),
        columns: [],
        indexes: [],
        byName: new Map(),
    };

    const definitions = Array.isArray(statement.create_definitions) ? statement.create_definitions : [];
    const pkNames = new Set<string>();
    const uniqueNames = new Set<string>();

    for (const def of definitions) {
        if (!isRecord(def)) continue;
        if (def.resource === 'column') addColumn(def, draft, name, fks, nextId, pkNames, uniqueNames);
        else if (def.resource === 'constraint') collectConstraint(def, name, fks, pkNames, uniqueNames);
        else if (def.resource === 'index') addInlineIndex(def, draft, nextId);
    }

    // Second pass: apply table-level PK/UNIQUE to the columns they name.
    for (const column of draft.columns) {
        if (pkNames.has(column.name)) {
            column.primaryKey = true;
            column.nullable = false; // a PRIMARY KEY column is implicitly NOT NULL
        }
        if (uniqueNames.has(column.name)) column.unique = true;
    }

    tables.set(name, draft);
}

function addColumn(
    def: Record<string, unknown>,
    draft: DraftTable,
    tableName: string,
    fks: PendingFk[],
    nextId: (prefix: string) => string,
    pkNames: Set<string>,
    uniqueNames: Set<string>,
): void {
    const name = identifierName(def.column);
    if (name === undefined) return;

    const columnPrimary = def.primary_key === 'primary key' || typeof def.primary === 'string';
    const columnUnique = typeof def.unique === 'string';
    if (columnPrimary) pkNames.add(name);
    if (columnUnique) uniqueNames.add(name);

    const column: DraftColumn = {
        id: nextId('col'),
        name,
        type: readColumnType(def.definition),
        nullable: !columnPrimary && !isNotNull(def.nullable),
        primaryKey: columnPrimary,
        unique: columnUnique,
        defaultValue: readDefault(def.default_val),
    };
    draft.columns.push(column);
    draft.byName.set(name, column);

    // Inline `REFERENCES parent(col)` -> a single-column pending FK.
    const inlineFk = parseReference(def.reference_definition);
    if (inlineFk) {
        fks.push({
            childTable: tableName,
            localColumns: [name],
            refTable: inlineFk.table,
            refColumns: inlineFk.columns,
            onDelete: inlineFk.onDelete,
            onUpdate: inlineFk.onUpdate,
        });
    }
}

function collectConstraint(
    def: Record<string, unknown>,
    tableName: string,
    fks: PendingFk[],
    pkNames: Set<string>,
    uniqueNames: Set<string>,
): void {
    // node-sql-parser passes the keyword through with the CASE the user wrote (and
    // kysely-generated DDL is lower-case, e.g. `foreign key`), so normalise before
    // matching — otherwise a lower-case `foreign key` / `primary key` constraint is
    // silently dropped (this is exactly how a generated-DDL round trip lost its FKs).
    const kind = typeof def.constraint_type === 'string' ? def.constraint_type.toLowerCase() : '';
    const cols = columnNames(def.definition);
    if (kind === 'primary key') {
        for (const col of cols) pkNames.add(col);
    } else if (kind === 'unique key' || kind === 'unique' || kind === 'unique index') {
        for (const col of cols) uniqueNames.add(col);
    } else if (kind === 'foreign key') {
        const ref = parseReference(def.reference_definition);
        if (ref) {
            fks.push({
                childTable: tableName,
                localColumns: cols,
                refTable: ref.table,
                refColumns: ref.columns,
                onDelete: ref.onDelete,
                onUpdate: ref.onUpdate,
            });
        }
    }
    // `check` and any other constraint kinds are intentionally ignored.
}

// Inline table-level KEY/INDEX definitions inside CREATE TABLE.
function addInlineIndex(def: Record<string, unknown>, draft: DraftTable, nextId: (prefix: string) => string): void {
    const columnIds = resolveLocalColumns(columnNames(def.definition), draft);
    if (columnIds.length === 0) return;
    const name = typeof def.index === 'string' ? def.index : `idx_${draft.name}`;
    draft.indexes.push({ id: nextId('idx'), name, columnIds, unique: false });
}

// Relation + CREATE INDEX resolution lives in ./resolve-relations (kept out of this
// file for size).
