# JointJS+: Level of Detail (React) <a href="https://www.jointjs.com/jointjs-plus"><img src="../../jointjs-plus-badge.svg" alt="JointJS+" width="123" align="right" /></a>

A 1,200-node service map where every node swaps its rendering for a cheaper one as you zoom out: a full HTML card at reading zoom, a plain SVG chip in the middle, and a single tinted rectangle when the whole map is on screen. Built with `@joint/react-plus`.

![screenshot](../screenshot.png)

## The idea

Virtual rendering controls **how many** cells are mounted. Level of detail controls **how much each mounted cell renders**. They solve different halves of the same problem, and the second half is the one that survives zooming out: frame the whole map and every one of the 1,200 nodes really is inside the viewport, so there is nothing for virtual rendering to skip. What each node costs to draw is all that is left to change.

The switch is one hook:

```tsx
const level = usePaperScrollerViewport(selectDetailLevel);
```

`selectDetailLevel` returns one of three strings, and that is what makes it cheap. The viewport store notifies on every wheel tick and every pan frame, but `usePaperScrollerViewport` compares the selected value with `Object.is` and bails out when it is unchanged — so a node re-renders when it **crosses** a threshold, and at no other point during a pinch. Selecting the raw `zoom` number instead would re-render every mounted node on every frame.

## Features

- **Three levels, one size.** `ServiceCard` (HTML, `≥ 60%`), `ServiceChip` (SVG, `≥ 25%`), `ServiceBlock` (one `<rect>`, below that). The level changes what a node *draws*, never how big it is: the size lives on the model, so the links, the quad-tree index and virtual rendering's viewport test all keep working on geometry that never moves.
- **Link ends read the model, not the DOM.** `defaultAnchor` / `defaultConnectionPoint` with `useModelGeometry`, through the `<Paper options>` escape hatch. Without them a link end would measure the element view — an HTML card at one zoom, a bare `<rect>` at another — and shift as the level changed.
- **`useModelGeometry` on the HTML level.** `<HTMLHost useModelGeometry>` takes the card's box straight off the graph element instead of measuring the rendered content — no `ResizeObserver` round trip per node, and the box is identical to the one the two SVG levels draw into, so switching levels never resizes a node or drags a link end with it.
- **Links are a level of detail too.** Below 25% they are not drawn at all, through `<Paper cellVisibility>` — which `<PaperScroller>` composes with its own viewport test automatically. At `Fit` all 1,600 of them are in the viewport, so virtual rendering would otherwise mount every one, and at that scale a 1px line is a grey haze that hides the status colours.
- **Draggable nodes.** JointJS moves the rendered node itself, without React — dragging one never re-runs `RenderNode`.
- **A detail picker that pins a level.** Pin `Card` and hit `Fit`: the HUD's node count jumps by an order of magnitude while the element count does not move. Pin `Block` and zoom in to see the floor it can't go below.
- **Composes with the other two performance features.** `<Diagram spatialIndex>` (a lazy quad-tree — virtual rendering asks "which cells are in the viewport?" every frame) and `<PaperScroller virtualRendering>`.
- **A plain-JointJS sibling.** The [TypeScript version](../ts/) builds the same map without React, with a custom `dia.ElementView` and flagged updates instead of a hook.
- **An honest readout.** The HUD shows zoom, the level in force, how many elements are drawn (what virtual rendering controls) and how many DOM nodes they add up to (what the level of detail controls). It subscribes with two primitive selectors rather than one destructured viewport object, so it does not re-render on every pixel of a pan.
- **A seeded graph.** 1,200 nodes and ~1,600 links, generated from a fixed seed — the same map on every load, and the same map the TypeScript version builds.

## Controls

| Action | Result |
|--------|--------|
| Drag the canvas / scroll | Pan |
| Ctrl/⌘ + wheel, pinch | Zoom — watch the level in the HUD change at 60% and 25% |
| Drag a node | Move it — JointJS moves the rendered node, React is not involved |
| `+` / `−` / `Fit` | Zoom in, out, or frame the whole map |
| The **Detail** picker | Follow the zoom (`Auto`), or pin one level for all nodes |

## Project Structure

| File | Description |
|------|-------------|
| `src/main.tsx` | App entry point — styles and the React root |
| `src/app.tsx` | Generates the graph once, owns the detail-mode state, and puts it in context above `<Diagram>` |
| `src/detail.ts` | **The level-of-detail policy**: the `DetailLevel` type, the thresholds, and `selectDetailLevel` |
| `src/detail-context.ts` | The toolbar's detail picker, read by every node |
| `src/components/render-node.tsx` | **The switch**: `usePaperScrollerViewport(selectDetailLevel)` picks one of the three components |
| `src/components/service-card.tsx` | High detail — the whole record as HTML, in an `<HTMLHost useModelGeometry>` |
| `src/components/service-chip.tsx` | Medium detail — a rect, a stripe and two text runs, in plain SVG |
| `src/components/service-block.tsx` | Low detail — one `<rect>`, tinted by status |
| `src/components/diagram.tsx` | `<Diagram spatialIndex>` → `<PaperScroller virtualRendering>` → `<Paper renderElement>` |
| `src/components/hud.tsx` | Zoom / level / element + node counts over the canvas |
| `src/components/toolbar.tsx` | The detail picker and the size of the graph |
| `src/components/zoom-controls.tsx` | Zoom in / out / fit |
| `src/data/cells.ts` | The `NodeData` slice, the one node size, and the record factories |
| `src/data/generate-graph.ts` | The seeded 1,200-node grid and its links |
| `src/theme.ts` | The palette values the SVG levels and the paper need in TypeScript |
| `src/index.css` | Page chrome, the HTML card, and the HUD |

## How It Works

1. `generateGraph()` builds 1,200 element records and ~1,600 link records from a fixed seed. Every element carries the same `size` — the box all three levels draw into — and a `data` slice with the service's name, group, region, latency, load and status.
2. `<Diagram initialCells spatialIndex={{ isQuadTreeLazy: true }}>` seeds the graph uncontrolled: nothing in this demo edits a cell, so the graph owns its cells after the first render and the only thing that ever changes is the viewport. The index is lazy because the graph is written once and then only queried.
3. `<PaperScroller virtualRendering>` mounts only the cells inside the viewport. At 100% zoom that is a dozen nodes out of 1,200; at `Fit` it is all of them.
4. `<Paper renderElement={RenderNode}>` renders each mounted element. `RenderNode` receives the element's `data` slice and nothing else, so it never re-runs when the paper pans — JointJS moves the rendered node itself, without React.
5. `RenderNode` calls `usePaperScrollerViewport(selectDetailLevel)` and switches on the result. The detail-mode context can override it, which is what the toolbar's picker writes to.
6. `<Paper cellVisibility>` hides every link below 25%; `<PaperScroller>` composes it with the viewport check and re-runs it on the paper's `transform` event, so the links come back by themselves on the way in.
7. The card renders through `<HTMLHost useModelGeometry>`; the chip and the block are plain SVG and read their box with `useCell(selectElementSize)` — the same box, from the same model.

## What level of detail actually buys

Worth being precise, because the obvious measurement is the wrong one.

**It does not show up in the frame rate while panning.** JointJS pans by transforming the SVG root, so a pan re-renders nothing — panning is a flat 60fps at every level, cards included. That is why this demo has no FPS meter.

Where it shows up is **layout and paint**: the same 1,200 elements are 1,200 DOM nodes as blocks and an order of magnitude more as cards, and that is what the browser has to lay out and rasterize on every zoom step. The [TypeScript version](../ts/#what-level-of-detail-actually-buys) has measured numbers for its SVG levels — layout time runs 4× across the three, while script time (the paper's view management, which is what *virtual rendering* addresses) stays flat.

## Running the Demo

To run this application you need to have access to the JointJS+ package. You can get it by having a JointJS+ license or by starting a [free trial](https://www.jointjs.com/free-trial).

If you are a trial user, you received your access token during the trial sign-up process.
If you are a customer, log in to the customer portal at https://my.jointjs.com to obtain your access token.

This example uses the `.npmrc` file to set up access to the JointJS+ private npm registry. By default it reads the authentication token from the `JOINTJS_NPM_TOKEN` environment variable, which you can set in your terminal or CI environment:

**macOS / Linux**:
```sh
export JOINTJS_NPM_TOKEN="jjs-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**Windows (PowerShell)**:
```sh
$env:JOINTJS_NPM_TOKEN="jjs-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Learn more about our [private npm registry here.](https://docs.jointjs.com/learn/help-center/npm-registry)

After setting up access to the JointJS+ package, install the dependencies and start the dev server:

```bash
npm install
npm run dev
```
