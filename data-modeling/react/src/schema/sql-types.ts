// Column-type model: a canonical, dialect-neutral set of types the UI offers,
// plus a per-dialect keyword table the DDL generator consumes.
//
// WHY a canonical set instead of raw SQL strings: the editor needs a finite,
// pickable list that renders the same in every dialect, and the generator needs
// a single source to translate from. Imported types outside the canonical set
// survive losslessly via the `raw` escape hatch.

import type { Dialect } from './types';

// Parameter-free scalar kinds (no length/precision/scale).
export type SimpleKind =
  | 'integer'
  | 'bigint'
  | 'smallint'
  | 'boolean'
  | 'text'
  | 'real'
  | 'double'
  | 'date'
  | 'time'
  | 'timestamp'
  | 'uuid'
  | 'json'
  | 'blob';

// Every canonical kind (parameter-free + parameterised). Excludes `raw`.
export type CanonicalKind = SimpleKind | 'varchar' | 'char' | 'numeric';

// Discriminated union on `kind`. Only the parameterised variants carry
// length/precision/scale, so an `integer` can never accidentally hold a length.
export type ColumnType =
  | { readonly kind: SimpleKind }
  | { readonly kind: 'varchar' | 'char'; readonly length?: number }
  | { readonly kind: 'numeric'; readonly precision?: number; readonly scale?: number }
  // Escape hatch for imported SQL types outside the canonical set.
  | { readonly kind: 'raw'; readonly sql: string };

// One base SQL keyword per dialect. Length/precision are appended by the
// generator (e.g. `varchar` + length 255 -> `varchar(255)`), not stored here.
export type DialectKeywords = Readonly<Record<Dialect, string>>;

// Canonical -> per-dialect base keyword. Mappings follow SQLite storage-class
// affinities (INTEGER/TEXT/REAL/BLOB/NUMERIC) and each dialect's native names.
export const SQL_TYPE_KEYWORDS: Readonly<Record<CanonicalKind, DialectKeywords>> = {
    integer: { sqlite: 'INTEGER', postgres: 'integer', mysql: 'INT' },
    bigint: { sqlite: 'INTEGER', postgres: 'bigint', mysql: 'BIGINT' },
    smallint: { sqlite: 'INTEGER', postgres: 'smallint', mysql: 'SMALLINT' },
    // No native boolean in SQLite/MySQL: SQLite stores 0/1 as INTEGER, MySQL uses TINYINT(1).
    boolean: { sqlite: 'INTEGER', postgres: 'boolean', mysql: 'TINYINT(1)' },
    text: { sqlite: 'TEXT', postgres: 'text', mysql: 'TEXT' },
    varchar: { sqlite: 'TEXT', postgres: 'varchar', mysql: 'VARCHAR' },
    char: { sqlite: 'TEXT', postgres: 'char', mysql: 'CHAR' },
    numeric: { sqlite: 'NUMERIC', postgres: 'numeric', mysql: 'DECIMAL' },
    real: { sqlite: 'REAL', postgres: 'real', mysql: 'FLOAT' },
    double: { sqlite: 'REAL', postgres: 'double precision', mysql: 'DOUBLE' },
    date: { sqlite: 'TEXT', postgres: 'date', mysql: 'DATE' },
    time: { sqlite: 'TEXT', postgres: 'time', mysql: 'TIME' },
    timestamp: { sqlite: 'TEXT', postgres: 'timestamp', mysql: 'TIMESTAMP' },
    // No native uuid in SQLite/MySQL: stored as fixed-width text.
    uuid: { sqlite: 'TEXT', postgres: 'uuid', mysql: 'CHAR(36)' },
    // Postgres jsonb is the indexed, canonical JSON storage; SQLite has no JSON type.
    json: { sqlite: 'TEXT', postgres: 'jsonb', mysql: 'JSON' },
    blob: { sqlite: 'BLOB', postgres: 'bytea', mysql: 'BLOB' },
};

// Ordered list of canonical kinds for populating the type picker.
export const CANONICAL_KINDS: readonly CanonicalKind[] = [
    'integer',
    'bigint',
    'smallint',
    'boolean',
    'text',
    'varchar',
    'char',
    'numeric',
    'real',
    'double',
    'date',
    'time',
    'timestamp',
    'uuid',
    'json',
    'blob',
];

// Which canonical kinds each dialect OFFERS in the column-type picker. The types
// on offer differ per engine:
//   • Postgres has a distinct native type for every canonical kind.
//   • MySQL has no native UUID type (an imported one degrades to CHAR(36)).
//   • SQLite is affinity-typed: it lists its five storage classes plus the common
//     semantic types that map cleanly onto them. bigint/smallint (→INTEGER),
//     varchar/char (→TEXT), double (→REAL) and uuid/json (→TEXT) collapse to the
//     same affinity, so they're omitted to keep the SQLite list honest.
export const DIALECT_KINDS: Readonly<Record<Dialect, readonly CanonicalKind[]>> = {
    sqlite: ['integer', 'real', 'numeric', 'text', 'blob', 'boolean', 'date', 'time', 'timestamp'],
    postgres: CANONICAL_KINDS,
    mysql: [
        'integer',
        'bigint',
        'smallint',
        'boolean',
        'text',
        'varchar',
        'char',
        'numeric',
        'real',
        'double',
        'date',
        'time',
        'timestamp',
        'json',
        'blob',
    ],
};
