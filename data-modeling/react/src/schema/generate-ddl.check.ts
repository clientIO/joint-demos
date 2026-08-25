// Runnable self-check for the SQL generators. Import and call
// `runGenerateChecks()` — it asserts the generated DDL/queries for a tiny
// 2-table schema across all three dialects. No side effects on import.

import assert from 'node:assert';
import { formatSql } from './format-sql';
import { generateDdl } from './generate-ddl';
import { generateSampleQueries } from './generate-query';
import type { Dialect, Schema } from './types';

// users(id PK, email unique) <- posts(author_id FK -> users.id), + email index.
const SCHEMA: Schema = {
    tables: [
        {
            id: 't-users',
            name: 'users',
            columns: [
                { id: 'c-users-id', name: 'id', type: { kind: 'integer' }, nullable: false, primaryKey: true, unique: false },
                { id: 'c-users-email', name: 'email', type: { kind: 'varchar', length: 255 }, nullable: false, primaryKey: false, unique: true },
            ],
            indexes: [{ id: 'i-users-email', name: 'idx_users_email', columnIds: ['c-users-email'], unique: true }],
        },
        {
            id: 't-posts',
            name: 'posts',
            columns: [
                { id: 'c-posts-id', name: 'id', type: { kind: 'integer' }, nullable: false, primaryKey: true, unique: false },
                { id: 'c-posts-author', name: 'author_id', type: { kind: 'integer' }, nullable: false, primaryKey: false, unique: false },
            ],
            indexes: [],
        },
    ],
    relations: [
        {
            id: 'r-1',
            source: { tableId: 't-posts', columnId: 'c-posts-author' },
            target: { tableId: 't-users', columnId: 'c-users-id' },
            cardinality: 'N:1',
            onDelete: 'cascade',
            onUpdate: 'set null',
        },
    ],
    groups: [],
};

// Lowercased substring assertion (kysely lowercases keywords; our raw type
// keywords keep their case, so we check those separately, case-sensitively).
function assertContains(haystack: string, needle: string): void {
    assert.ok(haystack.toLowerCase().includes(needle.toLowerCase()), `expected SQL to contain "${needle}":\n${haystack}`);
}

export function runGenerateChecks(): void {
    // Per-dialect DDL: structure + the exact dialect type keyword for `integer`.
    const typeKeyword: Readonly<Record<Dialect, string>> = { sqlite: 'INTEGER', postgres: 'integer', mysql: 'INT' };
    const dialects: readonly Dialect[] = ['sqlite', 'postgres', 'mysql'];
    for (const dialect of dialects) {
        const ddl = generateDdl(SCHEMA, dialect);
        assertContains(ddl, 'create table');
        assertContains(ddl, 'users');
        assertContains(ddl, 'posts');
        assertContains(ddl, 'primary key');
        assertContains(ddl, 'foreign key');
        // Referential actions: clause present (case-insensitive) with the ACTION
        // token upper-cased (case-sensitive), keywords left kysely-lower-case.
        assertContains(ddl, 'on delete');
        assertContains(ddl, 'on update');
        assert.ok(ddl.includes('CASCADE'), `expected ${dialect} DDL to upper-case ON DELETE action:\n${ddl}`);
        assert.ok(ddl.includes('SET NULL'), `expected ${dialect} DDL to upper-case ON UPDATE action:\n${ddl}`);
        // Index emitted. The fixture's index is UNIQUE, so kysely renders
        // `create unique index …` — assert the shape, not a contiguous "create index".
        assert.ok(/create (unique )?index/.test(ddl), `expected ${dialect} DDL to contain a CREATE INDEX:\n${ddl}`);
        assert.ok(ddl.includes(typeKeyword[dialect]), `expected ${dialect} DDL to contain type "${typeKeyword[dialect]}"`);
        // varchar length is preserved for dialects that keep it (postgres/mysql).
        if (dialect !== 'sqlite') assertContains(ddl, '(255)');
        // Formatting must not throw and must preserve the table name.
        assertContains(formatSql(ddl, dialect), 'users');
    }

    // FK-dependency ordering: even when the child table (posts) is listed BEFORE its
    // parent (users), the parent's CREATE TABLE must come first — Postgres/MySQL
    // reject a REFERENCES to a not-yet-created table.
    const childFirst: Schema = { ...SCHEMA, tables: [...SCHEMA.tables].reverse() };
    const orderedDdl = generateDdl(childFirst, 'postgres');
    const firstCreate = orderedDdl.toLowerCase().indexOf('create table');
    const secondCreate = orderedDdl.toLowerCase().indexOf('create table', firstCreate + 1);
    const firstStatement = orderedDdl.slice(firstCreate, secondCreate);
    assert.ok(
        firstStatement.includes('users') && !firstStatement.toLowerCase().includes('posts'),
        `expected parent table (users) created before child (posts):\n${orderedDdl}`,
    );

    // Schema/namespace: a schema-qualified table emits `"schema"."name"`, and its FK
    // REFERENCES point at the qualified target table (Postgres double-quotes both).
    const qualified = generateDdl({ ...SCHEMA, tables: SCHEMA.tables.map((table) => ({ ...table, schema: 'app' })) }, 'postgres');
    assert.ok(qualified.includes('"app"."users"'), `expected schema-qualified CREATE TABLE:\n${qualified}`);
    assert.ok(qualified.includes('references "app".'), `expected schema-qualified FK REFERENCES:\n${qualified}`);

    // Sample queries: one SELECT per table (2) plus one JOIN.
    const queries = generateSampleQueries(SCHEMA, 'postgres');
    assert.strictEqual(queries.length, 3, 'expected 2 table scans + 1 join');
    assertContains(queries[0].sql, 'select');
    assert.ok(queries.some((q) => q.sql.toLowerCase().includes('inner join')), 'expected a JOIN query');

    // COMPOSITE primary key (a join table): two PK columns must emit ONE table-level
    // `PRIMARY KEY (a, b)` clause, never two inline `... primary key` (which every
    // engine rejects). Regression guard for the multi-primary-key bug.
    const compositePk: Schema = {
        tables: [
            {
                id: 't-m',
                name: 'memberships',
                columns: [
                    { id: 'c-u', name: 'user_id', type: { kind: 'integer' }, nullable: false, primaryKey: true, unique: false },
                    { id: 'c-o', name: 'org_id', type: { kind: 'integer' }, nullable: false, primaryKey: true, unique: false },
                ],
                indexes: [],
            },
        ],
        relations: [],
        groups: [],
    };
    for (const dialect of dialects) {
        const ddl = generateDdl(compositePk, dialect).toLowerCase();
        const inlinePkCount = (ddl.match(/\bprimary key\b/g) ?? []).length;
        assert.strictEqual(inlinePkCount, 1, `composite PK must emit exactly one PRIMARY KEY clause (${dialect}):\n${ddl}`);
        // Identifier quoting differs by dialect ("" for pg/sqlite, `` for mysql).
        assert.ok(
            /primary key\s*\(\s*["`]?user_id["`]?\s*,\s*["`]?org_id["`]?\s*\)/.test(ddl),
            `composite PK must be table-level PRIMARY KEY (user_id, org_id) (${dialect}):\n${ddl}`,
        );
    }

    // Table comments must be emitted (shown in the panel + exported), dialect-correct.
    const commented: Schema = {
        tables: [
            {
                id: 't-c',
                name: 'orders',
                comment: 'A customer\'s orders. It\'s a join.',
                columns: [{ id: 'c', name: 'id', type: { kind: 'integer' }, nullable: false, primaryKey: true, unique: false }],
                indexes: [],
            },
        ],
        relations: [],
        groups: [],
    };
    const pgComment = generateDdl(commented, 'postgres');
    assert.ok(pgComment.includes('COMMENT ON TABLE "orders" IS \'A customer\'\'s orders. It\'\'s a join.\''), `postgres COMMENT ON with quoted name + escaped quotes:\n${pgComment}`);
    const myComment = generateDdl(commented, 'mysql');
    assert.ok(myComment.includes('ALTER TABLE `orders` COMMENT = \'A customer\'\'s orders'), `mysql ALTER TABLE COMMENT:\n${myComment}`);
    const liteComment = generateDdl(commented, 'sqlite');
    assert.ok(liteComment.includes('-- orders: A customer\'s orders'), `sqlite -- comment line:\n${liteComment}`);
}
