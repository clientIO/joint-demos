# JointJS+: Electronic System Designer (React) <a href="https://www.jointjs.com/jointjs-plus"><img src="../../jointjs-plus-badge.svg" alt="JointJS+" width="123" align="right" /></a>

An **electronic system designer** built with
[`@joint/react-plus`](https://docs.jointjs.com/react): design a 24 V industrial
sensor gateway from functional blocks, drill into pins and connectors,
review the rule check's design suggestions, trace nets across boards, watch
the animated operating values, and export engineering documentation.

Three synchronized views over one design document:

| View | What it shows |
| --- | --- |
| **Architecture** | Subsystem blocks joined by typed interface bundles (power, I²C, UART, RS-485, Ethernet…) — double-click a bus to expand it into its signals |
| **Connectivity** | The pin-level schematic: parts with real pin names/numbers, nets, junction dots, board outlines, an off-page harness tag on the field connector |
| **Outputs** | Always-current documents, BOM first (with datasheet links): connector pinouts, wire list, netlist, connection matrix, design suggestions, CSV/netlist/JSON export |

The example design has three deliberate issues (a 5 V device on a 3.3 V input,
a missing RS-485 termination, two signals on one MCU pin). The rule check raises
each as a **suggestion** with a one-click fix. Suggestions never block the
design: the engineer decides what applies.

The demo is written to be read: it shows one way to structure a real
EDA-flavored application on top of the JointJS+ React API.

## Running the application

The `@joint/*` packages are hosted on the JointJS+ private npm registry, so you need a license (or [free trial](https://www.jointjs.com/free-trial)) token first. This example's `.npmrc` reads it from the `JOINTJS_NPM_TOKEN` environment variable:

```bash
export JOINTJS_NPM_TOKEN="jjs-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

(PowerShell: `$env:JOINTJS_NPM_TOKEN="jjs-..."`.) See the [npm registry help page](https://docs.jointjs.com/learn/help-center/npm-registry) for details on obtaining a token.

Then:

```bash
npm install
npm run dev        # start the app
npm test           # typecheck + lint + unit tests
```

Other scripts: `npm run build` (production build into `dist/`), `npm run preview`, `npm run typecheck`, `npm run lint`.

## What it demonstrates

| Feature | Where |
| --- | --- |
| One domain document (zustand) driving TWO controlled canvases | `src/state/designer-store.ts`, `src/views/` |
| Cells DERIVED from the domain + write-backs for every canvas edit | `src/views/arch-cells.ts`, `src/views/sch-cells.ts` |
| Pure-SVG symbol library driven by the part catalog | `src/model/catalog.ts`, `src/symbols/` |
| Custom wires via `renderLink` + `useLinkLayout` (interface colors, net labels, flow/activity overlays) | `src/canvas/render-*.tsx` |
| Pin-accurate connections on native JointJS ports (pins and interface ports), interface-group expansion | `src/symbols/port-markup.ts`, `src/views/sch-cells.ts`, `src/views/arch-cells.ts` |
| Obstacle-avoiding wiring (`@joint/router-avoid`, libavoid in a Web Worker) on the connectivity sheet, routes remembered across view switches, re-pinning ends; architecture bundles are manhattan-routed | `src/canvas/use-avoid-routing.ts`, `src/views/router-anchors.ts`, `src/canvas/wire-end-tools.tsx` |
| Electrical rule checks surfaced as suggestions, with data-driven fixes (voltage, pin conflicts, termination, bus width…) | `src/model/validation.ts` |
| Operating-point solver behind the animation (rails, levels, currents) | `src/model/operating.ts` |
| Click-to-trace a net across BOTH views; net renaming in the inspector | `src/state/designer-store.ts`, `src/canvas/canvas.tsx` |
| Bus expansion/collapse (double-click a bundle, or the inspector button) | `src/views/arch-cells.ts`, `src/canvas/render-arch.tsx` |
| Headless **Stencil** palette with search + keyboard placement | `src/palette/palette.tsx` |
| Navigator minimap drawing real symbol silhouettes + colored wires | `src/canvas/navigator-style.ts` |
| Domain-level undo/redo (drag-coalesced) + the design surviving a reload | `src/state/designer-store.ts` |
| Generated outputs (BOM, pinouts, wire list, netlist, matrix, CSV/netlist/JSON) | `src/model/outputs.ts`, `src/outputs/outputs-view.tsx` |
| PNG export (`useImageExport`) | `src/canvas/navigator-panel.tsx` |
| Unit-tested engines (`npm test`) | `src/model/*.test.ts`, `src/views/`, `src/state/` |
| Keyboard + screen-reader support (focusable cells, live announcements) | `src/canvas/`, `src/components/ui/announcer.tsx` |

## How state flows

```
                 ┌──────────────────────────────┐
                 │  zustand store: Design       │  subsystems · components ·
                 └──────────┬───────────────────┘  wires · bundle vertices
              derive() on every change
                  │
   nets ── operating ── findings(+fixes) ── flags ── bundles
                  │                                    │
        archCells ┴ schCells        (identity-preserving projections)
                  │
   <Diagram cells onCellsChange>    ← one per view, CONTROLLED
                  │
   <Paper renderElement renderLink> ← SVG symbols + wires read state
                  │                    from the store per cell id
   palette / inspector / outputs    ← same store, same truth
```

Every canvas edit flows back through a write-back that patches the Design
(moves, drawn wires, re-pinned ends, template drops, deletions); everything else —
the other canvas, the validation, the outputs — re-derives. The two views can
never disagree because neither owns any structure.

## Reading the sheet (10 seconds)

- **Wire color = interface**: red power, green I²C, violet UART, blue
  Ethernet, amber RS-485; grounds stay quiet.
- **Junction dot** = joined pins; **jump-over arc** = plain crossing.
- **⚠ badge** = a design suggestion names this cell; open the panel and use
  the fix button, or Locate to trace the net in question.
- **Lens mark on a wire** = one half of a differential pair (RS-485, CAN);
  hover it for the routing note.
- **Click any wire** to trace its whole net across both views; blank-click
  or the pill's ✕ clears it.
- **See animation** (pulse icon): rails and levels print on the nets, flow
  dots ride the power path, protocol buses tick, the status LED lights.
