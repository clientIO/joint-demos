# JointJS+ BPMN Editor — React

React version of the BPMN editor demo, built with [`@joint/react-plus`](https://docs.jointjs.com/react).

The graph is the single source of truth: a pre-created `dia.Graph` is passed to `<Diagram graph={graph}>` (no `cells` prop, no `renderElement` — the BPMN shapes are classic JointJS shape classes rendering through their own views). The editing logic lives in framework-agnostic controllers and services (`src/controllers`, `src/services`, `src/events`); the stencil, toolbar, navigator panel, and inspector are React components.

## Setup

The `@joint/*` packages are hosted on the JointJS+ private npm registry, so you need a license (or trial) token first:

```bash
export JOINTJS_NPM_TOKEN="jjs-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

(PowerShell: `$env:JOINTJS_NPM_TOKEN = "jjs-..."`.)

See the [npm registry help page](https://docs.jointjs.com/learn/help-center/npm-registry) for details on obtaining a token.

Then:

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — production build into `dist/`
- `npm run preview` — serve the production build locally
- `npm run typecheck` — `tsc -b`
