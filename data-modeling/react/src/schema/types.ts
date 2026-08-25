// Pure schema domain model — the shared contract every other module imports.
// No @joint imports, no SQL-library imports: just types + (in sibling files)
// tiny pure helpers.
//
// KEY DECISION — foreign keys are Relations, not column fields.
// A foreign key is modelled EXCLUSIVELY as a `Relation`, never as a flag or
// reference stored on a `Column`. This makes the relation graph the single source
// of truth: the DDL generator derives every FK constraint from `Schema.relations`,
// the canvas renders each FK as a relationship link, and `isForeignKey` (in
// schema-helpers) reads a column's FK status back out of the relations. Storing FK
// data on both a column and a relation would let the two drift — so it lives in one
// place.

import type { ColumnType } from './sql-types';

// Target SQL dialect. Drives type-keyword translation (see sql-types).
export type Dialect = 'sqlite' | 'postgres' | 'mysql';

// Relation multiplicity, from the source (referencing) side to the target.
export type Cardinality = '1:1' | '1:N' | 'N:1';

// Referential action for a foreign key's ON DELETE / ON UPDATE clause. Values
// are the lower-case SQL keywords; the DDL generator upper-cases them on emit.
export type ReferentialAction = 'cascade' | 'set null' | 'restrict' | 'no action' | 'set default';

// Which referential actions each dialect actually supports. SQLite and Postgres
// implement all five; MySQL/InnoDB parses but does NOT honour SET DEFAULT, so it's
// omitted there (the picker hides it and the DDL generator won't emit it).
export const DIALECT_REFERENTIAL_ACTIONS: Readonly<Record<Dialect, readonly ReferentialAction[]>> = {
    sqlite: ['no action', 'restrict', 'cascade', 'set null', 'set default'],
    postgres: ['no action', 'restrict', 'cascade', 'set null', 'set default'],
    mysql: ['no action', 'restrict', 'cascade', 'set null'],
};

// A single column. Note: no foreign-key field — see the KEY DECISION above.
export interface Column {
  readonly id: string;
  readonly name: string;
  readonly type: ColumnType;
  readonly nullable: boolean;
  readonly primaryKey: boolean;
  readonly unique: boolean;
  readonly defaultValue?: string;
  readonly comment?: string;
}

// A table index over one or more columns (by column id).
export interface Index {
  readonly id: string;
  readonly name: string;
  readonly columnIds: readonly string[];
  readonly unique: boolean;
}

// A table. `groupId` optionally places it inside a visual/logical Group.
// `schema` is the SQL namespace (e.g. `public`, `sales`); unset -> the table is
// unqualified. Emitted as `CREATE TABLE "schema"."name"` and round-trips through
// import of schema-qualified DDL.
export interface Table {
  readonly id: string;
  readonly name: string;
  readonly schema?: string;
  readonly comment?: string;
  readonly columns: readonly Column[];
  readonly indexes: readonly Index[];
  readonly groupId?: string;
}

// One endpoint of a relation: a specific column of a specific table.
export interface RelationEndpoint {
  readonly tableId: string;
  readonly columnId: string;
}

// A foreign-key relationship. `source` is the referencing (child) side that
// holds the FK; `target` is the referenced (parent) side. Single source of
// truth for a foreign key — generated DDL derives FK constraints from these.
export interface Relation {
  readonly id: string;
  readonly source: RelationEndpoint;
  readonly target: RelationEndpoint;
  readonly cardinality: Cardinality;
  // Optional referential actions on the FK constraint. Unset -> the DDL omits
  // the clause (the database applies its default, usually NO ACTION).
  readonly onDelete?: ReferentialAction;
  readonly onUpdate?: ReferentialAction;
}

// A visual/logical grouping of tables. `collapsed` toggles rendering. (Presentation
// tint/badge live on the cell via SwatchKey, not here — the model stays SQL-only.)
export interface Group {
  readonly id: string;
  readonly name: string;
  readonly collapsed: boolean;
}

// The whole model: tables, the relations between them, and their groups.
export interface Schema {
  readonly tables: readonly Table[];
  readonly relations: readonly Relation[];
  readonly groups: readonly Group[];
}
