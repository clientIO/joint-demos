# JointJS: Standalone Link Routing with Libavoid (React)

Libavoid offers high-quality orthogonal link routing that navigates around
objects and avoids overlapping parallel links. This variant is the React port of
the JavaScript demo's **Web Worker (performance) example**: a flowchart of up to
2000 cells, routed off the main thread by the
[`@joint/router-avoid`](https://www.npmjs.com/package/@joint/router-avoid)
package, drawn on a `@joint/react-plus` canvas with React-rendered nodes.

A dropdown switches between three graphs, and the toolbar reports how long each
routing pass took.

![The small graph routed, zoomed in on the HTML nodes](./screenshot.png)

| Graph | Cells | Ports | Routed in |
|---|---|---|---|
| Small | 47 (21 nodes / 26 links) | yes | ~220 ms |
| Large | 823 (379 / 444) | yes | ~3.5 s |
| Stress | 2000 (750 / 1250) | no | ~2.3 s |

*The timings above were measured before the demo moved to the
`@joint/router-avoid` package and still need re-measuring; treat them as
ballpark figures only.*

The first two are `example-1.json` / `example-2.json`, byte for byte the graphs
the JavaScript variant loads, so both variants stress the router with exactly
the same diagram.

The third is generated (`src/data/generate-graph.ts`) — as a saved file it would
be several megabytes. It is deterministic, so a routing time means something
across reloads. It routes *faster* than the large graph despite carrying three
times the links: without ports each shape has a single central connection pin
instead of one per port, and pin count is what Libavoid's cost is driven by.

## Running the application

This demo depends on JointJS+, which is published to a private npm registry. To
install it you need an access token — from a JointJS+ license or a
[free trial](https://www.jointjs.com/free-trial). Trial users receive the token
during sign-up; customers can find it in the customer portal at
https://my.jointjs.com.

`.npmrc` points `@joint` at the registry and reads the token from the
`JOINTJS_NPM_TOKEN` environment variable, so set that before installing:

**macOS / Linux**:
```sh
export JOINTJS_NPM_TOKEN="jjs-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**Windows (PowerShell)**:
```sh
$env:JOINTJS_NPM_TOKEN="jjs-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Then install and start the dev server:

```bash
npm install
npm run dev
```

Learn more about the [private npm registry here](https://docs.jointjs.com/learn/help-center/npm-registry).

## What this variant demonstrates

### Nodes are HTML

Nodes are React components (`src/components/render-node.tsx`) rendered through
`<Paper renderElement>`, not JointJS shape classes — and their content is plain
HTML, mounted by `<HTMLHost useModelGeometry>` into a `foreignObject`.

Going through HTML is what buys the card its layout. Flexbox places the badge,
the text column and the chevron, so no offset is hard-coded to the 344×80 box;
`text-overflow: ellipsis` truncates a long title with no JS; and the gradient
fill, `box-shadow` and `:hover` feedback are stylesheet lines rather than hand-
built geometry. Styling lives in `index.css`, so retheming the nodes touches no
TypeScript at all.

`useModelGeometry` is the flag that matters for a graph this size. Without it
`HTMLHost` runs `useMeasureElement` and syncs the measured box back to the
element — a `ResizeObserver` round trip for each of the 750 nodes between the
graph loading and the first route being computed. With it, the host reads
`width` / `height` straight off the model (`useCell(selectElementSize)`); these
cards are a fixed size per kind, written onto the model in `src/data/cells.ts`,
so there is nothing to find out.

Everything else downstream reads that same model geometry rather than the DOM:
the fit (`useModelGeometry: true`), the quad-tree spatial index, and virtual
rendering's viewport test — which matters, because with virtual rendering most
cells have no rendered box to measure in the first place.

`renderElement` receives the element's `data` slice only, so dragging a node
never re-runs the component — JointJS moves the rendered node itself.

### Virtual rendering

`<PaperScroller virtualRendering>` gives a view only to the cells inside the
viewport. Zoomed in on the stress graph that is a few dozen out of 2000, which
is the difference between a canvas that pans smoothly and one holding 750 React
subtrees and 1250 link paths at once.

It is read at mount only, which is one reason the app remounts the whole
`<Diagram>` when a different graph is chosen.

Virtual rendering is also why the pending-route look lives on the link's own
`attrs` (`src/routing/awaiting.ts`) rather than on a view highlighter: a link
scrolled off-screen has no view to hold one, and would come back without it.

### Spatial index

`<Diagram spatialIndex>` backs the graph with a `dia.SearchGraph` — a quad-tree
over element bounds. Every pointer gesture, and the viewport check virtual
rendering runs, is a spatial query; on 750 elements a linear scan for each is
what makes a large graph feel slow.

It is set to `{ isQuadTreeLazy: true }` rather than the eager default. Eager
reindexes each cell as it is written — dragging a node reindexes the node and
every link attached to it on every pointer move, and the routed reply then
reindexes each of the ~1250 links again as its vertices land, all before
anything asks a question. Lazy marks the tree dirty instead and rebuilds once,
on the next query. The write bursts here are large and the queries between them
are few, which is the shape lazy mode is for.

Worth knowing if you tune this: there is no per-write opt-out.
`SearchGraph`'s change handlers take only the cell, never the `set()` options,
so the levers are the mode itself, `invalidateQuadTree()` around a burst,
`setQuadTreeIndexFilter()` for which cells are indexed at all, and
`{ useIndex: false }` per query.

## How the routing works

All of the worker plumbing lives in the
[`@joint/router-avoid`](https://www.npmjs.com/package/@joint/router-avoid)
package. Started with `worker: true`, it spawns its own Web Worker, ships the
graph to it, keeps the two in step as cells are added, moved and reconnected
(debounced, so a drag costs one routing pass rather than one per pointer move),
and writes each route Libavoid computes straight back onto its link model.
`@joint/react-plus` is subscribed to the graph, so the canvas follows without a
single route passing through a React render.

What is left in the demo is one hook, `src/routing/use-avoid-router.ts`: it
calls `initAvoidRouter(graph, ...)`, wires up the service's events, seeds the
graph and calls `start()`. The seeding is deliberately deferred: the service
only exists once its worker has booted and loaded the wasm binary, and a link
rendered before then would be a bare straight line. Filling the graph right
before `start()` — in the same synchronous tick — means every link already
carries the service's interim orthogonal route by the time it is first drawn.
The events drive the two pieces of UI the package does not know about:

- `link:routing` / `link:routed` / `link:routing:cancelled` toggle the
  awaiting-update style on each link (`src/routing/awaiting.ts`) — a link is
  drawn dashed and faded while the router still owes it a route.
- `link:routing` (first of a pass) and `idle` (no link owed a route any more)
  bracket the timing readout the toolbar shows.

The paper draws links with the straight preset
(`src/components/diagram.tsx`), so the vertices the service writes — Libavoid's
own route, and the interim `rightAngle` fallback applied while Libavoid is
still computing — are drawn exactly as they came, with rounded corners. No
paper-side router reinterprets them, and no `router` attribute is ever set on
a link.

The hook owns the service for the lifetime of the `<Diagram>`; the app remounts
the whole diagram when a different graph is chosen, and `destroy()` on unmount
terminates the worker.

### The `.wasm` file

Libavoid is WebAssembly, and the package's worker has to be handed the URL of
the binary — a worker has no `document` to derive it from. `libavoid-js` does
not export `dist/libavoid.wasm` as a subpath, so `vite.config.ts` locates the
file next to the package entry point and aliases it, letting `?url` treat it as
an ordinary asset: hashed and emitted by the build, served from `node_modules`
in dev. The hook passes that URL to `initAvoidRouter` as `libavoidFilePath`,
and the package forwards it into its worker, where Libavoid loads it.

Shipping the `.wasm` as a separate file (rather than inlined into a JS bundle)
is also what the library's LGPL license expects: the Libavoid binary stays a
distinct, replaceable artifact.

`vite.config.ts` additionally excludes `@joint/router-avoid` from
`optimizeDeps`: the package spawns its worker with
`new Worker(new URL(...))` relative to its own module, and prebundling would
flatten that module away. It also adds `@joint/core` to `resolve.dedupe` — the
core arrives both through `@joint/plus` and through `@joint/router-avoid`, and
two copies would break every `instanceof` check between the router service and
the app's cells.

## Differences from the JavaScript variant

- Panning is the `<PaperScroller>`'s (drag the background, wheel to scroll,
  pinch to zoom) with explicit zoom controls, in place of the JS variant's
  click-to-fit and rubber-band-zoom gestures.
- The paper uses the straight link-routing preset with rounded corners, so the
  vertices the router service writes — Libavoid's own and the interim
  `rightAngle` fallback alike — are drawn straight through. The JS variant
  configures an equivalent connector on the paper directly.
- The awaiting-update style lives on the link models' `attrs` rather than on a
  view highlighter, because of virtual rendering (see above); the JS variant
  highlights the mounted link views directly.
