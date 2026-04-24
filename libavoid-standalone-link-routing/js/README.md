# JointJS: Standalone Link Routing with Libavoid (JavaScript)

Libavoid is a library that offers high-quality polyline and orthogonal link routing, effectively navigating around objects and avoiding overlapping parallel links. It is particularly useful when used in conjunction with interactive diagram editors, such as those that can be created with JointJS. This demo showcases the functionality of Libavoid, integrated into a JointJS diagram.

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

Three variants live side-by-side under `src/`, sharing the avoid-router integration code and a handful of helpers under `src/shared/`. They differ in *where* the router runs and *what* each one is meant to demonstrate.

### UI thread (default)

Runs the avoid router on the main thread against a small graph (5 nodes, 4 links) from `src/shared/example-graph.js`. Fully editable — double-click blank to add a node, drag to move or resize, hover a link for remove/arrowhead tools. The simplest place to read the router integration end to end.

```bash
npm run start   # or: npm run build
```

### Web Worker

Same graph, shapes, and editing affordances as the UI-thread variant, with the avoid router running in a dedicated `Worker` (`src/web-worker/worker.js`) so routing never blocks the UI. The reference for async routing: a paper↔worker message protocol (`add` / `remove` / `change` / `reset` out, `routed` back), an "awaiting-update" visual while a link's route is pending, and filters on both sides so no wasted message is sent and no stale reply overrides a link the user just disconnected.

```bash
npm run start-web-worker   # or: npm run build-web-worker
```

### Web Worker (performance)

Stress test for the worker setup. A dropdown switches between two flowchart-style graphs of very different sizes (the bigger one ~400 elements / ~450 links); routing time for each load is logged to the console via `console.time('worker routed')`. Click on blank or a cell to fit the paper, drag on blank to rubber-band zoom.

```bash
npm run start-web-worker-perf   # or: npm run build-web-worker-perf
```
