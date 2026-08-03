# JointJS+: Mermaid Editor (React) <a href="https://www.jointjs.com/jointjs-plus"><img src="../../jointjs-plus-badge.svg" alt="JointJS+" width="123" align="right" /></a>

The Mermaid Editor demo turns [Mermaid](https://mermaid.js.org/) flowchart source into native JointJS cells. Mermaid's own parser reads the text, and the resulting nodes and edges are mapped onto declarative `@joint/react-plus` cell records. Edit the source on the left and the diagram on the right is reparsed and re-laid out as you type.

This demo is also available online at [jointjs.com](https://jointjs.com/demos/mermaid-editor).

## What this demo shows

- **Real Mermaid parsing** — no hand-written grammar. `mermaidAPI.getDiagramFromText()` runs Mermaid's own flowchart parser and `FlowDB.getData()` hands back normalized nodes and edges, which `src/mermaid/to-cells.ts` maps onto `CellRecord`s
- **Every flowchart node shape** — rectangle, rounded, stadium, subroutine, cylinder, circle, double circle, ellipse, rhombus, hexagon, both parallelograms, both trapezoids and the asymmetric shape, each drawn as SVG and sized from its own label via `useMeasureElement`. Labels go through `<SVGText>`, so Mermaid's `<br>` breaks lay out as multiple lines — centred as a block — without any per-line arithmetic
- **Content-driven sizing** — elements are created with no `position` and no `size`; the label is measured first, then [`@joint/layout-directed-graph`](https://www.npmjs.com/package/@joint/layout-directed-graph) places every node, re-running whenever the source changes
- **Edge fidelity** — arrow heads (`-->`, `--o`, `--x`, `---`, `<-->`), line styles (`-.->`, `==>`), edge labels (`-->|yes|`) and rank length (`---->`) all survive the round trip
- **Direction aware** — `TD`/`TB`, `BT`, `LR` and `RL` set both dagre's rank direction and the `midSide` anchor axis carried on each link end, so a vertical chart attaches on the top/bottom sides and each end picks the one facing the other — back-edges included
- **Live editing** — a CodeMirror 6 editor with real Mermaid syntax highlighting (`codemirror-lang-mermaid`'s Lezer grammar, not a regex), debounced reparse, and parse errors reported inline while the last good diagram stays on screen
- **`<PaperScroller>` canvas** — `<Diagram>`'s built-in interactions give background-drag panning, wheel scrolling and pinch zoom for free, and `usePaperScroller` / `usePaperScrollerViewport` drive the zoom cluster: a live zoom readout with buttons that disable at the scroller's zoom bounds. The camera is framed when a diagram is loaded, not on every parse — editing the source leaves the zoom and scroll where you put them. The cells themselves are not interactive: the text is the single source of truth, so a dragged node would be discarded on the next keystroke
- **Source and diagram linked both ways** — click a node and every occurrence of its id is marked in the editor, with the first one scrolled into view; put the caret on a line and the nodes it mentions are selected on the canvas — `graph.getSubgraph()` adds the links whose both ends are in that set, so `a --> b` lights up the edge along with its two nodes, and the scroller pans to the node when it is off screen. Each side reveals the other only when it has to: `isElementVisible` gates the pan, so a caret move within the visible part of the diagram never shifts the canvas. The marking runs one way only: while you are typing, the caret's own line is the answer, and painting that id everywhere else would just clutter the text. Mermaid's parser keeps no source positions, so the mapping comes from the other side: the Lezer grammar behind the syntax highlighting tags each id as a `NodeId` token with exact offsets, and those ids are the same strings Mermaid gave the cells. The app owns the selection and both panes render it, which is what stops the two-way binding from oscillating. Selection is `<Selection wrapper={false}>` for the state and the `jj-is-selected` class, with `interactions={{ selection: false }}` swapping the built-in editing gestures for a single `onElementPointerClick`
- **Node styling** — `style a fill:#ddffee`, `classDef` and `class` all come through, resolved as two layers so the node's own line wins per property. The label colour is the subtle part: a class picks its `color` to suit the class's own `fill`, so when a node overrides only the fill that pairing no longer holds and the colour is derived from the fill that actually won. Mermaid hands both forms over as `"prop:value"` declaration strings, so one pass covers them: `color` becomes the label's fill, everything else styles the shape. A node that sets a `fill` but no `color` gets a label colour derived from that fill's luminance, so an author's pale fill stays legible in the dark theme instead of inheriting near-white text
- **Edit a node from the canvas** — double-click a node to rename it in place (a `<textarea>` in a `<foreignObject>`, sitting exactly where the label is, growing as you type — Enter saves, Shift+Enter adds a line and is encoded back as Mermaid's `<br>`), and select one for a floating `<ElementOverlay>` toolbar carrying its shape and fill. The shape picker is a button group whose icons are drawn by the same `<SVGShape>` the canvas uses, so a button can never depict something different from what choosing it produces. Each control writes *back into the Mermaid source* as a targeted span replacement, using the same Lezer offsets that drive the highlighting: a rename rewrites one `NodeText` range, a reshape swaps the delimiters around it, a fill patches or appends a `style` line. Regenerating the whole document from the parsed graph would have been easier but lossy — that structure has no comments, no formatting, no `classDef` names and no subgraphs, so every click would reformat the file. Labels containing Mermaid's own delimiters are quoted automatically. Typing is debounced but a discrete edit is not — a click reparses at once, so the canvas answers in tens of milliseconds rather than waiting out a delay meant for keystrokes
- **SVG export** — `useImageExport` saves the diagram, with computed styles inlined so the colours survive outside the page. Narrowing that to the properties that actually describe the drawing matters: the default `'full'` mode copies every computed property and turned a ten-node export into 1.4 MB, against 66 kB for the same diagram
- **Light and dark themes** — one `data-theme` attribute on `<html>` swaps a set of CSS variables that the app chrome, the diagram and the CodeMirror editor all read from, so switching repaints everything without a React re-render or a paper rebuild. Follows the OS preference until you pick a side

## Why build a Mermaid renderer with JointJS+ for React

Mermaid renders a static image. Rendering the same source through JointJS+ gives you a live graph instead: a canvas you can pan and zoom, and a real `dia.Graph` you can query, hit-test, extend with inspectors and tooling, or export. This demo keeps the cells read-only because the text owns the diagram, but everything needed to make them editable is already there. The parser stays Mermaid's, so existing diagrams keep working — only the rendering and interaction layer changes.

## Use cases

- Importing existing Mermaid documentation into an editable diagramming tool
- Giving a docs site or wiki an interactive diagram viewer instead of a flat SVG
- Seeding a diagram editor from text, then continuing to edit it on the canvas

## Limitations

Only the `flowchart` (and legacy `graph`) diagram type is supported; any other Mermaid diagram is reported as unsupported. `subgraph` blocks are parsed but flattened — their members are rendered as ordinary nodes and a notice says how many groups were dropped. Mermaid's `click` directives are ignored, and edge styling (`linkStyle`) is not applied.

Two parsers read the same text, and that is the demo's structural weak point. Mermaid supplies the graph, but its flowchart grammar is still the jison one inside `mermaid` core, and the normalised `getData()` output carries no source positions — so the editing features get their offsets from a second, independent grammar (`codemirror-lang-mermaid`'s Lezer parser). Anywhere the two disagree, an edit can land in the wrong place: Lezer requires a direction after `flowchart` where Mermaid defaults it to `TB` (worked around in `flowchart-tree.ts` by inserting one for the parse and mapping the offsets back), and it reads `[/label/]` as `[`…`]` around a label containing slashes, so the label span has to be taken from the shape's delimiters rather than from `NodeText`. Expect more of these for the shapes the demo does not model — the trapezoids, `(((double circle)))`, the `@{ shape: ... }` syntax.

The clean fix is upstream. Mermaid's Langium parser (`@mermaid-js/parser`) exposes `$cstNode.offset` / `$cstNode.length` on every AST node, which is exactly what a source-editing tool needs — but as of 1.2.0 it covers only `architecture`, `gitGraph`, `info`, `packet`, `pie`, `radar` and `treemap`. If flowchart moves onto it, the offsets would come from the same parse as the semantics and the second grammar could be dropped entirely.

## How to download this demo

You can download this demo using our [`@joint/cli` tool](https://www.npmjs.com/package/@joint/cli):

```bash
npx @joint/cli download mermaid-editor/react
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

## Related

- [JointJS for React documentation](https://docs.jointjs.com/react)
- [Other JointJS demos](https://jointjs.com/demos)
