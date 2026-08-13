# JointJS: ELK Layout with Collapsible Clusters (TypeScript)

A large hierarchical diagram - about a thousand cells - laid out by the Eclipse Layout Kernel (ELK) via the [elkjs](https://github.com/kieler/elkjs) library.

- Every cluster has a button in its header which collapses it. The content of a collapsed cluster is pruned from the ELK graph, so the whole diagram is laid out again around the collapsed cluster.
- The diagram is displayed in a `ui.PaperScroller` with the `virtualRendering` option turned on. Together with the `viewManagement` option of the paper, the views are created for the cells within the visible area only.
- Links connect the children of a single cluster, they never cross a cluster boundary.

<a href="https://stackblitz.com/github/clientio/joint-demos/tree/main/elk-layout-collapsible-clusters/ts" target="_blank">
  <img
    alt="Open in StackBlitz"
    src="https://developer.stackblitz.com/img/open_in_stackblitz.svg"
  />
</a>

This demo is also available online at [jointjs.com](https://jointjs.com/demos/elk-layout-collapsible-clusters).

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

## Project Structure

| File | Description |
|------|-------------|
| `src/main.ts` | App entry point -- styles and the application start |
| `src/app.ts` | The paper, the paper scroller, the virtual rendering setup, the collapsing and the toolbar |
| `src/dataset.ts` | Generates the example diagram description (clusters, children, links). Deterministic - the same diagram on every run |
| `src/layout.ts` | Creates the JointJS cells once, converts the description into an ELK graph (skipping the collapsed clusters) and applies the layout result back to the graph |
| `src/shapes.ts` | The `Cluster`, `Leaf` and `Edge` cell types. The collapse button is a part of the cluster markup and triggers a custom paper event |
| `src/styles.css` | Layout and toolbar styles |
