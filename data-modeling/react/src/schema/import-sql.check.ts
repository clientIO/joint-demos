// Smallest runnable check that fails if SQL import breaks. Side-effect free on
// import — call runImportChecks() explicitly (scratch script / browser console).
// Covers the load-bearing path: a CREATE TABLE with a column-level PRIMARY KEY, a
// NOT NULL column, and a FOREIGN KEY must yield a table, typed columns, the PK
// flag, and exactly one Relation with N:1 cardinality.
import { importSql } from './import-sql';
import { isForeignKey } from './schema-helpers';

function assert(condition: boolean, message: string): void {
    if (!condition) throw new Error(`import-sql check failed: ${message}`);
}

export function runImportChecks(): void {
    const sql = `
    CREATE TABLE users (
      id integer PRIMARY KEY,
      email varchar(255) NOT NULL UNIQUE
    );
    CREATE TABLE posts (
      id integer PRIMARY KEY,
      author_id integer NOT NULL REFERENCES users(id),
      title text NOT NULL DEFAULT 'untitled'
    );
    CREATE INDEX idx_posts_author ON posts (author_id);
  `;
    const { schema, errors } = importSql(sql, 'postgres');
    assert(errors.length === 0, `unexpected errors: ${errors.join('; ')}`);
    assert(schema.tables.length === 2, `expected 2 tables, got ${schema.tables.length}`);

    const posts = schema.tables.find((table) => table.name === 'posts');
    assert(posts !== undefined, 'posts table missing');
    if (!posts) return;

    const id = posts.columns.find((col) => col.name === 'id');
    assert(id?.primaryKey === true, 'posts.id should be PRIMARY KEY');
    assert(id?.nullable === false, 'PRIMARY KEY column should be NOT NULL');
    assert(id?.type.kind === 'integer', `posts.id type should be integer, got ${id?.type.kind}`);

    const author = posts.columns.find((col) => col.name === 'author_id');
    assert(author?.nullable === false, 'author_id should be NOT NULL');

    const title = posts.columns.find((col) => col.name === 'title');
    assert(title?.defaultValue === '\'untitled\'', `title default should round-trip, got ${title?.defaultValue}`);

    // One FK -> exactly one Relation, child (posts.author_id) is source, N:1.
    assert(schema.relations.length === 1, `expected 1 relation, got ${schema.relations.length}`);
    const [relation] = schema.relations;
    assert(relation.cardinality === 'N:1', `expected N:1, got ${relation.cardinality}`);
    assert(relation.source.tableId === posts.id, 'relation source should be the child (posts)');
    assert(author !== undefined && relation.source.columnId === author.id, 'relation source column should be author_id');
    assert(author !== undefined && isForeignKey(author.id, schema.relations), 'author_id should read as a foreign key');

    // A UNIQUE FK column would collapse to 1:1 — verify the heuristic both ways.
    const oneToOne = importSql(
        'CREATE TABLE a (id integer PRIMARY KEY);' +
      'CREATE TABLE b (a_id integer UNIQUE REFERENCES a(id));',
        'postgres',
    );
    assert(oneToOne.schema.relations.length === 1, 'expected one 1:1 relation');
    assert(oneToOne.schema.relations[0].cardinality === '1:1', 'UNIQUE FK column should be 1:1');

    // ON DELETE / ON UPDATE referential actions must survive import (both the inline
    // REFERENCES form and the table-level CONSTRAINT form), so a SQL round-trip
    // doesn't silently drop them.
    const inlineActions = importSql(
        'CREATE TABLE a (id integer PRIMARY KEY);' +
      'CREATE TABLE b (a_id integer REFERENCES a(id) ON DELETE SET NULL ON UPDATE CASCADE);',
        'postgres',
    );
    assert(inlineActions.schema.relations.length === 1, 'expected one relation with actions');
    assert(inlineActions.schema.relations[0].onDelete === 'set null', 'inline ON DELETE SET NULL should round-trip');
    assert(inlineActions.schema.relations[0].onUpdate === 'cascade', 'inline ON UPDATE CASCADE should round-trip');

    const constraintActions = importSql(
        'CREATE TABLE a (id integer PRIMARY KEY);' +
      'CREATE TABLE b (a_id integer, CONSTRAINT fk_b FOREIGN KEY (a_id) REFERENCES a(id) ON DELETE CASCADE);',
        'postgres',
    );
    assert(constraintActions.schema.relations.length === 1, 'expected one constraint relation');
    assert(constraintActions.schema.relations[0].onDelete === 'cascade', 'constraint ON DELETE CASCADE should round-trip');
    assert(constraintActions.schema.relations[0].onUpdate === undefined, 'no ON UPDATE clause -> undefined');

    // A composite PRIMARY KEY (the common join-table shape) must flag BOTH named
    // columns as primary key, so generate-ddl re-emits one table-level PRIMARY KEY
    // clause (single-column inline PK per column would be invalid multi-PK SQL).
    const composite = importSql(
        'CREATE TABLE memberships (user_id uuid, org_id uuid, PRIMARY KEY (user_id, org_id));',
        'postgres',
    );
    const members = composite.schema.tables.find((table) => table.name === 'memberships');
    assert(members !== undefined, 'memberships table imported');
    if (members) {
        const pkCols = members.columns.filter((col) => col.primaryKey).map((col) => col.name);
        assert(pkCols.length === 2, `composite PK should flag both columns, got ${pkCols.join(', ')}`);
        assert(pkCols.includes('user_id') && pkCols.includes('org_id'), 'composite PK columns are user_id + org_id');
    }
}
