# JointJS+ SCADA Editor — React

React version of the SCADA editor demo, built with [`@joint/react-plus`](https://docs.jointjs.com/react).

Draw a plant (pumps, valves, boilers, tanks, instruments, generators and the pipes and wires between them) and press **Run**: a simulated plant brings it to life. Pumps spin, burners fire, levels and gauges follow the process, alarms ring, and the operator works the equipment from the diagram or the controls panel while a log records what the plant reports.

The equipment is drawn as React SVG components in the shaded-metal look of the TypeScript version; everything around it is composed from `@joint/react-plus` components (`<Diagram>`, `<Paper>`, `<PaperScroller>`, `<Selection>`, `<Snaplines>`, `<Navigator>`, `<Stencil>`) and hooks.

> This version uses the declarative graph layers of `@joint/react` (`initialLayers`), which come with its next release. Until then it builds against the development versions of the packages.

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
- `npm run lint` — ESLint
- `npm test` — typecheck, lint and the unit tests of the plant simulation

## How it is built

The React version of the TypeScript SCADA editor (`../ts`), feature for feature: the same shapes, examples, settings and run mode, and the same diagram file format - a diagram saved by one opens in the other.

- **The shapes** - `src/shapes/`: every element of the palette (88) as a React SVG drawing per palette group, its spec (`define-shape.ts`: size, ports, flip, control, layer, colors) beside it. `shape-node.tsx` draws an element: its pipe stubs and terminals, its drawing (the directional parts mirrored when flipped), its label on the side chosen, horizontal on a rotated shape. `surface.tsx` paints the shaded or flat metal in the shape's color, `shapes.css` holds the colors of both themes.
- **The connections** - `src/connections/`: pipes, wires, signal lines, arrows and conveyors are native links, their look made from their data.
- **The editor** - `src/scada-app.tsx` wraps it in `<Diagram>` with five graph layers, undo/redo and a clipboard; `src/editor/`: the canvas (`<Paper>`, `<PaperScroller>`, `<Selection>`, `<FreeTransform>`, `<Snaplines>`, `<Navigator>`), the palette (`<Stencil>`), the inspector, the settings, the context menus, Find, groups.
- **Run mode** - `src/runtime/` and `src/plant/`: the simulated plant writes its values by tag (`setCellData(..., { skipHistory: true })`), the controls send commands it confirms, the log lists both.
- **Files** - `src/files/`: the diagram file (the examples in `src/diagrams/` are the TypeScript version's), checked before anything changes.

To connect a real plant, replace the mock in `src/plant/mock/` with your transport (WebSocket, MQTT, OPC UA gateway): apply each `tag, property, value` update the way `PlantSession` does, and send the operator's commands from it.
