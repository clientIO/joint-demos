// Unit tests for DDL generation and the import<->export ROUND TRIP: generate SQL
// from a schema, parse it back, and assert the structure survives. This is the
// end-to-end proof that the two SQL halves agree.

import { describe, expect, it } from 'vitest';
import { generateDdl } from './generate-ddl';
import { importSql } from './import-sql';
import type { Dialect, Schema } from './types';

// A schema exercising PK, NOT NULL, UNIQUE, an N:1 FK with ON DELETE, an index,
// and a table comment.
const SCHEMA: Schema = {
    tables: [
        {
            id: 't-users',
            name: 'users',
            comment: 'Application users.',
            columns: [
                { id: 'c-u-id', name: 'id', type: { kind: 'integer' }, nullable: false, primaryKey: true, unique: false },
                { id: 'c-u-email', name: 'email', type: { kind: 'varchar', length: 255 }, nullable: false, primaryKey: false, unique: true },
            ],
            indexes: [{ id: 'i-u-email', name: 'idx_users_email', columnIds: ['c-u-email'], unique: true }],
        },
        {
            id: 't-posts',
            name: 'posts',
            columns: [
                { id: 'c-p-id', name: 'id', type: { kind: 'integer' }, nullable: false, primaryKey: true, unique: false },
                { id: 'c-p-author', name: 'author_id', type: { kind: 'integer' }, nullable: false, primaryKey: false, unique: false },
            ],
            indexes: [],
        },
    ],
    relations: [
        {
            id: 'r-1',
            source: { tableId: 't-posts', columnId: 'c-p-author' },
            target: { tableId: 't-users', columnId: 'c-u-id' },
            cardinality: 'N:1',
            onDelete: 'cascade',
        },
    ],
    groups: [],
};

describe('generateDdl', () => {
    it.each<Dialect>(['postgres', 'mysql', 'sqlite'])('emits the core shape under %s', (dialect) => {
        const ddl = generateDdl(SCHEMA, dialect).toLowerCase();
        expect(ddl).toContain('create table');
        expect(ddl).toContain('primary key');
        expect(ddl).toContain('foreign key');
        expect(ddl).toContain('on delete cascade');
        expect(ddl).toMatch(/create (unique )?index/);
    });

    it('orders parent tables before children (FK dependency)', () => {
    // posts references users; even listed posts-first, users must be created first.
        const childFirst: Schema = { ...SCHEMA, tables: [...SCHEMA.tables].reverse() };
        const ddl = generateDdl(childFirst, 'postgres').toLowerCase();
        expect(ddl.indexOf('"users"')).toBeLessThan(ddl.indexOf('"posts"'));
    });

    it('emits the table comment', () => {
        expect(generateDdl(SCHEMA, 'postgres')).toContain('COMMENT ON TABLE "users" IS \'Application users.\'');
    });
});

describe('round trip across ALL dialects: schema -> generateDdl -> importSql', () => {
    // Generate DDL for each engine, parse it back with the SAME engine, and assert the
    // structure survives. sqlite drops column lengths (storage-class affinity) so we
    // don't assert varchar length there; everything else must round-trip on all three.
    it.each<Dialect>(['postgres', 'mysql', 'sqlite'])('round-trips structure + FK under %s', (dialect) => {
        const ddl = generateDdl(SCHEMA, dialect);
        const { schema, errors } = importSql(ddl, dialect);
        expect(errors, `import errors on ${dialect} DDL:\n${ddl}`).toEqual([]);

        // Tables + columns.
        expect(schema.tables.map((t) => t.name).sort()).toEqual(['posts', 'users']);
        const users = schema.tables.find((t) => t.name === 'users')!;
        expect(users.columns.find((c) => c.name === 'id')!.primaryKey).toBe(true);
        expect(users.columns.find((c) => c.name === 'email')!.unique).toBe(true);

        // The FK survives with cardinality + direction on every engine.
        expect(schema.relations, `relations lost on ${dialect}`).toHaveLength(1);
        const rel = schema.relations[0];
        expect(rel.cardinality).toBe('N:1');
        const posts = schema.tables.find((t) => t.name === 'posts')!;
        expect(rel.source.tableId).toBe(posts.id);
        expect(rel.target.tableId).toBe(users.id);

        // The unique index survives.
        expect(users.indexes.map((i) => i.name)).toContain('idx_users_email');
    });

    it('preserves tables, columns, flags, types and relations (postgres)', () => {
        const ddl = generateDdl(SCHEMA, 'postgres');
        const { schema, errors } = importSql(ddl, 'postgres');
        expect(errors).toEqual([]);

        // Tables + columns survive by name.
        expect(schema.tables.map((t) => t.name).sort()).toEqual(['posts', 'users']);
        const users = schema.tables.find((t) => t.name === 'users')!;
        const id = users.columns.find((c) => c.name === 'id')!;
        const email = users.columns.find((c) => c.name === 'email')!;
        expect(id.primaryKey).toBe(true);
        expect(id.nullable).toBe(false);
        expect(email.unique).toBe(true);
        expect(email.type.kind).toBe('varchar');

        // The FK survives with cardinality + referential action + correct direction.
        expect(schema.relations).toHaveLength(1);
        const rel = schema.relations[0];
        expect(rel.cardinality).toBe('N:1');
        expect(rel.onDelete).toBe('cascade');
        const posts = schema.tables.find((t) => t.name === 'posts')!;
        expect(rel.source.tableId).toBe(posts.id); // child holds the FK
        expect(rel.target.tableId).toBe(users.id);

        // The unique index survives.
        expect(users.indexes.map((i) => i.name)).toContain('idx_users_email');
    });

    it('round-trips a composite primary key as one PRIMARY KEY clause (postgres)', () => {
        const composite: Schema = {
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
        const ddl = generateDdl(composite, 'postgres');
        // Exactly one PRIMARY KEY clause (multiple inline PKs would be invalid SQL).
        expect((ddl.toLowerCase().match(/primary key/g) ?? [])).toHaveLength(1);
        const { schema } = importSql(ddl, 'postgres');
        const pk = schema.tables[0].columns.filter((c) => c.primaryKey).map((c) => c.name).sort();
        expect(pk).toEqual(['org_id', 'user_id']);
    });
});
