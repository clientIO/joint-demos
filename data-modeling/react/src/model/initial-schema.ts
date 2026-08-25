// The seed ERD shown on first load: a clean SaaS schema in two groups —
// "Identity & Teams" (users, organizations, memberships join table) and
// "Product" (projects, tasks, comments) — with PKs, FK relations, varied column
// types, and one explanatory note. Stable, hand-written ids so relations can
// reference columns by id and the round-trip check has fixed expectations.

import type { Column, Relation, Schema, Table } from '../schema/types';
import type { ColumnType } from '../schema/sql-types';
import type { NoteSeed } from './cell-data';

// Canonical column types used below (kept terse and reused).
const UUID: ColumnType = { kind: 'uuid' };
const VARCHAR: ColumnType = { kind: 'varchar', length: 255 };
const TEXT: ColumnType = { kind: 'text' };
const TIMESTAMP: ColumnType = { kind: 'timestamp' };
const BOOLEAN: ColumnType = { kind: 'boolean' };
const DATE: ColumnType = { kind: 'date' };

interface ColumnFlags {
  readonly primaryKey?: boolean;
  readonly unique?: boolean;
  readonly nullable?: boolean;
}

// Column factory — defaults to a non-null, non-key, non-unique column.
function col(
    id: string,
    name: string,
    type: ColumnType,
    flags: ColumnFlags = {},
): Column {
    return {
        id,
        name,
        type,
        primaryKey: flags.primaryKey ?? false,
        unique: flags.unique ?? false,
        nullable: flags.nullable ?? false,
    };
}

const PK: ColumnFlags = { primaryKey: true, unique: true };

const users: Table = {
    id: 'tbl_users',
    name: 'users',
    groupId: 'grp_identity',
    indexes: [],
    columns: [
        col('col_users_id', 'id', UUID, PK),
        col('col_users_email', 'email', VARCHAR, { unique: true }),
        col('col_users_name', 'full_name', VARCHAR),
        col('col_users_created', 'created_at', TIMESTAMP),
    ],
};

const organizations: Table = {
    id: 'tbl_orgs',
    name: 'organizations',
    groupId: 'grp_identity',
    indexes: [],
    columns: [
        col('col_orgs_id', 'id', UUID, PK),
        col('col_orgs_name', 'name', VARCHAR),
        col('col_orgs_slug', 'slug', VARCHAR, { unique: true }),
        col('col_orgs_created', 'created_at', TIMESTAMP),
    ],
};

const memberships: Table = {
    id: 'tbl_memberships',
    name: 'memberships',
    comment: 'Join table: users <-> organizations (many-to-many).',
    groupId: 'grp_identity',
    indexes: [],
    columns: [
        col('col_mem_id', 'id', UUID, PK),
        col('col_mem_user', 'user_id', UUID),
        col('col_mem_org', 'org_id', UUID),
        col('col_mem_role', 'role', VARCHAR),
        col('col_mem_created', 'created_at', TIMESTAMP),
    ],
};

const projects: Table = {
    id: 'tbl_projects',
    name: 'projects',
    groupId: 'grp_product',
    indexes: [],
    columns: [
        col('col_proj_id', 'id', UUID, PK),
        col('col_proj_org', 'org_id', UUID),
        col('col_proj_name', 'name', VARCHAR),
        col('col_proj_status', 'status', VARCHAR),
        col('col_proj_created', 'created_at', TIMESTAMP),
    ],
};

const tasks: Table = {
    id: 'tbl_tasks',
    name: 'tasks',
    groupId: 'grp_product',
    indexes: [],
    columns: [
        col('col_task_id', 'id', UUID, PK),
        col('col_task_project', 'project_id', UUID),
        col('col_task_assignee', 'assignee_id', UUID, { nullable: true }),
        col('col_task_title', 'title', VARCHAR),
        col('col_task_done', 'done', BOOLEAN),
        col('col_task_due', 'due_date', DATE, { nullable: true }),
    ],
};

const comments: Table = {
    id: 'tbl_comments',
    name: 'comments',
    groupId: 'grp_product',
    indexes: [],
    columns: [
        col('col_com_id', 'id', UUID, PK),
        col('col_com_task', 'task_id', UUID),
        col('col_com_author', 'author_id', UUID),
        col('col_com_body', 'body', TEXT),
        col('col_com_created', 'created_at', TIMESTAMP),
    ],
};

// Foreign keys. source = referencing (child) column, target = referenced PK.
// Every FK is a many-rows-to-one-parent relation, hence N:1.
function fk(
    id: string,
    from: [string, string],
    to: [string, string],
): Relation {
    return {
        id,
        source: { tableId: from[0], columnId: from[1] },
        target: { tableId: to[0], columnId: to[1] },
        cardinality: 'N:1',
    };
}

const relations: readonly Relation[] = [
    fk(
        'rel_mem_user',
        ['tbl_memberships', 'col_mem_user'],
        ['tbl_users', 'col_users_id'],
    ),
    fk(
        'rel_mem_org',
        ['tbl_memberships', 'col_mem_org'],
        ['tbl_orgs', 'col_orgs_id'],
    ),
    fk(
        'rel_proj_org',
        ['tbl_projects', 'col_proj_org'],
        ['tbl_orgs', 'col_orgs_id'],
    ),
    fk(
        'rel_task_project',
        ['tbl_tasks', 'col_task_project'],
        ['tbl_projects', 'col_proj_id'],
    ),
    fk(
        'rel_task_assignee',
        ['tbl_tasks', 'col_task_assignee'],
        ['tbl_users', 'col_users_id'],
    ),
    fk(
        'rel_com_task',
        ['tbl_comments', 'col_com_task'],
        ['tbl_tasks', 'col_task_id'],
    ),
    fk(
        'rel_com_author',
        ['tbl_comments', 'col_com_author'],
        ['tbl_users', 'col_users_id'],
    ),
];

export const INITIAL_SCHEMA: Schema = {
    tables: [users, organizations, memberships, projects, tasks, comments],
    relations,
    groups: [
        { id: 'grp_identity', name: 'Identity & Teams', collapsed: false },
        { id: 'grp_product', name: 'Product', collapsed: false },
    ],
};

// Seed notes shown on first load. Not part of the Schema domain — passed to
// schemaToCells alongside the schema.
export const INITIAL_NOTES: readonly NoteSeed[] = [
    {
        id: 'note_intro',
        // Markdown (rendered by the note card) — a friendly "how it works" onboarding
        // card that greets you on load. Double-click it to edit.
        text: [
            '# 📊 Data Modeling',
            '',
            'Design a database **visually** and get **live SQL**.',
            '',
            '1. **Add** a table, group or note — toolbar or `T` `G` `N`',
            '2. **Edit inline** — click a name, type or key',
            '3. **Link** — drag from a row’s coral edge to another column',
            '4. **Run SQL** — open the query runner (real in-browser DB)',
            '5. **Import / Export** — load existing DDL or download yours',
            '',
            '> 💡 Switch **SQLite · PostgreSQL · MySQL** to watch the SQL adapt.',
        ].join('\n'),
        // Left of the diagram so it reads first; larger than a quick sticky so the
        // left-aligned onboarding steps fit on one line each.
        position: { x: -420, y: 200 },
        size: { width: 420, height: 300 },
    },
];
