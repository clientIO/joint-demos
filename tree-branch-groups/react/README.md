# JointJS+: Tree Layout with Branch Groups (React) <a href="https://www.jointjs.com/jointjs-plus"><img src="../../jointjs-plus-badge.svg" alt="JointJS+" width="123" align="right" /></a>

A tree laid out by `layout.TreeLayout` in which a node can be a *branch group*: a container with a start node, two branches and an end node the branches converge into. The tree connects to the group as a single node, so a fork/join subgraph — which a tree layout cannot handle on its own — fits into the tree. Groups nest and collapse. Built with `@joint/react-plus`.

![The initial tree: a branch group with a nested branch group, both expanded](../screenshot.png)

## Features

- **Branch groups in a tree** -- a group is one node of the tree: the outer links connect to the group element, not to the start and end nodes inside it. The group is sized so that its top center is the top center of its start node and its bottom center is the bottom center of its end node, and it is drawn as a translucent slab -- the tree appears to connect to the start and end nodes directly.
- **Bottom-up layout** -- every group is laid out on its own with `treeLayout.layoutTree(start)`, then sized from its start to its end node, the deepest groups first. The outer tree is laid out last, once the size of every group is known.
- **Converging branches** -- the tree layout only knows trees, so the end node is excluded from the layout of a group with the `filter` option. It is then placed below the branches and joined to them by a horizontal bar that mirrors the vertices the tree layout draws below a parent.
- **Nested, collapsible groups** -- a branch node can be a group itself. A collapsed group shrinks to a labelled node-sized slab and hides its content (the `cellVisibility` prop of the `<Paper>`); the tree is laid out again around it.
- **Editing** -- hover a node to add a child node or a branch group below it. The end node of a group stands in for its group: what is added below it continues the tree from the group.
- **React-rendered elements, two models** -- the nodes and the groups are two `ElementModel` subclasses (`tbg.Node`, `tbg.Group`) whose state lives in `data`. The `renderElement` callback of `<Paper>` renders a `<Cell>` that reads the model type with `useCell(selectCellType)` and picks `<NodeView>` or `<GroupView>`; both read their size and `data` with `useCell()` too. The links keep their JointJS markup. The imperative parts -- the layout and the element tools -- run against the `dia.Paper` and `dia.Graph` that `usePaper()` and `useGraph()` expose.

## Controls

| Action | Result |
|--------|--------|
| Hover a node, click `+` | Add a child node |
| Hover a node, click the fork button | Add a branch group as a child |
| Hover the end node of a group | The same buttons, acting on the group |
| The `-` / `+` button in the top right corner of a group | Collapse or expand the group |

## Project Structure

| File | Description |
|------|-------------|
| `src/main.tsx` | App entry point -- styles and the React root |
| `src/app.tsx` | `<Diagram>` and `<Paper renderElement>`, plus the headless `<Editor>` that seeds the diagram, runs the layout and wires the events (a group's `data.collapsed` change, hover tools) |
| `src/render-element.tsx` | The `renderElement` callback -- renders `<Cell>` |
| `src/cells.tsx` | `<Cell>` picks the component by `useCell(selectCellType)`; `<NodeView>` is a labelled rectangle (a pill for start/end), `<GroupView>` is the translucent slab with the collapse button, expanded around its content or shrunk to a labelled node |
| `src/shapes.ts` | The `Node` and `Group` models (`ElementModel` subclasses with typed `data`), the JointJS `Link`, and the layout metrics |
| `src/layout.ts` | The bottom-up layout: one `TreeLayout` pass per expanded group, then one for the outer tree. Also the visibility predicate shared with the paper |
| `src/actions.ts` | Adds a child node or a branch group below an element, keeping the new cells embedded in the enclosing group |
| `src/tools.ts` | The hover tools -- two `elementTools.Button`s |
| `src/index.css` | Page layout and the collapse button hover |

`layout.ts` and `actions.ts` are the same files as in the [TypeScript version](../ts/); `shapes.ts` keeps the same model API on top of `ElementModel`.

## How It Works

1. A group embeds its start node, its two branch nodes, its end node and the four inner links (`start → a`, `start → b`, `a → end`, `b → end`). The outer links (`parent → group`, `group → child`) are attached to the group element.
2. `runLayout()` sorts the expanded groups by depth, deepest first. For each of them a fresh `TreeLayout` lays out the tree that grows from the start node. Its `filter` drops the end node, so the two branches stay a tree, and its `updatePosition` moves elements with `{ deep: true }`, so a nested group carries its content along.
3. The end node is placed below the bounding box of that tree (`treeLayout.getLayoutArea(start)`) on the vertical axis of the start node, and the links into it get two vertices forming a horizontal bar. The group is then positioned and sized by hand: from the top of the start node to the bottom of the end node, symmetric around that axis. With the `bbox` connection point on the model geometry (`useModelGeometry`), the outer links meet the group exactly where the start and end nodes are.
4. A collapsed group skips all of that and is resized to a node-sized slab. The paper's `cellVisibility` hides every cell that has a collapsed ancestor, and every link whose end is hidden.
5. Finally the outer tree is laid out from the root with `layoutTree(root)`. `layout()` is not used, because it would start a tree from every source of the graph -- including the start node of every group. The paper is then scaled to fit the visible content.
6. In React, all of this happens in the headless `<Editor>` component rendered inside `<Paper>`. A layout effect seeds the diagram once and runs the layout. The collapse button in `<GroupView>` calls `group.toggle()`, which writes `data.collapsed`; `useOnGraphEvents({ 'change:data' })` in the editor lays the tree out again. `useOnPaperEvents()` handles the hover events, adding the `dia.ToolsView` imperatively to the hovered view.

## Running the Demo

Set the `JOINTJS_NPM_TOKEN` environment variable to your JointJS+ npm token (see the `.npmrc` file), then:

```
npm install
npm run dev
```
