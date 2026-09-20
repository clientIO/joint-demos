# JointJS+: Tree Layout with Branch Groups (React) <a href="https://www.jointjs.com/jointjs-plus"><img src="../../jointjs-plus-badge.svg" alt="JointJS+" width="123" align="right" /></a>

A flowchart-like editor built with `@joint/react-plus`: a tree laid out by `layout.TreeLayout` in which a node can be a *group*: a container with a start node, some content and an end node. A *fork* holds branches that converge into the end node -- a fork/join. A *loop* holds a tree that grows down on the right and a return link that climbs back up on the left, from the end node to the start node. The tree connects to a group as a single node, so subgraphs that a tree layout cannot handle on its own fit into the tree. Groups nest and collapse. The data is the source of truth; React renders the elements as HTML.

![The initial diagram: a CI/CD pipeline with a fork of parallel jobs, a decision on the target and a loop polling the smoke tests](../screenshot.png)

## Features

- **The data is the source of truth** -- the diagram is a flat map of nodes by id (`data/types.ts`): a `start`, `step`s with a label and a `run` command, `decision`s, `fork`s and `loop`s with their `branches`, `end`s; every node but an end lists what it leads `to`, an edge per child, named where the child is an option; a node may carry a `comment`. Held by `DiagramData`, an `mvc.Model` with one attribute per node, and translated into the graph by `buildGraph()` (`data/build.ts`) after every edit: an element per node, and everything the structure implies -- the gates and the inner links of a group, the return link of a loop, the link from every leaf inside a group to the end of the group, the add button below every leaf outside -- under fixed ids, so that `graph.syncCells()` updates the cells that stand for the same thing and adds or removes the rest. A `dia.CommandManager` on the data model records every edit: undo and redo set the data back, and the graph follows.
- **React renders every element** -- the models are `ElementModel` subclasses of `@joint/react` (`Step`, `Decision`, `GroupStart`, `GroupEnd`, `Start`, `End`, `AddButton`, and the never-rendered `Group`), with what a component renders in their `data` and no markup of their own. The `renderElement` callback of `<Paper>` renders a `<Cell>` that reads the type of the model with `useCell(selectCellType)` and picks the component: a pill for a step, a decision or the start of a group, a circle for the start and the ends of the diagram, a square for an add button. Each is plain HTML in an `HTMLHost` -- the label, the `run` line as code, the buttons on the edges of a pill -- styled by the stylesheet.
- **Measured, then laid out** -- an `HTMLHost` measures what it renders and sizes the element to it: a pill is as wide as its label needs and as tall as its lines, the size of a node at least (a minimum in the stylesheet). `useOnElementsMeasured` runs the layout once the sizes are in, and fits the diagram into the view the first time. The store reports every change of a size, the layout's own included -- the groups are sized around their content -- so the layout runs only when a measured size changed since the last one. A rebuild keeps the measured sizes of the elements that stay.
- **React renders the links' content** -- the line of a link is JointJS's (a `LinkModel` with the wrapper and the line); the `renderLink` callback renders a `<LinkContent>` on top: the insert button on the longest vertical part of the route (read with `useLinkLayout()`), the name of the option above it, the arrow in the middle of the return link of a loop, turned along it.
- **Selection and inspector** -- a click selects an element, one at a time (the editor's own state, no `ui.Selection`): the component draws the frame. The panel on the right is a React form on the data: the label, the `run` command and the comment of a step, the names of the options of a decision or the branches of a fork -- each field commits when it is left, one undoable edit -- or, with nothing selected, the diagram as text on two tabs, YAML and the data as JSON, highlighted by highlight.js.
- **Map** -- a `<Navigator>` of `@joint/react-plus`, small, floating over the bottom right corner of the paper, with the default views of the library - a rounded rect per element, filled in the colors of the diagram without a stroke (`navigator-styles.ts`; the white start is dark on the map, like the ends) - and neither the links nor the add buttons, too small to read on the map. It hides the content of the collapsed groups like the paper does: the navigator inherits the routing options of the paper, not its `cellVisibility`, so that is passed through `options.paperOptions`; and it fits the content measured by the model (no dynamic zoom), like the scroller sizes the paper.
- **Menus, tooltips, toolbar** -- the add menu and the menu of an element (`⋯` on hover: move, remove) are a React component positioned under the button that opened it; hovering the "remove" item turns what it would remove red, by a class on the JointJS views. The tooltips are [react-tooltip](https://react-tooltip.com/), one instance for every button; a button registers with it after it mounts (`tooltip.tsx`), as the buttons of the cells come and go with the cells. The toolbar is a row of buttons: undo and redo (disabled when there is nothing to undo or redo), the zoom through `usePaperScroller()`, a new diagram.
- **Groups in a tree** -- a group is one node of the tree: the outer links connect to the group element, not to the start and end nodes inside it. The group hugs its content, from the top of its start node to the bottom of its end node, but it is never rendered: the paper's `cellVisibility` hides it, so it is a node of the layout only. A custom anchor puts the outer links on the axis of the two gates, and the tree layout's vertices are computed on that axis too -- the tree connects to the start and end nodes, as far as the eye can tell, even when the content is wider on one side of them.
- **Bottom-up layout** -- every group is laid out on its own with `treeLayout.layoutTree(start)`, then sized from its start to its end node, the deepest groups first. The outer tree is laid out last, once the size of every group is known.
- **Fork groups: converging branches** -- the tree layout only knows trees, so the end node is excluded from the layout of a group with the `filter` option. It is then placed below the branches and joined to them by a horizontal bar that mirrors the vertices the tree layout draws below a parent.
- **Loop groups: a tree and a way back** -- the tree grows down from the start node and its leaves converge into the end node; the end node links straight back to the start node, up the left side of the group. Nothing can be added to that return link: a node there would run once per iteration exactly like a node of the tree, so the link is the one link without an insert button. It is dashed, as it runs against the flow of the tree.
- **Nested, collapsible groups** -- a node of a branch, or of the tree of a loop, can be a group itself, of either kind. The start node of a group carries the group's collapse button on its bottom edge, a part of its markup, always shown, in inverted colors; the start of a fork also carries, at its right end, the `+` that adds a branch -- a fork may have any number of them; it shows once the fork has one, an empty fork gets its first branch through the insert button of the link from its start to its end. Hovering the collapse button fades what it would hide: light colors on the outlines, the fills of the pills and the lines, like the deletion preview turns them red (no opacity, which adds up where links overlap). A collapsed group shrinks to the size of a node and hides its content (the `cellVisibility` option of the paper) - the hidden cells stay in the graph, parked at the position of the group (`parkHiddenContent()` in `layout/index.ts`, a workaround: the scroller and the map measure the content by the model, every cell, hidden or not - [joint-plus#836](https://github.com/clientIO/joint-plus/issues/836)); its start node (labelled `Fork` or `Loop`, the kind of the group) stays in its place and stands in for it -- the tree is laid out again around it, and what is added below that node continues the tree below the group.
- **Start and end** -- the root of the diagram is a white circle with a dark outline, labelled `Start`. A dark `End` circle (red is kept for the deletion preview) is an end of the diagram: a leaf nothing can follow, with no add button below it. It can be added below any leaf and as an option of a decision, outside of a group only -- inside a fork or a loop every leaf has to reach the end of the group.
- **Decisions** -- a node that branches out without a merge: a pill labelled `Decision` with a diamond and, once it has a child, a square `+` at its right end -- apart from the `+` of the links, which add below -- that adds a sibling option (the same menu). With no child a decision is a leaf like any other, with the add button below it. A decision may have any number of children; a plain node continues in one child only, so a decision is where a tree splits for good, where a fork splits and joins again. Deleting a decision deletes everything below it, down to the end of its group. A plain node with several children can only be deleted below a decision or a gate, which can take them all.
- **Named options** -- the links from a decision or from the start of a fork to their children carry a label above the insert button: the `name` of the edge in the data, or, unnamed, `option 1`, `option 2`, ... below a decision and `branch 1`, `branch 2`, ... below a fork - the same names the YAML uses as keys (`nameOptions()` in `layout/index.ts`, after every layout; `getDefaultOptionName()` in `data/DiagramData.ts`). The link to an add button is never an option. Those children get the `offset` attribute of the tree layout, which places them further from their parent than the parent gap alone, so that the vertical part of the link has room for the name (the children of a collapsed group get the same room, those of a loop's start node a little more and those of a loop half of it, which keeps the insert button of their link clear of the collapse button above, or of the return link leaving and joining the link); the bar between them lies a third of the gap below the parent, whatever the offset.
- **Pan and zoom** -- the paper sits in a `ui.PaperScroller` that grows with the content. Drag the blank area to pan (`blank:pointerdown` → `startPanning()`), pan with two fingers on a trackpad (`paper:pan`), pinch or `Ctrl` + wheel to zoom (`paper:pinch` → `zoom()` around the pointer). The first layout fits the content into view (`zoomToFit()`); the layouts after an edit keep the zoom and the scroll position.
- **Moving a branch** -- *Move to…* in the menu of an element starts a move of the element with everything below it: the subtree dims, and the drop points of the diagram - the buttons of the links, the add buttons below the leaves, the `+` of a decision or a fork - take the subtree instead of adding a new node; `Escape` or a click on the blank area cancels. The points that cannot take it are hidden - the buttons of the links and the add buttons alike: everything inside the subtree itself, a link when the subtree has more than one leaf the flow can continue from (the former target of the link has to follow one), and any point inside a fork or a loop when the subtree reaches an end of the diagram. The data moves the edge - `moveNode()` - so an option keeps its name. With nowhere to go, the item is greyed out.
- **Deleting** -- a deleted node is spliced out: its children move up to its parent, in its place, and a single child takes over the name of the option the node was. A group is deleted with its content; what hung below it moves up to the group's parent. A parent left without children inside a group becomes a leaf and connects to its sink again. The root, the end nodes and the add buttons cannot be deleted (the start node deletes its group). The last node of a group can: its start node then links straight to its end node, and that link takes a node like any other, so the group can be refilled.

## Controls

| Action | Result |
|--------|--------|
| Click the square `+` below a leaf | A menu: add a step, a decision, a fork, a loop or (outside of a group) an end below the leaf |
| Click the `+` at the right end of a decision | The same menu: add another option to the decision |
| Click the `+` at the right end of a fork | The same menu: add another branch to the fork |
| Click the square `+` on a link | The same menu: insert a step, a decision, a fork or a loop into the link |
| Drag the blank area, two-finger pan, pinch or `Ctrl` + wheel | Pan and zoom |
| `Ctrl+Z` / `Ctrl+Shift+Z` (`⌘Z` / `⇧⌘Z`), or the toolbar | Undo / redo the last edit |
| The toolbar | Zoom out, zoom in, zoom to fit; new diagram: everything but the start goes (undoable) |
| Click an element | Select it and inspect it on the right: the label of a step or a decision, the command a step runs, a comment (for the YAML), the names of its options |
| Nothing selected | The diagram as YAML in the panel |
| Click the blank area, or `Escape` | Clear the selection |
| `Delete` / `Backspace` | Delete the selected element, as the *Remove* item of its menu would (the start of a group deletes the group) |
| Hover a step, click the `⋯` at its top right, choose *Remove the step* | Delete the step; its children move up to its parent. A decision goes with everything below it. Hovering the item previews what goes |
| Click the `+` below a group nothing follows | The same menu, acting on the group |
| Hover the start node of a fork or a loop, `⋯` → *Remove the fork* / *Remove the loop* | Delete it with its content |
| `⋯` → *Move to…*, then any `+` | Move the element with everything below it there; `Escape` cancels |

| Click the round `-` / `+` on the bottom edge of the start node of a group | Collapse or expand the group |
| Hover the start node of a group | The `⋯` whose menu deletes the group |

## Controls

| Action | Result |
|--------|--------|
| Click the square `+` below a leaf | A menu: add a step, a decision, a fork, a loop or (outside of a group) an end below the leaf |
| Click the `+` at the right end of a decision | The same menu: add another option to the decision |
| Click the `+` at the right end of a fork | The same menu: add another branch to the fork |
| Click the square `+` on a link | The same menu: insert a step, a decision, a fork or a loop into the link |
| Drag the blank area, two-finger pan, pinch or `Ctrl` + wheel | Pan and zoom |
| `Ctrl+Z` / `Ctrl+Shift+Z` (`⌘Z` / `⇧⌘Z`), or the toolbar | Undo / redo the last edit |
| The toolbar | Zoom out, zoom in, zoom to fit; new diagram: everything but the start goes (undoable) |
| Click an element | Select it and inspect it on the right: the label of a step or a decision, the command a step runs, a comment (for the YAML), the names of its options |
| Nothing selected | The diagram as YAML in the panel |
| Click the blank area, or `Escape` | Clear the selection |
| `Delete` / `Backspace` | Delete the selected element, as the *Remove* item of its menu would (the start of a group deletes the group) |
| Hover a step, click the `⋯` at its top right, choose *Remove the step* | Delete the step; its children move up to its parent. A decision goes with everything below it. Hovering the item previews what goes |
| Click the `+` below a group nothing follows | The same menu, acting on the group |
| Hover the start node of a fork or a loop, `⋯` → *Remove the fork* / *Remove the loop* | Delete it with its content |
| `⋯` → *Move to…*, then any `+` | Move the element with everything below it there; `Escape` cancels |

| Click the round `-` / `+` on the bottom edge of the start node of a group | Collapse or expand the group |
| Hover the start node of a group | The `⋯` whose menu deletes the group |

## Project Structure

| File | Description |
|------|-------------|
| `src/main.tsx` | App entry point |
| `src/app.tsx` | `<Diagram>` with the scroller and the paper, the toolbar, the inspector, the menu layer and the tooltip; `renderElement` and `renderLink` |
| `src/editor.tsx` | `EditorProvider`: the data, the history, the selection, the move in progress and the menu, and every edit; `EditorWiring`, inside the paper: the layout on measured sizes, selection on click, panning, the keys |
| `src/editor-context.ts` | The `EditorApi` every component reads with `useEditor()` |
| `src/cells/` | The components of the elements: `cell.tsx` picks by type; `step-view`, `decision-view`, `group-start-view`, `terminal-view`, `add-button-view`; `buttons.tsx` (the "more" button, the plus) and `use-add-below.ts` (what a click on an add button does) |
| `src/link-view.tsx` | What React renders on a link: the insert or drop button, the option name, the return arrow |
| `src/navigator-styles.ts` | The fills of the elements on the map |
| `src/menu.tsx`, `src/choices.ts` | The menu component; the items of the add menu and the choices |
| `src/toolbar.tsx`, `src/inspector.tsx` | The toolbar; the inspector fields and the YAML panel |
| `src/shapes.ts` | The models (`ElementModel` / `LinkModel` subclasses with their `data`), the layout metrics, the colors |
| `src/tools.ts` | The state of the picture that is not the data: the deletion highlight, the marks of a move, where the button of a link goes |
| `src/actions.ts` | The edits (changes of the data) and the questions the tools ask first: what can be deleted, moved, inserted |
| `src/data/` | `types.ts`, `DiagramData.ts` (the model and its edits), `build.ts` (data to graph), `yaml.ts` |
| `src/layout/` | The bottom-up layout: `index.ts`, `tree.ts`, `fork.ts`, `loop.ts`, `gate-anchor.ts` |
| `src/pipeline.ts` | The initial diagram, a CI/CD pipeline, as data |
| `src/index.css` | The stylesheets of the libraries in a cascade layer; the pills, the buttons, the menus, the panels |

## How It Works

1. The build embeds in a group its start node, its content, its end node and the inner links. The outer links (`parent → group`, `group → child`) are attached to the group element. A fork with two branches `a` and `b` embeds them and the links `start → a`, `start → b`, `a → end`, `b → end`. A group without branches is empty: a fork embeds `start → end`, a loop `start → end` and the return link `end → start`. Branches are added with the button on the start of a fork; a loop grows by insertions into its first link.
2. `runLayout()` sorts the expanded groups by depth, deepest first, and lays each of them out by its kind. A fresh `TreeLayout` is used for every tree: its `updatePosition` moves elements with `{ deep: true }`, so a nested group carries its content along, and its `filter` drops the end node the tree would otherwise run into, so that the content stays a tree.
3. *Fork group:* `layoutTree(start)` lays out the branches. The end node is placed below the bounding box of that tree (`treeLayout.getLayoutArea(start)`) on the vertical axis of the start node -- a parent gap plus a third further down, so that the part of a join a leaf has of its own is a full parent gap long -- and the links into it get two vertices forming a horizontal bar, a third of the gap above the end node.
4. *Loop group:* `layoutTree(start)` lays out the tree centered on the axis of the start node, as the tree layout puts it, so that a chain of nodes lines up with the gates; the end node is placed below the tree on that axis, as far as makes the return link run as far above the tree as below it. The return link runs a gap left of the tree, outside of the box of the group; a loop with a sibling on its left gets that gap as its `prevSiblingGap` in the tree layout (`makeRoomForReturnLinks()`), a lone one does not, as the gap would shift it off its parent. The tree hangs from the start node with the usual bar, and its leaves enter the end node from the side, on its level -- a leaf right above the end node connects straight. The return link runs down the link out of the end node and diverges from it a drop below, turns left, runs up the side of the group, turns right under the start node, merges into the link out of the start node a drop below the pill and ends a little further down it (a `bottom` anchor with a `dy`); it has no arrowhead, an arrow label in its middle, turned along the link, shows the way -- above the insert buttons of those links, which move down to make way; it lies below the other links (`z: 0`), so that a leaf entering the end node from the left runs over it.
5. In both cases the group is positioned and sized by hand: from the top of the start node to the bottom of the end node, as wide as its content. The `defaultAnchor` of the paper is the custom `gateAnchor`: a link into a group is anchored at the top middle of its start node, a link out of a group at the bottom middle of its end node. With the `boundary` connection point, the outer links meet the group exactly where the start and end nodes are. The `updateVertices` callback of every `TreeLayout` draws the usual horizontal bar between the *axes* of the parent and the child, not between the middles of their boxes, so a link into a group turns down on the axis of its gates.
6. A collapsed group skips all of that: it is resized to a node and its start node is placed over it. The paper's `cellVisibility` hides every group, every cell that has a collapsed ancestor -- except the start node of the collapsed group itself -- and every link whose end is hidden. The links to a hidden group still render: the paper routes them from the models (`useModelGeometry`), which is also why the `gateAnchor` reads the gates from the models.
7. Finally the outer tree is laid out from the root with `layoutTree(root)`. `layout()` is not used, because it would start a tree from every source of the graph -- including the start node of every group. The paper is then scaled to fit the visible content.
8. None of the structure is edited on the graph. An edit changes the data -- an edge added to a list, a node inserted into an edge, a node taken out with its parent leading to its children in its place -- and the build derives the graph again: an add button below every node outside of a group that leads nowhere, a link to the end of the group from every such node inside one, the sibling ranks from the order of the edges. Since the cells keep their ids, the graph is updated in place and the layout starts from the previous positions.

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
