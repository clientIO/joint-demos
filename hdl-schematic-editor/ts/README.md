# JointJS+: HDL Schematic Editor (TypeScript) <a href="https://www.jointjs.com/jointjs-plus"><img src="../../jointjs-plus-badge.svg" alt="JointJS+" width="123" align="right" /></a>

HDL Schematic Editor is a JointJS+ demo application that lets you edit a [Yosys](https://yosyshq.net/yosys/) JSON netlist as a schematic diagram.

- Load a netlist produced by Yosys (e.g. `yosys -p "prep -top top; write_json netlist.json" design.v`) or start a new one. A loaded netlist is laid out with ELK (`@joint/layout-elk`).
- Drag ports, constants and cells from the stencil and move them freely. The wires are routed with libavoid (`@joint/router-avoid`) and rerouted while you move the shapes.
- Add cells from the output and input port menus, insert cells on wires, connect ports by dragging, change cell types and parameters in the inspector.
- Click **Auto layout** in the toolbar to arrange the whole diagram with ELK (it can be undone).
- The Yosys JSON of the module is displayed (and kept in sync) in the collapsible panel at the bottom of the right sidebar (click its header to expand it). Save it to continue in the Yosys flow (e.g. `yosys -p "read_json netlist.json; ..."`). Yosys JSON has no place for the positions, so they are not saved.

## Architecture

The application is built on the same architecture as the [Workflow Builder](../../workflow-builder/ts/) demo:

- `src/system` - the app-agnostic engine. The diagram data (the source of truth, including the node positions) is converted into the JointJS graph every time the data changes. Undo/redo works on the data. The ELK layout runs on demand (`autoLayout: false`).
- `src/yosys` - the conversion between the Yosys JSON and the diagram data. Bit vectors are analyzed to create wires, bus splits, joins and constants (`import.ts`) and net bits are allocated back from the wires (`export.ts`).
- `src/registry` - the cell registry. Every supported Yosys cell type is described by a single definition (ports, parameters, shape, Yosys parameter mapping). To support another cell type, add a definition to `src/registry/index.ts`. Cells without a definition are displayed as generic blocks and exported unchanged.
- `src/diagram` - the schematic shapes (gates, operators, multiplexers, registers, module ports, constants, bus split/join and generic blocks).
- `src/features/Stencil.ts` - the stencil with all the shapes. A dropped shape becomes a node of the diagram data.
- `src/features/avoid-router.ts` - the wire routing. The wires of a net share their path from the output port, the junction dots are drawn where they split (`src/actions/wire-actions.ts`).

The avoid router depends on `libavoid-js`, a WebAssembly build of libavoid licensed under LGPL-2.1-or-later. The `libavoid.wasm` binary is served as a separate file (see `webpack.config.js`).

## How to download this demo

You can download this demo using our [`@joint/cli` tool](https://www.npmjs.com/package/@joint/cli):

```bash
npx @joint/cli download hdl-schematic-editor/ts
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
npm start
```
