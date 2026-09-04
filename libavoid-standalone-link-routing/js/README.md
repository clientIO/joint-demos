# JointJS: Standalone Link Routing with Libavoid (JavaScript)

Libavoid is a library that offers high-quality polyline and orthogonal link routing, effectively navigating around objects and avoiding overlapping parallel links. It is particularly useful when used in conjunction with interactive diagram editors, such as those that can be created with JointJS. This demo showcases the official [`@joint/router-avoid`](https://www.npmjs.com/package/@joint/router-avoid) package — a JointJS integration of the Libavoid WebAssembly build — in three configurations.

<a href="https://stackblitz.com/github/clientio/joint-demos/tree/main/libavoid-standalone-link-routing/js" target="_blank">
  <img
    alt="Open in StackBlitz"
    src="https://developer.stackblitz.com/img/open_in_stackblitz.svg"
  />
</a>

This demo is also available online at [jointjs.com](https://jointjs.com/demos/libavoid-standalone-link-routing).

<img width="709" alt="image" src="https://github.com/clientIO/joint/assets/3967880/acb322cb-8913-429b-aaa9-87322f3aad9a">

## How to download this demo

You can download this demo using our [`@joint/cli` tool](https://www.npmjs.com/package/@joint/cli):

```bash
npx @joint/cli download libavoid-standalone-link-routing/js
```

Alternatively, you can get the [copy of the repository](https://github.com/clientIO/joint-demos/archive/refs/heads/main.zip) from GitHub as usual.

## Running the application

Install the dependencies by running:

```bash
npm install
```

And then start one of the variants below.

## Variants

Three variants live side-by-side under `src/`, sharing a handful of helpers under `src/shared/`. All of them use `initAvoidRouter()` from `@joint/router-avoid` — the returned router service listens to the graph, keeps the Libavoid state in sync, and writes the computed routes (vertices and anchors) back onto the links. They differ in *where* the routing runs and *what* each one is meant to demonstrate.

### UI thread (default)

Runs the avoid routing on the main thread against a small graph (5 nodes, 4 links) from `src/shared/example-graph.js`. Fully editable — double-click blank to add a node, drag to move or resize, hover a link for remove/arrowhead tools. The simplest setup: `await initAvoidRouter(graph, options)` followed by `routerService.start()` is the entire integration.

```bash
npm run start   # or: npm run build
```

### Web Worker

Same graph, shapes, and editing affordances as the UI-thread variant, with the routing running off the main thread — enabled with a single option, `worker: true`. The package spawns and manages the worker itself; there is no hand-rolled message protocol. While a route is being computed, the router service applies a provisional built-in `rightAngle` route (also the final fallback for unroutable links), and the demo listens to the service's `link:routing` / `link:routed` / `link:routing:cancelled` events to toggle an "awaiting-update" visual on the affected links.

```bash
npm run start-web-worker   # or: npm run build-web-worker
```

### Web Worker (performance)

Stress test for the worker setup. A dropdown switches between two flowchart-style graphs of very different sizes (the bigger one ~400 elements / ~450 links); loading a diagram via `graph.fromJSON()` makes the router service re-sync its entire Libavoid state, and the routing time is logged to the console via `console.time('worker routed')`, closed by the service's `idle` event (fired when the worker has nothing left to route). In worker mode the service also batches graph changes before sending them to the worker (configurable via `worker: { debounceTime }`). Click on blank or a cell to fit the paper, drag on blank to rubber-band zoom.

```bash
npm run start-web-worker-perf   # or: npm run build-web-worker-perf
```

## Notes on bundling

- `libavoid.wasm` is not bundled into the JavaScript — it is served as a separate file (Libavoid is LGPL-licensed) and copied to the output directory by `copy-webpack-plugin`; the package resolves it relative to the executing script at runtime.
- The package's routing worker is a module worker created with `new Worker(new URL(...), import.meta.url)`, which webpack 5 detects and bundles automatically into a separate chunk — no extra configuration needed.
