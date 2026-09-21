# JointJS+: Tree Layout with Forks and Loops (React) <a href="https://www.jointjs.com/jointjs-plus"><img src="../../jointjs-plus-badge.svg" alt="JointJS+" width="123" align="right" /></a>

A tree laid out by `layout.TreeLayout` in which a node can be a *group*: a container with a start node, some content and an end node. A *fork group* holds two branches that converge into the end node — a fork/join. A *loop group* holds a tree whose end node links back to the start node — a cycle, drawn as a dashed return link up the left side of the group. The tree connects to a group as a single node, so subgraphs that a tree layout cannot handle on its own fit into the tree. Groups nest and collapse. Built with `@joint/react-plus`.

![The initial tree: a fork group with a nested fork group and a loop group, all expanded](../screenshot.png)

## Features

- **Groups in a tree** -- a group is one node of the tree: the outer links connect to the group element, not to the start and end nodes inside it. The group is sized so that its top center is the top center of its start node and its bottom center is the bottom center of its end node, and it is drawn as a translucent slab -- the tree appears to connect to the start and end nodes directly.
- **Bottom-up layout** -- every group is laid out on its own with `treeLayout.layoutTree(start)`, then sized from its start to its end node, the deepest groups first. The outer tree is laid out last, once the size of every group is known.
- **Converging branches** -- the tree layout only knows trees, so the end node is excluded from the layout of a group with the `filter` option. It is then placed below the branches and joined to them by a horizontal bar that mirrors the vertices the tree layout draws below a parent.
- **Loops** -- a loop group holds a tree like a fork group does, and its end node links back to its start node: the return link, dashed as it runs against the flow, routed by hand out of the end node to the left, up the side of the group outside of its box and into the start node. The tree layout treats it as a link like any other: it only follows the outbound links of the tree, and the end node is excluded, so the cycle never reaches it. An expanded loop asks the tree layout for extra room on both sides (the `prevSiblingGap` and `nextSiblingGap` attributes of the element), so whatever the layout puts next to it - a sibling, or the subtree of an uncle - keeps clear of the return link; both sides, so that a lone loop stays centered below its parent.
- **Nested, collapsible groups** -- a node of a branch or of a loop can be a group itself, of either kind. A collapsed group shrinks to a node-sized slab labelled with its kind and hides its content (the `cellVisibility` prop of the `<Paper>`), the return link of a loop included; the tree is laid out again around it.
- **Editing** -- hover a node to add a child node, a fork group or a loop group below it. The end node of a group stands in for its group: what is added below it continues the tree from the group.
- **React-rendered elements, two models** -- the nodes and the groups are two `ElementModel` subclasses (`Node`, `Group`) whose state lives in `data`. The `renderElement` callback of `<Paper>` renders a `<Cell>` that reads the model type with `useCell(selectCellType)` and picks `<NodeView>` or `<GroupView>`; both read their size and `data` with `useCell()` too. The links keep their JointJS markup. The imperative parts -- the layout and the element tools -- run against the `dia.Paper` and `dia.Graph` that `usePaper()` and `useGraph()` expose.

## Controls

| Action | Result |
|--------|--------|
| Hover a node, click `+` | Add a child node |
| Hover a node, click the fork button | Add a fork group as a child |
| Hover a node, click the loop button | Add a loop group as a child |
| Hover the end node of a group | The same buttons, acting on the group |
| The `-` button on the bottom edge of the start node of a group, the `+` on a collapsed group | Collapse or expand the group |

## Project Structure

| File | Description |
|------|-------------|
| `src/main.tsx` | App entry point -- styles and the React root |
| `src/app.tsx` | `<Diagram>` and `<Paper renderElement>`, plus the headless `<Editor>` that seeds the diagram, runs the layout and wires the events (a group's `data.collapsed` change, the hover tools) |
| `src/render-element.tsx` | The `renderElement` callback -- renders `<Cell>` |
| `src/cells.tsx` | `<Cell>` picks the component by `useCell(selectCellType)`; `<NodeView>` is a labelled rectangle (a pill for start/end), `<GroupView>` is the translucent slab, expanded around its content or shrunk to a node labelled with the kind of the group |
| `src/shapes.ts` | The `Node` and `Group` models (`ElementModel` subclasses with typed `data`; a group's `data.kind` is fork or loop), the JointJS `Link` (dashed for the return link of a loop), and the layout metrics |
| `src/layout.ts` | The bottom-up layout: one `TreeLayout` pass per expanded group, then one for the outer tree; the route of the return link of a loop and the room kept for it. Also the visibility predicate shared with the paper |
| `src/actions.ts` | Adds a child node or a group of either kind below an element, keeping the new cells embedded in the enclosing group |
| `src/tools.ts` | The toggle of a group - an `elementTools.Button` on the group, shown all the time, drawn on the bottom edge of its start node - and the three add buttons of a hovered element |
| `src/index.css` | Page layout |

`layout.ts` and `actions.ts` are the same files as in the [TypeScript version](../ts/); `shapes.ts` keeps the same model API on top of `ElementModel`.

## How It Works

1. A group embeds its start node, its content, its end node and the inner links: for a fork group two branch nodes and four links (`start → a`, `start → b`, `a → end`, `b → end`); for a loop group one node, `start → a`, `a → end` and the return link `end → start`. The outer links (`parent → group`, `group → child`) are attached to the group element.
2. `runLayout()` first gives every expanded loop group a `prevSiblingGap` and a `nextSiblingGap`, the room its return link takes outside of its box. It then sorts the expanded groups by depth, deepest first. For each of them a fresh `TreeLayout` lays out the tree that grows from the start node. Its `filter` drops the end node, so the two branches stay a tree, and its `updatePosition` moves elements with `{ deep: true }`, so a nested group carries its content along.
3. The end node is placed below the bounding box of that tree (`treeLayout.getLayoutArea(start)`) on the vertical axis of the start node, and the links into it get two vertices forming a horizontal bar. The group is then positioned and sized by hand: from the top of the start node to the bottom of the end node, symmetric around that axis. With the `bbox` connection point on the model geometry (`useModelGeometry`), the outer links meet the group exactly where the start and end nodes are. The return link of a loop gets two vertices a gap left of the box of the group, on the levels of the end and the start node: it leaves the end node to the left and enters the start node from the left.
4. A collapsed group skips all of that and is resized to a node-sized slab. The paper's `cellVisibility` hides every cell that has a collapsed ancestor, and every link whose end is hidden.
5. Finally the outer tree is laid out from the root with `layoutTree(root)`. `layout()` is not used, because it would start a tree from every source of the graph -- including the start node of every group. The paper is then scaled to fit the visible content.
6. In React, all of this happens in the headless `<Editor>` component rendered inside `<Paper>`. A layout effect seeds the diagram once and runs the layout. The toggle of a group, an element tool put on the group's view after every layout (`addTools()` in `tools.ts`), calls `group.toggle()`, which writes `data.collapsed`; `useOnGraphEvents({ 'change:data' })` in the editor lays the tree out again. `useOnPaperEvents()` handles the hover events, adding and taking off the add buttons of the hovered view (`updateTools()`) while the toggle stays.

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
