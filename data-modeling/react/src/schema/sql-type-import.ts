// SQL keyword -> canonical ColumnType mapping for the SQL importer.
//
// WHY a hand-rolled reverse map instead of inverting SQL_TYPE_KEYWORDS: the
// forward table is canonical -> one keyword per dialect, but real DDL uses many
// aliases per canonical kind (INT/INTEGER/INT4, DECIMAL/NUMERIC, JSON/JSONB,
// SERIAL, …). Inverting the forward table would only recognise the exact
// keyword the generator emits and miss every hand-written alias. Anything we do
// not recognise survives losslessly via the `{ kind: 'raw', sql }` escape hatch.

import type { ColumnType, SimpleKind } from './sql-types';

// Narrow an unknown value to an indexable record. Shared by the importer so
// AST navigation stays type-safe (no `any`, no `as`) — the parser's declared
// types drift from its real output, so we treat its result as `unknown`.
export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

// Parameter-free SQL keyword -> SimpleKind. Keys are lower-cased before lookup.
// SERIAL family maps to its underlying integer width (auto-increment is a column
// behaviour we do not model, so only the storage kind carries over).
const SIMPLE_MAP: Readonly<Record<string, SimpleKind>> = {
    int: 'integer',
    integer: 'integer',
    int4: 'integer',
    serial: 'integer',
    serial4: 'integer',
    bigint: 'bigint',
    int8: 'bigint',
    bigserial: 'bigint',
    serial8: 'bigint',
    smallint: 'smallint',
    int2: 'smallint',
    tinyint: 'smallint',
    smallserial: 'smallint',
    serial2: 'smallint',
    boolean: 'boolean',
    bool: 'boolean',
    text: 'text',
    clob: 'text',
    tinytext: 'text',
    mediumtext: 'text',
    longtext: 'text',
    real: 'real',
    float4: 'real',
    float: 'real',
    double: 'double',
    'double precision': 'double',
    float8: 'double',
    date: 'date',
    time: 'time',
    timestamp: 'timestamp',
    timestamptz: 'timestamp',
    datetime: 'timestamp',
    uuid: 'uuid',
    json: 'json',
    jsonb: 'json',
    blob: 'blob',
    bytea: 'blob',
    binary: 'blob',
    varbinary: 'blob',
    longblob: 'blob',
};

// Parameterised keyword sets (length / precision+scale carried through).
const VARCHAR_KEYS: ReadonlySet<string> = new Set([
    'varchar',
    'varchar2',
    'character varying',
    'nvarchar',
]);
const CHAR_KEYS: ReadonlySet<string> = new Set(['char', 'character', 'bpchar', 'nchar']);
const NUMERIC_KEYS: ReadonlySet<string> = new Set(['numeric', 'decimal', 'dec', 'number']);

// Rebuild a readable SQL string for an unmapped type so `raw` round-trips
// (e.g. ENUM -> "ENUM", VARBIT(8) -> "VARBIT(8)", DECIMAL-like(10,2)).
function rawSql(dataType: string, length: number | undefined, scale: number | undefined): string {
    if (length === undefined) return dataType;
    if (scale === undefined) return `${dataType}(${length})`;
    return `${dataType}(${length}, ${scale})`;
}

// Map a parsed SQL type keyword (+ optional length/scale) to a canonical
// ColumnType, falling back to `raw` for anything outside the canonical set.
export function mapSqlType(
    dataType: string,
    length: number | undefined,
    scale: number | undefined,
): ColumnType {
    const key = dataType.trim().toLowerCase();

    const simple = SIMPLE_MAP[key];
    if (simple) return { kind: simple };

    if (VARCHAR_KEYS.has(key)) {
        return length === undefined ? { kind: 'varchar' } : { kind: 'varchar', length };
    }
    if (CHAR_KEYS.has(key)) {
        return length === undefined ? { kind: 'char' } : { kind: 'char', length };
    }
    if (NUMERIC_KEYS.has(key)) {
        if (length === undefined) return { kind: 'numeric' };
        return scale === undefined
            ? { kind: 'numeric', precision: length }
            : { kind: 'numeric', precision: length, scale };
    }

    return { kind: 'raw', sql: rawSql(dataType, length, scale) };
}

// Render a parsed DEFAULT value node back to a SQL literal string, or undefined
// when there is no default / the node shape is unrecognised. The parser wraps
// the literal as `{ type, value }`; string literals re-gain their quotes,
// function defaults (CURRENT_TIMESTAMP) render as their name.
export function renderDefaultValue(node: unknown): string | undefined {
    if (!isRecord(node)) return undefined;
    const { type, value } = node;
    if (type === 'null') return 'NULL';
    if ((type === 'number' || type === 'bigint') && (typeof value === 'number' || typeof value === 'string')) {
        return String(value);
    }
    if ((type === 'bool' || type === 'boolean') && typeof value === 'boolean') {
        return value ? 'TRUE' : 'FALSE';
    }
    if (typeof type === 'string' && type.endsWith('string') && typeof value === 'string') {
    // Escape embedded quotes so the rendered literal stays valid SQL.
        return `'${value.replace(/'/g, '\'\'')}'`;
    }
    if (type === 'function') return functionDefaultName(node);
    if (type === 'origin' && typeof value === 'string') return value;
    return undefined;
}

// Extract a function-default's name, e.g. { name: { name: [{ value: 'now' }] } }.
function functionDefaultName(node: Record<string, unknown>): string | undefined {
    const name = isRecord(node.name) ? node.name.name : undefined;
    if (!Array.isArray(name)) return undefined;
    const parts: string[] = [];
    for (const part of name) {
        if (isRecord(part) && typeof part.value === 'string') parts.push(part.value);
    }
    return parts.length > 0 ? parts.join('.') : undefined;
}
