# JointJS+: Diagram Index (React) <a href="https://www.jointjs.com/jointjs-plus"><img src="../jointjs-plus-badge.svg" alt="JointJS+" width="123" align="right" /></a>

This is a React version of the Diagram Index demo: multiple JointJS diagrams
navigated from an MUI X tree view, with a two-way selection sync between the
tree and the canvas. Thus you or your customers can get a better overview of
all elements contained in your diagrams, and work in a more organized way.

Built with [`@joint/react-plus`](https://www.jointjs.com/react): the saved
JointJS diagrams are converted into declarative cell records and rendered by
React components — no shape classes, no imperative paper wiring.

## What this demo shows

- **Declarative cells from saved JSON** — the diagrams are kept as exported
  JointJS JSON (`src/data/tree-data.ts`) and converted into
  `ElementRecord`/`LinkRecord` records at module load (`src/data/cells.ts`).
  Link fidelity is preserved through the record's native `EndJSON`: static
  `vertices`, labels, and the two parallel links of Process 2 held apart by
  `center` anchors with `dy: ±10`.
- **React-rendered nodes** — the four flowchart outlines (rectangle,
  parallelogram, diamond, ellipse) are one small SVG component
  (`src/components/render-node.tsx`) reading its fixed geometry off the model
  (`useCell(selectElementSize)`); nothing is measured out of the DOM.
- **Two-way tree ↔ canvas selection with React state as the single source of
  truth** (`src/app.tsx`). The tree is a controlled MUI X `SimpleTreeView`;
  selection rides item *focus*, so walking the tree with the arrow keys moves
  the canvas selection, and crossing into the other diagram's subtree switches
  the canvas. A canvas click selects and focuses the tree item through the
  tree view's `apiRef` — no DOM queries.
- **CSS-only selection halo** — `<Selection wrapper={false}>` toggles the
  `jj-is-selected` class; the green glow is a fat-stroke sibling outline on
  elements and the link's built-in wrapper path on links, styled in
  `src/index.css`.
- **One `<Diagram>` per diagram** — switching diagrams remounts
  `<Diagram key={diagramId} initialCells={...}>`; the graph stays uncontrolled
  and view-only (`interactive={false}`, built-in selection interactions off),
  while `<PaperScroller>` provides blank-drag panning, wheel scrolling and
  pinch zoom.

## How to download this demo

You can download this demo using our [`@joint/cli` tool](https://www.npmjs.com/package/@joint/cli):

```bash
npx @joint/cli download diagram-index/react
```

Alternatively, you can get the [copy of the repository](https://github.com/clientIO/joint-demos/archive/refs/heads/main.zip) from GitHub as usual.

## Running the application

To run this application you need to have access to JointJS+ package. You can get it by having a JointJS+ license or by starting a [free trial](https://www.jointjs.com/free-trial).

If you are a trial user, you received your access token during the trial sign-up process.
If you are a customer, log in to the customer portal at https://my.jointjs.com to obtain your access token.

This example uses `.npmrc` file to set up access to the JointJS+ private npm registry. By default it uses `JOINTJS_NPM_TOKEN` environment variable to get authentication token. You can set this environment variable in your terminal or CI environment in the following way:

**macOS / Linux**:
```sh
export JOINTJS_NPM_TOKEN="jjs-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**Windows (PowerShell)**:
```sh
$env:JOINTJS_NPM_TOKEN="jjs-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
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
