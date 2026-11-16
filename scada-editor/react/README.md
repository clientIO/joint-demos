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

- **The diagram** — `src/app.tsx` wraps the editor in `<Diagram>` with five graph layers (background, pipes, equipment, instruments, foreground), undo/redo and a clipboard.
- **The equipment** — `src/shapes/`: `catalog.ts` lists every kind (size, stubs, controls), `equipment-node.tsx` draws an element (stubs, shaded body, label) and `symbols/` holds a React component per kind with its run-mode animations in CSS.
- **The plant** — `src/plant/simulate.ts` is one pure step of the plant (flow traced from pumps through open valves into tanks, pressures, levels, readings, alarms), `use-plant.ts` runs it while the editor is in run mode and restores the diagram afterwards.
- **The editor** — `src/editor/`: the palette (drag, or Enter to add), the inspector, the context menus, the controls and the log.

To connect a real plant, replace the timer in `use-plant.ts` with your transport (WebSocket, MQTT, OPC UA gateway): write each update into the diagram with `setCellData(id, data, { skipHistory: true })`, and send the operator's commands from `sendCommand`.
