# JointJS+: ELK Layout with Collapsible Clusters (TypeScript) <a href="https://www.jointjs.com/jointjs-plus"><img src="../../jointjs-plus-badge.svg" alt="JointJS+" width="123" align="right" /></a>

A diagram of about a thousand cells, arranged into nested clusters by the Eclipse Layout Kernel (ELK) via the [elkjs](https://github.com/kieler/elkjs) library. Every cluster collapses to its header, and only the cells within the visible area of the paper scroller are rendered.

This demo is also available online at [jointjs.com](https://jointjs.com/demos/elk-layout-collapsible-clusters).

<a href="https://stackblitz.com/github/clientio/joint-demos/tree/main/elk-layout-collapsible-clusters/ts" target="_blank">
  <img
    alt="Open in StackBlitz"
    src="https://developer.stackblitz.com/img/open_in_stackblitz.svg"
  />
</a>

## Features

- **Virtual rendering** -- the `virtualRendering` option of `ui.PaperScroller` renders the cells within the visible area only. Together with the `viewManagement` option of the paper, a view is created when a cell scrolls in and thrown away when it scrolls out. The toolbar shows how many of the cells are in the DOM at the moment.
- **Collapsible clusters** -- the button in the header of a cluster hides its content. The content is pruned from the ELK graph, so the diagram is laid out again around the collapsed cluster. The button stays at the same position on the screen, however far the layout moves the cluster.
- **Hierarchical ELK layout** -- the clusters are packed by the `rectpacking` algorithm, the content of each of them is arranged by the `layered` algorithm with orthogonal edge routing.
- **A generated diagram** -- 12 top-level clusters with nested clusters and leaf nodes, about 900 cells in total. The generator is deterministic, so every run gives the same diagram.

## Controls

| Action | Result |
|--------|--------|
| Wheel / two-finger swipe | Scroll the diagram |
| Ctrl + wheel / pinch | Zoom in and out |
| Drag | Pan the diagram |
| The `-` / `+` button in a cluster header | Collapse or expand the cluster |
| Collapse All / Expand All | Toggle every cluster at once (a single layout run) |

## Project Structure

| File | Description |
|------|-------------|
| `src/main.ts` | App entry point -- styles and the application start |
| `src/app.ts` | The paper, the paper scroller, the virtual rendering setup, the collapsing and the toolbar |
| `src/dataset.ts` | Generates the diagram description (clusters, children, links). Deterministic -- the same diagram on every run |
| `src/layout.ts` | Creates the JointJS cells once, converts the description into an ELK graph (skipping the collapsed clusters) and applies the layout result back to the graph |
| `src/shapes.ts` | The `Cluster`, `Leaf` and `Edge` cell types. The collapse button is a part of the cluster markup and triggers a custom paper event |
| `src/styles.css` | Layout, toolbar and collapse button styles |

## How it works

**The cells are created once.** `createCells()` builds the whole graph, including the content of the clusters which are collapsed later on. A layout only changes the geometry of the cells: `element.set()` is used instead of `element.position()` and `element.resize()`, because ELK positions the children of an element as well and they must not be moved along with their parent.

**Collapsing** sets the `collapsed` attribute of the cluster, which schedules a layout. `createElkGraph()` then leaves the content of the collapsed clusters out and gives the cluster the size of its header. The cells which are left out keep the geometry of the previous layout - they are not rendered, and they are not measured either:

```ts
function isCellVisible(cell: dia.Cell): boolean {
    return !cell.getAncestors().some(
        (ancestor) => Cluster.isCluster(ancestor) && ancestor.isCollapsed()
    );
}
```

The very same function decides what the paper renders (as the `cellVisibility` callback of the virtual rendering controller, which combines it with its own viewport check) and what the paper is sized to (`getVisibleContentArea()`). Note that the links are reparented into the cluster of their endpoints, so the check applies to them without any special case.

**No link crosses a cluster boundary** in this example. That lets each cluster be laid out on its own (`elk.hierarchyHandling: SEPARATE_CHILDREN`) and keeps a collapsed cluster free of links pointing into the nothing.

## How to download this demo

You can download this demo using our [`@joint/cli` tool](https://www.npmjs.com/package/@joint/cli):

```bash
npx @joint/cli download elk-layout-collapsible-clusters/ts
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

To create a production build, run:

```bash
npm run build
```
