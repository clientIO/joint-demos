# JointJS+: Data Modeling (React) <a href="https://www.jointjs.com/jointjs-plus"><img src="../../jointjs-plus-badge.svg" alt="JointJS+" width="123" align="right" /></a>

Data Modeling is a JointJS+ demo application for designing SQL database schemas as an entity-relationship diagram — and keeping the diagram honest by running the SQL it produces in a real database engine, right in the browser.

## What this demo shows

- **Tables as custom React components** — each table card renders its columns with types, primary/foreign keys, nullability, and indexes; editing happens inline and through a rich inspector panel
- **Relations drawn, not configured** — drag from one column to another to create a foreign-key relation; cardinality and referential actions live on the link itself
- **Schema groups** — tables organize into collapsible group containers, so large schemas stay navigable
- **Real SQL in the browser** — the schema compiles to DDL and runs against an in-browser SQLite (sql.js) or Postgres (PGlite) engine, with a query panel for exploring the result
- **SQL import and export** — paste or open an existing SQL file to reconstruct the diagram from it, and export dialect-correct DDL for SQLite or Postgres
- **Dark and light themes, keyboard support, and built-in accessibility**

## Why build data-modeling UIs with JointJS+ for React

A schema designer is exactly the kind of app where a generic canvas library runs out of road: the diagram is not a drawing, it is a database schema with rules.

JointJS+ for React is a UI library for exactly this kind of diagramming — not a wrapper around a canvas library, but a native React integration with:

- **A real data model** — the graph (tables, relations, and their data) is the source of truth, so the same model that renders the diagram also generates the SQL
- **Custom shapes** — table cards, group containers, and relation links in this demo are ordinary React components, not generic boxes
- **Feature richness out of the box** — this demo ships with an inspector, a navigator mini-map, selection, snaplines, export, and built-in accessibility support, all included as part of JointJS+ for React
- **Large-graph performance** — schemas grow to hundreds of tables; JointJS+ for React is built to stay responsive as diagrams scale

## Use cases

- Database schema designers and ERD editors
- Internal tools for reviewing and documenting existing databases
- Migration planning tools (import the current schema, design the target one)
- Teaching tools for SQL and relational modeling

## How to download this demo

You can download this demo using our [`@joint/cli` tool](https://www.npmjs.com/package/@joint/cli):

```bash
npx @joint/cli download data-modeling/react
```

Alternatively, you can get the [copy of the repository](https://github.com/clientIO/joint-demos/archive/refs/heads/main.zip) from GitHub as usual.

## Running the application

To run this application you need to have access to JointJS+ package. You can get it by having a JointJS+ license or by starting a [free trial](https://www.jointjs.com/free-trial).

```
@joint:registry=https://npm.jointjs.com
//npm.jointjs.com/:_authToken=<YOUR_AUTH_TOKEN>
```

Learn more about our [private npm registry here.](https://docs.jointjs.com/learn/help-center/npm-registry)

After setting up access to JointJS+ package, install the dependencies by running:

```bash
npm install
```

And then start the application with:

```bash
npm run dev
```

## Related

- [JointJS for React documentation](https://docs.jointjs.com/react)
- [Other JointJS demos](https://jointjs.com/demos)
