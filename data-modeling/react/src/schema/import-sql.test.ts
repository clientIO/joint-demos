// Unit tests for the SQL importer (node-sql-parser AST -> domain Schema). These run
// under vitest, which bundles node-sql-parser's per-dialect CJS builds the same way
// the app does — so what passes here is what the browser parses.

import { describe, expect, it } from 'vitest';
import { importSql } from './import-sql';
import { detectDialect } from './detect-dialect';
import { splitSqlStatements } from './sql-ast';
import { isForeignKey } from './schema-helpers';
import type { Dialect } from './types';

const DIALECTS: readonly Dialect[] = ['postgres', 'mysql', 'sqlite'];

// Import one table and return it (fails the test if it didn't parse).
function importOneTable(sql: string, dialect: Dialect, name: string) {
    const { schema, errors } = importSql(sql, dialect);
    expect(errors, `unexpected import errors: ${errors.join('; ')}`).toEqual([]);
    const table = schema.tables.find((t) => t.name === name);
    expect(table, `table ${name} should have imported`).toBeDefined();
    return { schema, table: table! };
}

describe('importSql — columns', () => {
    it('parses a column-level PRIMARY KEY as primaryKey + NOT NULL', () => {
        const { table } = importOneTable('CREATE TABLE t (id integer PRIMARY KEY);', 'postgres', 't');
        const id = table.columns.find((c) => c.name === 'id')!;
        expect(id.primaryKey).toBe(true);
        expect(id.nullable).toBe(false);
        expect(id.type.kind).toBe('integer');
    });

    it('parses NOT NULL, UNIQUE and DEFAULT', () => {
        const { table } = importOneTable(
            'CREATE TABLE t (email varchar(255) NOT NULL UNIQUE, status text DEFAULT \'active\');',
            'postgres',
            't',
        );
        const email = table.columns.find((c) => c.name === 'email')!;
        expect(email.nullable).toBe(false);
        expect(email.unique).toBe(true);
        const status = table.columns.find((c) => c.name === 'status')!;
        expect(status.defaultValue).toBe('\'active\'');
    });

    it('keeps varchar length', () => {
        const { table } = importOneTable('CREATE TABLE t (name varchar(120));', 'postgres', 't');
        const name = table.columns.find((c) => c.name === 'name')!;
        expect(name.type.kind).toBe('varchar');
        expect(name.type.kind === 'varchar' && name.type.length).toBe(120);
    });
});

describe('importSql — normalizes non-portable type spellings', () => {
    // Both of these make node-sql-parser reject the WHOLE `CREATE TABLE`, so without
    // the normalization the table is silently dropped (the exact failures the SQL
    // sample files hit). The importOneTable helper asserts zero errors + table present,
    // so these tests fail hard if the normalization regresses.
    it('strips a length off TEXT (kysely/Drizzle SQLite dumps emit TEXT(255))', () => {
        const { table } = importOneTable(
            'CREATE TABLE t (id integer PRIMARY KEY, body TEXT(255) NOT NULL);',
            'sqlite',
            't',
        );
        expect(table.columns.find((c) => c.name === 'body')!.type.kind).toBe('text');
    });

    it('rewrites Firebird BLOB SUB_TYPE TEXT to TEXT', () => {
        const { table } = importOneTable(
            'CREATE TABLE film (id integer PRIMARY KEY, description BLOB SUB_TYPE TEXT);',
            'sqlite',
            'film',
        );
        expect(table.columns.find((c) => c.name === 'description')!.type.kind).toBe('text');
    });

    it('does not touch a real VARCHAR length', () => {
        const { table } = importOneTable('CREATE TABLE t (name varchar(120));', 'postgres', 't');
        expect(table.columns.find((c) => c.name === 'name')!.type.kind).toBe('varchar');
    });

    // Chinook-style SQL-Server-flavoured dump: [bracket] identifiers + NVARCHAR — the
    // sqlite grammar rejects both outright (verified: astify throws on '['), so without
    // normalization EVERY statement in such a file is skipped and the import walls off.
    it('imports [bracket] identifiers + NVARCHAR (Chinook style) with an FK', () => {
        const sql =
      'CREATE TABLE [Artist] ([ArtistId] INTEGER NOT NULL, [Name] NVARCHAR(120), CONSTRAINT [PK_Artist] PRIMARY KEY ([ArtistId]));' +
      'CREATE TABLE [Album] ([AlbumId] INTEGER NOT NULL, [Title] NVARCHAR(160) NOT NULL, [ArtistId] INTEGER NOT NULL, ' +
      'CONSTRAINT [PK_Album] PRIMARY KEY ([AlbumId]), FOREIGN KEY ([ArtistId]) REFERENCES [Artist] ([ArtistId]) ON DELETE NO ACTION ON UPDATE NO ACTION);';
        const { schema, errors } = importSql(sql, 'sqlite');
        expect(errors).toEqual([]);
        expect(schema.tables.map((t) => t.name).sort()).toEqual(['Album', 'Artist']);
        expect(schema.relations).toHaveLength(1);
        const title = schema.tables.find((t) => t.name === 'Album')!.columns.find((c) => c.name === 'Title')!;
        expect(title.type.kind).toBe('varchar');
    });

    it('collects INSERT statements as dataSql, brackets inside string data intact', () => {
        const sql =
      'CREATE TABLE [Track] ([TrackId] INTEGER NOT NULL, [Name] NVARCHAR(200));' +
      'INSERT INTO [Track] ([TrackId], [Name]) VALUES (1, \'Rock In Rio [Live]\');';
        const { schema, errors, dataSql } = importSql(sql, 'sqlite');
        expect(errors).toEqual([]); // the INSERT is data, never "skipped"
        expect(schema.tables).toHaveLength(1);
        expect(dataSql).toContain('INSERT INTO "Track"');
        // The bracket rewrite is quote-aware: [Live] inside the string literal survives.
        expect(dataSql).toContain('\'Rock In Rio [Live]\'');
    });
});

describe('importSql — relations (foreign keys)', () => {
    const sql =
    'CREATE TABLE users (id integer PRIMARY KEY);' +
    'CREATE TABLE posts (id integer PRIMARY KEY, author_id integer NOT NULL REFERENCES users(id));';

    it('inline REFERENCES yields one N:1 relation, child = source', () => {
        const { schema } = importSql(sql, 'postgres');
        expect(schema.relations).toHaveLength(1);
        const [rel] = schema.relations;
        expect(rel.cardinality).toBe('N:1');
        const posts = schema.tables.find((t) => t.name === 'posts')!;
        const users = schema.tables.find((t) => t.name === 'users')!;
        expect(rel.source.tableId).toBe(posts.id); // FK-holding child is the source
        expect(rel.target.tableId).toBe(users.id);
        const author = posts.columns.find((c) => c.name === 'author_id')!;
        expect(isForeignKey(author.id, schema.relations)).toBe(true);
    });

    it('a UNIQUE FK column collapses to 1:1', () => {
        const { schema } = importSql(
            'CREATE TABLE a (id integer PRIMARY KEY);CREATE TABLE b (a_id integer UNIQUE REFERENCES a(id));',
            'postgres',
        );
        expect(schema.relations).toHaveLength(1);
        expect(schema.relations[0].cardinality).toBe('1:1');
    });

    it('table-level CONSTRAINT FOREIGN KEY resolves the same way', () => {
        const { schema } = importSql(
            'CREATE TABLE a (id integer PRIMARY KEY);' +
        'CREATE TABLE b (a_id integer, CONSTRAINT fk FOREIGN KEY (a_id) REFERENCES a(id));',
            'postgres',
        );
        expect(schema.relations).toHaveLength(1);
        expect(schema.relations[0].cardinality).toBe('N:1');
    });

    it('preserves ON DELETE / ON UPDATE referential actions (inline)', () => {
        const { schema } = importSql(
            'CREATE TABLE a (id integer PRIMARY KEY);' +
        'CREATE TABLE b (a_id integer REFERENCES a(id) ON DELETE SET NULL ON UPDATE CASCADE);',
            'postgres',
        );
        expect(schema.relations[0].onDelete).toBe('set null');
        expect(schema.relations[0].onUpdate).toBe('cascade');
    });

    it('preserves ON DELETE on a table-level constraint, leaves ON UPDATE unset', () => {
        const { schema } = importSql(
            'CREATE TABLE a (id integer PRIMARY KEY);' +
        'CREATE TABLE b (a_id integer, CONSTRAINT fk FOREIGN KEY (a_id) REFERENCES a(id) ON DELETE CASCADE);',
            'postgres',
        );
        expect(schema.relations[0].onDelete).toBe('cascade');
        expect(schema.relations[0].onUpdate).toBeUndefined();
    });

    it('reports an error for an FK to an unknown table but salvages the rest', () => {
        const { schema, errors } = importSql(
            'CREATE TABLE b (a_id integer REFERENCES ghost(id));',
            'postgres',
        );
        expect(errors.length).toBeGreaterThan(0);
        expect(schema.tables).toHaveLength(1); // table b still imported
        expect(schema.relations).toHaveLength(0);
    });
});

describe('importSql — composite keys', () => {
    it('flags BOTH columns of a composite PRIMARY KEY (join table)', () => {
        const { table } = importOneTable(
            'CREATE TABLE memberships (user_id uuid, org_id uuid, PRIMARY KEY (user_id, org_id));',
            'postgres',
            'memberships',
        );
        const pk = table.columns.filter((c) => c.primaryKey).map((c) => c.name);
        expect(pk.sort()).toEqual(['org_id', 'user_id']);
    });
});

describe('importSql — indexes & schema qualifier', () => {
    it('applies a standalone CREATE INDEX to the named table', () => {
        const { table } = importOneTable(
            'CREATE TABLE t (id integer PRIMARY KEY, email text);CREATE INDEX idx_t_email ON t (email);',
            'postgres',
            't',
        );
        expect(table.indexes).toHaveLength(1);
        expect(table.indexes[0].name).toBe('idx_t_email');
        const emailCol = table.columns.find((c) => c.name === 'email')!;
        expect(table.indexes[0].columnIds).toContain(emailCol.id);
    });

    it('keeps the schema/namespace qualifier of a qualified table', () => {
        const { table } = importOneTable('CREATE TABLE app.users (id integer PRIMARY KEY);', 'postgres', 'users');
        expect(table.schema).toBe('app');
    });
});

describe('importSql — resilience', () => {
    it('never throws on garbage input; returns an error and an empty schema', () => {
        const { schema, errors } = importSql('this is not sql;;;', 'postgres');
        expect(errors.length).toBeGreaterThan(0);
        expect(schema.tables).toEqual([]);
    });

    it('mints unique ids across every table/column/relation in one import', () => {
        const { schema } = importSql(
            'CREATE TABLE a (id integer PRIMARY KEY);CREATE TABLE b (id integer PRIMARY KEY, a_id integer REFERENCES a(id));',
            'postgres',
        );
        const ids = [
            ...schema.tables.map((t) => t.id),
            ...schema.tables.flatMap((t) => t.columns.map((c) => c.id)),
            ...schema.relations.map((r) => r.id),
        ];
        expect(new Set(ids).size).toBe(ids.length); // no collisions
    });

    it.each(DIALECTS)('imports a basic schema under %s', (dialect) => {
        const { schema, errors } = importSql(
            'CREATE TABLE t (id integer PRIMARY KEY, name text NOT NULL);',
            dialect,
        );
        expect(errors).toEqual([]);
        expect(schema.tables).toHaveLength(1);
        expect(schema.tables[0].columns).toHaveLength(2);
    });
});

describe('importSql — pg_dump style (separate ALTER TABLE constraints)', () => {
    // pg_dump declares keys as ALTER TABLE ADD CONSTRAINT, not inline. Historically
    // the importer only read CREATE TABLE, so every table came in key-less + relation-less.
    it('applies ALTER TABLE ADD CONSTRAINT PRIMARY KEY to the column', () => {
        const { schema } = importSql(
            'CREATE TABLE users (id integer NOT NULL, email text);' +
        'ALTER TABLE ONLY public.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);',
            'postgres',
        );
        const id = schema.tables[0].columns.find((c) => c.name === 'id')!;
        expect(id.primaryKey).toBe(true);
    });

    it('applies ALTER TABLE ADD CONSTRAINT FOREIGN KEY as a relation (with actions)', () => {
        const { schema } = importSql(
            'CREATE TABLE ci_runners (id integer NOT NULL);' +
        'CREATE TABLE ci_builds (id integer NOT NULL, runner_id integer);' +
        'ALTER TABLE ONLY public.ci_runners ADD CONSTRAINT ci_runners_pkey PRIMARY KEY (id);' +
        'ALTER TABLE ONLY public.ci_builds ADD CONSTRAINT fk_runner FOREIGN KEY (runner_id) REFERENCES public.ci_runners(id) ON DELETE SET NULL;',
            'postgres',
        );
        expect(schema.relations).toHaveLength(1);
        const rel = schema.relations[0];
        const builds = schema.tables.find((t) => t.name === 'ci_builds')!;
        const runners = schema.tables.find((t) => t.name === 'ci_runners')!;
        expect(rel.source.tableId).toBe(builds.id); // child (FK holder)
        expect(rel.target.tableId).toBe(runners.id);
        expect(rel.onDelete).toBe('set null');
    });

    it('salvages the rest when a statement cannot be parsed (never all-or-nothing)', () => {
        const { schema, errors } = importSql(
            'CREATE TABLE ok (id integer PRIMARY KEY);' +
        'CREATE INDEX weird ON ok USING gin (id public.gin_trgm_ops);' + // unsupported opclass → skipped
        'CREATE TABLE ok2 (id integer PRIMARY KEY);',
            'postgres',
        );
        expect(schema.tables.map((t) => t.name).sort()).toEqual(['ok', 'ok2']);
        expect(errors.some((e) => /skipped/i.test(e))).toBe(true);
    });
});

describe('splitSqlStatements', () => {
    it('splits on top-level semicolons only', () => {
        expect(splitSqlStatements('CREATE TABLE a (id int); CREATE TABLE b (id int);')).toHaveLength(2);
    });
    it('keeps a semicolon inside a string literal in one statement', () => {
        const parts = splitSqlStatements('INSERT INTO t VALUES (\'a;b\'); SELECT 1;');
        expect(parts).toHaveLength(2);
        expect(parts[0]).toContain('\'a;b\'');
    });
    it('ignores semicolons in line and block comments', () => {
        expect(splitSqlStatements('SELECT 1; -- a; b\nSELECT 2; /* c; d */ SELECT 3;')).toHaveLength(3);
    });
    it('keeps a dollar-quoted body intact', () => {
        const parts = splitSqlStatements('CREATE FUNCTION f() RETURNS int AS $$ BEGIN; RETURN 1; END; $$ LANGUAGE plpgsql; SELECT 1;');
        expect(parts).toHaveLength(2);
    });
});

describe('detectDialect', () => {
    const PG_DUMP = [
        'SET statement_timeout = 0;',
        'CREATE TABLE users (id integer NOT NULL, CONSTRAINT users_pk PRIMARY KEY (id));',
        'CREATE TABLE posts (id integer NOT NULL, user_id integer, CONSTRAINT posts_pk PRIMARY KEY (id));',
        'ALTER TABLE ONLY posts ADD CONSTRAINT posts_user_fk FOREIGN KEY (user_id) REFERENCES users (id);',
    ].join('\n');

    it('detects postgres from a pg_dump preamble / SERIAL / ALTER TABLE ONLY', () => {
        expect(detectDialect(PG_DUMP)).toBe('postgres');
        expect(detectDialect('CREATE TABLE a (id bigserial PRIMARY KEY);')).toBe('postgres');
    });

    it('detects mysql from backticks / ENGINE= / AUTO_INCREMENT', () => {
        expect(detectDialect('CREATE TABLE `a` (id INT AUTO_INCREMENT PRIMARY KEY) ENGINE=InnoDB;')).toBe('mysql');
    });

    it('defaults to sqlite for plain / bracketed / double-quoted DDL', () => {
        expect(detectDialect('CREATE TABLE [Album] ([AlbumId] INTEGER PRIMARY KEY);')).toBe('sqlite');
        expect(detectDialect('CREATE TABLE "t" ("id" INTEGER NOT NULL);')).toBe('sqlite');
    });

    it('auto-detection recovers FKs a pg_dump loses under the default sqlite parser', () => {
    // The bug: with the default sqlite dialect, Postgres-only `ALTER TABLE ONLY` fails to
    // parse and the foreign key is silently dropped.
        expect(importSql(PG_DUMP, 'sqlite').schema.relations).toHaveLength(0);
        // The fix: detection picks postgres, which parses it → the relation is recovered.
        expect(importSql(PG_DUMP, detectDialect(PG_DUMP)).schema.relations).toHaveLength(1);
    });
});
