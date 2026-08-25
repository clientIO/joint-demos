// Hardcoded, realistic CREATE TABLE DDL for the "Try an example" chips in the
// Import SQL dialog. Deliberately dialect-neutral (INTEGER / VARCHAR / TEXT /
// TIMESTAMP, inline REFERENCES, table-level PRIMARY KEY) so each string parses
// under SQLite, PostgreSQL and MySQL alike — no SERIAL / AUTO_INCREMENT / BOOLEAN.

// A classic blog: users write posts, posts get comments, posts have tags
// through a join table (composite PK).
export const BLOG_DDL = `CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(120) NOT NULL,
  bio TEXT,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE posts (
  id INTEGER PRIMARY KEY,
  author_id INTEGER NOT NULL REFERENCES users(id),
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  body TEXT NOT NULL,
  published INTEGER NOT NULL,
  published_at TIMESTAMP
);

CREATE TABLE comments (
  id INTEGER PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id),
  author_id INTEGER NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE tags (
  id INTEGER PRIMARY KEY,
  name VARCHAR(60) NOT NULL UNIQUE
);

CREATE TABLE post_tags (
  post_id INTEGER NOT NULL REFERENCES posts(id),
  tag_id INTEGER NOT NULL REFERENCES tags(id),
  PRIMARY KEY (post_id, tag_id)
);
`;

// A multi-tenant SaaS billing core: organizations own members, projects and
// subscriptions; subscriptions bill against plans and produce invoices.
export const SAAS_DDL = `CREATE TABLE organizations (
  id INTEGER PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(160) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE members (
  id INTEGER PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES organizations(id),
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(160) NOT NULL,
  role VARCHAR(40) NOT NULL,
  invited_at TIMESTAMP
);

CREATE TABLE projects (
  id INTEGER PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES organizations(id),
  name VARCHAR(160) NOT NULL,
  archived INTEGER NOT NULL
);

CREATE TABLE plans (
  id INTEGER PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(80) NOT NULL,
  price_cents INTEGER NOT NULL
);

CREATE TABLE subscriptions (
  id INTEGER PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES organizations(id),
  plan_id INTEGER NOT NULL REFERENCES plans(id),
  status VARCHAR(40) NOT NULL,
  renews_at TIMESTAMP
);

CREATE TABLE invoices (
  id INTEGER PRIMARY KEY,
  subscription_id INTEGER NOT NULL REFERENCES subscriptions(id),
  amount_cents INTEGER NOT NULL,
  issued_at TIMESTAMP NOT NULL,
  paid INTEGER NOT NULL
);
`;

// One starter example: a label for its chip and the DDL it drops into the editor.
export interface SqlExample {
  readonly id: string;
  readonly label: string;
  readonly ddl: string;
}

export const EXAMPLES: readonly SqlExample[] = [
    { id: 'blog', label: 'Blog', ddl: BLOG_DDL },
    { id: 'saas', label: 'SaaS', ddl: SAAS_DDL },
];
