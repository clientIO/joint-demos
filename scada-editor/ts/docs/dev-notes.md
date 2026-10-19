# SCADA Editor - Developer Notes

For programmers extending the demo or connecting a plant. Usage: [user guide](user-guide.md). Summary: [features](features.md).

## Architecture

`App` (`src/app.ts`) owns the graph, the paper, the scroller, the navigator, the toolbar, the stencil, the keyboard, the tooltips, the history, the plant of a run and what the inspector panel shows (`app.panel`, one at a time: the inspector of the selection, the settings, a shape of the palette - `inspector/panel.ts`). The state of an app belongs to the app, a controller (the log of `LogController`) or a view (the hovered cell is the paper's hover frame), not to a module - except the diagram style, applied to the document (see [Diagram style](#log-marker-theme-style-animations)). Two modes (`Mode` in `const.ts`):

- **Edit** - palette, inspector, history, file buttons.
- **Runtime** - none of those; the controls can be operated, a screen fills the window. Entering snapshots the cells (`toJSON({ ignoreDefaults: false })`) and stops the history; leaving syncs them back (`graph.syncCells(..., { remove: true })`).

### Controllers

A controller (`controllers/Controller.ts`) is an `mvc.Listener` with the app as its first callback argument: handlers are named functions `(app, ...eventArgs)`. What a controller owns (the log of `LogController`, the animations of `AnimationsController`) is its second callback argument: `(app, log, ...eventArgs)`. A controller file holds the controller and its handlers only - highlighters, constants and helpers live in their areas (`canvas/`, `runtime/`, `log/`, `events.ts`). `App.controllers` listen all the time; `App.modeControllers` start and stop with their mode. A controller decides *when*, an action in `actions/` *what*.

| Controller | Mode | Listens to |
|---|---|---|
| `CanvasController` | always | paper: blank drag (pan), pinch, pan |
| `ControlsController` | always | graph: controls of added elements; the `command` event of an element → `app.plant` |
| `SelectionController` | always | selection: free transform, link tools, inspector |
| `TagsController` | always | graph: the tags unique (a copy: the next free one of its series), an empty one removed |
| `PipeColorController` | always | graph: pipe colors; a control valve shows its pipe's |
| `GroupController` | always | graph: a member changed → its groups refit |
| `TagBadgesController` | always | the window: `Alt` held - the ID badges (`canvas/tag-badges.ts`, highlighters); graph changes draw them again |
| `ToolbarController` | each mode | toolbar buttons |
| `FindController` | both (one instance) | Find button, `Cmd + F`, `Escape`; graph changes refresh the list; a selection on the canvas closes it |
| `EditController` | edit | paper: cell click, region, context menus, `Cmd` + drag of a cell (a copy dragged); a cell not selected pans with *Move selected shapes only* |
| `PaletteController` | edit | palette: click, drop; graph: the derived groups |
| `KeyboardController` | edit | shortcuts |
| `LockController` | edit | graph: `locked` - the pointer goes through a locked element (a class), not in the minimap |
| `RoutingController` | edit | paper: `link:connect` - the stored direction of the end forgotten; graph: `routing` - the stored router, connector removed |
| `RuntimeController` | runtime | paper: a cell drag pans |
| `CursorController` | runtime | the paper scroller: the pointer at rest (3 s) - the cursor hidden (`scada-cursor-hidden`), shown when it moves or leaves |
| `MockPlantController` | runtime | the mock plant (`plant/mock/`) |
| `LogController` | runtime | Log button, `L`, `Escape`; plant messages; element clicks filter the log |
| `AnimationsController` | runtime | paper: `render:done` - the plant starts moving once the diagram is rendered (see [Gotchas](#gotchas)); graph: `data` - the animations again when a cell is switched, opened, closed |
| `ElectricalController` | runtime | graph: `energized` |

### History

Everything edited is recorded (image upload, rename, delete included). Not recorded (`historyOptions` in `history.ts`, with the options below) - changes with:

- `RUNTIME` - by the plant during a run,
- `DERIVED` - derived from another change (the taps of a busbar, table rows taken by a resize),
- `PREFERENCE` - favorites.

Opening a diagram clears the history.

## Project structure

```
src/
  main.ts, app.ts, const.ts   entry, App, constants
  tooltips.ts         the tooltips of the app
  history.ts          what the history records (the change flags, `historyOptions`)
  events.ts           what an event means (adds to the selection, drags a copy, typed into a field)
  diagram-style.ts    the style of a diagram
  examples.ts         the examples list
  styles.css          imports: JointJS+ and theme layers, tokens, then the area CSS (layout.css, */*.css)
  tokens.css, icons/  app tokens and icons (over the theme's)
  actions/            selection, history, clipboard, order, groups, pipes, file, palette, view
  canvas/             config (the paper, the scroller, the zoom), selection frames, snaplines, link tools, connections, layers,
                      navigator, screen, context menu, tag badges, marker, ping
  toolbar/            toolbar (of each mode), config (the tools in each mode), toolbar.css
  palette/            stencil, packing, preview, descriptions, images, favorites
  inspector/          inspector, selection inspector, panel (what it shows), placeholder (nothing in it: the examples), color field, help, settings
  runtime/            controls, animations, electrical (the energized circuits)
  plant/              plant.ts (the interface), properties.ts, tags.ts, TagIndex.ts (the elements by their tags, `app.tags`); mock/ - the simulated plant
  log/                the log of plant messages, what it shows on the diagram (log-hooks)
  controllers/
  shapes/             models/ (Shape, Connection - the bases; <palette group>/), views/, common/ (ports, footprint, routing,
                      gradients, charts, style, data, tag, features),
                      attributes/ (label, from-style, computed, flip), shapes.css (shape colors), index.ts (the namespace)
  theme/              the reusable `minimal` theme (see theme/README.md)
  diagrams/           the examples (saved JSON)
```

## Conventions

- **Comments** say what or why, in short phrases; every export and non-obvious constant has one.
- **File names** - a class default export: PascalCase (`Shape.ts`); otherwise kebab-case (`mock-plant.ts`). Attribute keys camelCase.
- **Casts** - only for gaps in the library's typings, each commented; otherwise type guards (`isElement()`, `instanceof`) and `keysOf()` (`keys.ts`: the keys of the app's own constants).
- **Names** - a method that returns something `getX()`; `xOf()` for plain functions only.
- **`if` bodies** - always in braces, a bare `return;` too.
- **Change flags** - `RUNTIME`, `DERIVED`, `PREFERENCE` (see [History](#history)). An operator command is not a change but an event (see [Connecting a plant](#connecting-a-plant)).
- **Model geometry** - routes, positions and sizes come from the models (`getFootprint()`, the getters), never from the rendered DOM.
- **Embedding** - `config.storeEmbeds = false` (`main.ts`): the members of a group are known by their `parent` only, no `embeds` stored; listen to `change:parent`.
- **Example JSON** - when edited by a script, set only what the inspector can set (fields, positions, sizes, link ends, vertices).
- **Accessibility** - a control without visible text gets an `aria-label` (an icon button of the toolbar: `iconButton()` in `toolbar/config.ts`; a swatch, a run-mode control: by the element's ID, else its label); the page landmarks are in `index.html` (the `header` the toolbar is appended to, `main`, the `aside`s) with a visually hidden `h1`. A run-mode control's focus ring is drawn outside of it, in the room its `foreignObject` has around it (`FOCUS_MARGIN` in `runtime/controls.ts`; the pointer goes through that room). Checked with axe-core; what is left comes from JointJS+ (the inspector's labels, the scroll areas' focus, the group heading levels, the dialog's role).

## Shapes

Every element extends `Shape` (`shapes/models/Shape.ts`) and overrides the getters that differ:

| Getter | Default | Example |
|---|---|---|
| `resizable` | `true` (min half the default size) | `false`, `{ preserveAspectRatio: true }`, `{ minWidth, minHeight, directions }` |
| `rotatable` | `true` | `false` (a display) |
| `control` | `null` | `'power'` (checkbox), `'toggle'` (open / closed), `'slider'` |
| `graphLayer` | `Layer.Equipment` | `Layer.Instruments` |
| `anchors` | `'sides'` | `'middles'` (a join) |
| `stubLength` | `null` | `20`: pipe stub length |
| `tagPrefix` | the type's initials; `null` - no IDs (a text, a zone) | `'NRV'` |
| `autoTag` | `true` - a new one (dropped, a group created) gets an ID; `false` - only by *Generate* (a picture, a background shape) | `false` |
| `overflow` | `{}` (a label below) | `{ top: 42 }`: drawing outside the bounding box |
| `colorField` / `outlineField` | surface `color` / `outline` | `{ path: ['attrs', 'body', 'fill'] }` |
| `accentField` | `null` | a boiler's flames |
| `getComputedAttrs(selector, bbox)` | `{}` | the computed parts (`computed: true`, `shapes/attributes/computed.ts`): a needle's rotation |

Every link extends `Connection` (`shapes/models/Connection.ts`): `tagPrefix` (`null`; a conveyor `'CV'`), `autoTag`, `colorField` (its line), `outlineField`, `accentField` (`null`), `strokeWidths` (`null`; a pipe, a wire - their widths the user scales). What both share is `CellFeatures` (`Shape.ts`), read of any cell by `featuresOf()` (`shapes/common/features.ts`: `null` for a cell of neither - the screen).

A shape showing a value by a part (level panel, battery bank, fuel tank, thermometer) defines `glideProperty` and `glideKeyframes(value)`; its view glides the parts from the value it drew last to the current one when it draws again (`shapes/views/glide.ts`; on a paper `Animations` lets glide: run mode, not alarms only).

Special attributes:

- `style` (`shapes/common/style.ts`) - how a cell looks, in one model attribute, as the style of the diagram: `color`, `outline`, `outlineWidth`, `accent`, `finish`, `lineWidth` (the size of a pipe, the thickness of a wire); none of a key - Auto. Read with `styleOf()`; the color fields of the inspector are at `style/…`, a part's attributes in the values of the style by `fromStyle: { fill: 'accent' }` (`shapes/attributes/from-style.ts`, its own value the default - `ColorField.part`); the views draw a cell again on `change:style`.
- Links: their color by `fromStyle` (the line, the outline of a pipe, the belt, outline, cleats of a conveyor), their size by `strokeWidthBase` (`shapes/common/line-width.ts`: the width at the normal size, scaled by `lineWidth` when drawn); an arrow's arrowheads by `arrowheads` (the markers defined in its color - the library takes it from the `stroke` set on the line, not a computed one - and scaled by its size, `lineWidthScale()`; the line shortened by their scaled lengths).
- `data` (`shapes/common/data.ts`) - what an element shows, in one model attribute: the plant's values (`power`, `open`, `level`, `value` - the reading of a display, a meter too: its text drawn from it - `values`) and their scale (`min`, `max`, `thresholds`, `slices`). Read with `dataOf()`, set with `setData()` (arrays replaced, not merged); the shapes and the view follow `change:data` (one presentation attribute for all the charts). A table's `values` are its data too (its view updates the cells that changed).
- `computed` (`shapes/attributes/computed.ts`) - a part drawn from the model (its data; the taps of a busbar): `computed: true` on it, the shape's `getComputedAttrs(selector, bbox)` computes its attributes when the element is drawn (`calc()`, a `text`, a `style` as usual) - the needle of a gauge, the liquid of a panel, the lever of a breaker, the bolts of a busbar. Not stored: the JSON holds the model only. `ShapeView` draws the element again on `change:data`.
- `fromModel: { text: path }` (`shapes/attributes/label.ts`) - a text of the model on a part: the label (`label: { text, position }`; the Label shape also `size`, `weight`, `styles`, `align`), the `unit` of a display, the `function` and `loop` of an instrument bubble. Other model attributes of a shape: `imageId` (an uploaded image), `tipSide` (a zone), `style.opacity` (an image, a shape of the background).
- `label.position` (`shapes/attributes/label.ts`) - `top`, `left`, `right`, `bottom`; laid out clear of the drawing, horizontal on a rotated shape; `label.offset` - further from the shape (px), counted in the footprint below and in `labelReach()`. Labels spread `labelAttributes` (class `scada-shape-label`: the diagram's label size and color).
- `flip` (`shapes/attributes/flip.ts`) - the model attribute `flip` (`x`, `y`, `xy`): one `transform` mirroring the node across the middle of the element, by the special attribute `flip: true` on the parts that show a direction only, marked `<g @group-selector='directional'>` in the markup (the inlet of a cyclone, the chutes of an elevator), so the symmetric rest keeps its lighting; the view renders them again when `flip` changes (`ShapeView`). A shape opts in with `flippable` (`'x'`, `'xy'`); its overflow mirrors in `footprint.ts`. The ports mirror with it: a pipe stub is described by its side and a part of it (`Stub` in `ports.ts`), flipped by `flipStub()` (left / right swapped, the part along the top and the bottom mirrored), the ports rebuilt from the flipped stubs when the flip changes (derived, `Shape.flipPorts()`) - the port ids stay, so the pipes follow their stubs (the suction of a pump stays the suction).
- `surfaceFill`, `surfaceStroke`, `materialFill` (`shapes/common/gradients.ts`) - metal shading with the element's color mixed in.
- `pipePorts()`, `terminalPorts()`, `pipeThroughAttributes()` (`shapes/common/ports.ts`).

### Adding a shape

1. A class in `shapes/models/<group>/` (`markup`, `defaults()` with `labelAttributes`, getters); register it in `shapes/index.ts`.
2. An instance in `createShapes()` (`palette/stencil.ts`).
3. Its title and description in `palette/descriptions.ts`.
4. Plant properties in `plant/properties.ts`; a generator in `plant/mock/mock-plant.ts`.
5. A `control` getter if the operator can switch it.
6. An animator in `runtime/animations.ts` (kind `equipment`, `flow`, `alarm` or `level`).

## Connecting a plant

`app.plant` (`plant/plant.ts`) is the only way the plant changes the diagram: a tag, a property, a plain value. A new one is created for each run (`null` while editing).

```ts
app.plant.update('FM-101', 'value', 18.6);    // a reading
app.plant.update('HV-101', 'open', false);    // a state
app.plant.get('LI-101', 'level');             // what the diagram shows
app.plant.on('command', ({ tag, property, value }) => { /* ... */ });   // an operator command
app.plant.on('update', ({ tag, property, value }) => { /* ... */ });    // an update applied
```

Commands: a control triggers `command` on its element, `ControlsController` passes it to `plant.send()`, and the element changes only when the plant answers with an update (the mock after 0.3-0.8 s). Until then the control shows it pending (5 s at most). Properties per element type are in `plant/properties.ts` (`power`, `open`, `level`, `value`): they are the keys of the element's `data` (see below).

In the console during a run: `plant.update('LI-101', 'level', 90)` (`window.plant`).

To connect a real plant, replace the mock with a controller of your own. It extends `Controller` because `App` starts and stops controllers with the mode, and the plant exists only during a run:

```ts
export default class PlantSocketController extends Controller {
    socket: WebSocket | null = null;

    startListening(): void {
        const plant = this.app.plant!;
        const socket = this.socket = new WebSocket('wss://scada.example.com/plant');
        socket.onmessage = ({ data }) => {
            const { tag, property, value } = JSON.parse(data);
            plant.update(tag, property, value);
        };
        // A handler registered by `listenTo()` gets the app first (see `Controller`)
        this.listenTo(plant, 'command', (_app: App, { tag, property, value }: PlantMessage) => {
            socket.send(JSON.stringify({ tag, property, value }));
        });
    }

    stopListening(): void {
        super.stopListening();
        this.socket?.close();
    }
}
```

```ts
// app.ts
[Mode.Runtime]: [
    new ToolbarController(this),
    new RuntimeController(this),
    new PlantSocketController(this),    // was: new MockPlantController(this)
    new LogController(this),
    new AnimationsController(this),
    new ElectricalController(this)
]
```

Then delete `plant/mock/`. The mock also derives the energized circuits (`plant/mock/energized.ts`), the table readouts and the chart values; without it, your system has to send them.

## Log, marker, theme, style, animations

- **Log** (`log/LogView.ts`, owned by `LogController`) - listens to the plant's `update` and `command`, keeps the last 200 messages of a run; a `FilterListView` (as Find) in a `ui.Dialog`; its search ignores case and dashes (`normalizeSearch()`). Filtered by words (not by a direction alone), it grays the rest of the diagram (`canvas/dim.ts`, `dimCells()`: a class on the views - a highlighter - and on their controls; kept: the cells of the messages shown and of the IDs starting with the words, updated as messages come and go; with *Gray what has no ID* the cells without an ID too - one set, computed in `log-hooks.ts`; `opacity` in Safari, which does not draw the CSS filter functions on SVG). Pings are ring highlighters behind the element (`canvas/ping.ts`, in a color). The cell of the clicked message is marked - as the one picked in Find in run mode, one at a time: `canvas/marker.ts`, a violet arrow in the front layer pointing at it (above it, clear of its drawing, its label and control there - below it, pointing up, if it would leave the screen), flashed by a ping in its color.
- **Theme** (`theme/theme-minimal.css`, `setTheme('minimal')`) - styles the JointJS+ components, every rule scoped to `.joint-theme-minimal`, using only `theme/tokens.css` (shadcn/ui variable names). Cascade layers: `joint` → `theme` → the app (unlayered), so the app always wins. Reuse: `theme/README.md`.
- **Shape colors** - CSS variables (`--shape-*` in `shapes/shapes.css`); the dark scheme redefines them.
- **Diagram style** (`diagram-style.ts`, saved as `graph.get('style')`) - `finish`, `color`, `outline`, `outlineWidth` (the uniform outline of outlined surfaces, `gradients.ts`; the pipe border, `pipeOutline` in `Pipe.ts`), `accent` for shapes without their own; `labelSize` (`small` 12, `medium` 14, `large` 16, `x-large` 18 px), `labelColor` (theme colors only), `labels` (`name`, `tag`, `both`: the text of the shape labels - `fromModel.shapeLabel` in `attributes/label.ts`, read from the cell's graph, so the palette shows names; a shape without an ID: its name; a view update, see `isViewUpdateRequired()`), `canvas` (`--canvas-*`: a light and a dark tone; sets `--shape-canvas`, the grid is colored from it in `canvas.css`), `canvasGradient` (drawn on the `PaperScroller` element behind a transparent paper: it stays put while scrolling and zooming; added to the exported image). Applied as CSS variables, so the palette and the preview follow.
- **Animations** (`runtime/animations.ts`, Web Animations API, never the model) - kinds `equipment`, `flow`, `alarm`, `level`. Level `full`, or `alarms` (alarms and levels only; also with reduced motion). The palette preview runs them and switches the shape every 2.5 s.

## Where things are

| Feature | Code |
|---|---|
| Palette packing (skyline, no labels) | `palette/packing.ts` |
| Uploaded images (on the graph; one `<symbol>` per paper) | `palette/images.ts`, `shapes/models/custom/CustomImage.ts` |
| Where a link end connects | `connectionStrategy` in `canvas/connections.ts` |
| Routing straight / orthogonal / curved (a link stores its `routing`: the router, the connector by the paper defaults - `orthogonalRouting`, `smoothRouting`; a disconnected end (Disconnect, a copy) stores the direction it was drawn in as an explicit router / connector, so the route keeps its shape; forgotten when connected again) | `shapes/common/routing.ts`, `RoutingController` |
| Conveyor (a link drawn as a belt) | `shapes/models/bulk/Conveyor.ts` |
| Charts (paths from model data) | `shapes/common/charts.ts` |
| Table (own view, per-cell updates) | `shapes/models/charts/Table.ts`, `shapes/views/TableView.ts` |
| Groups | `shapes/models/diagram/Group.ts`, `GroupController`, `canvas/Snaplines.ts` (drag fix) |
| Multi-selection inspector ("mixed") | `inspector/selection-inspector.ts` |
| Save / open / export (WebP) | `actions/file.ts`; ports are not saved (`Shape.toJSON()`) |
| Screen | `shapes/models/diagram/Screen.ts`, `canvas/screen.ts` |
| IDs (the tags: optional, unique, in series - `plant/tags.ts`: `tagNewCell()` at the palette drop and a new group, `ensureUniqueTag()` for copies, the *Generate* button of `inspector/tag-field.ts`) | `plant/tags.ts`, `TagIndex`, `TagsController` |
| Find (the cells with an ID or a name; the list's own selection changes flagged `find`) | `find/FindView.ts`, `find/find-hooks.ts`, `FindController` |
| A list filtered in a dialog (Find, the log): the filter, the rows marked by key, the dialog | `list/FilterListView.ts` (an `mvc.View`, kept between openings) |
| Lock (`locked`, a group locks its members; skipped by the selection, the links, the minimap) | `canvas/lock.ts`, `actions/lock.ts`, `LockController`, `validateConnection` in `canvas/config.ts`, `cellVisibility` in `canvas/navigator.ts` |
| Controls (front layer, upright, inert while editing) | `runtime/controls.ts` |
| Phone (`PHONE_QUERY`: narrow or short; the same `@media` in CSS): the edit mode a page of the examples over the hidden canvas (hidden, not removed: the texts are measured), no palette created, no diagram loaded until an example is picked, the toolbar simplified, the mode button *Exit*; running: no bar (its buttons float over the diagram), with a screen the page zoomed natively by a pinch (`setNativeZoom()`: the paper doesn't cancel the touches, `RuntimeController`) | `phone.ts`, `phone.css`, `example-buttons.ts` |
| Preferences (the Editor settings: snaplines, the In Use group, *Move selected shapes only*) - one `localStorage` entry, read by `App`, stored when the user changes one in the settings; the color scheme has its own (`actions/view.ts`) | `preferences.ts`, `inspector/settings.ts` |
| Cursors (what a drag or a click does) - CSS only, from the state in the DOM: the app's `data-mode`, `data-move` (*Move selected shapes only*), `data-drag` (`copy` while `Cmd` / `Ctrl` is held, `EditController`), `data-screen`; a selected cell's view `scada-selected` (`SelectionFrame`), the cells with an ID while the log is open `scada-log-clickable` (a highlighter, `log-hooks.ts`); scoped to the main paper (`scada-diagram`, not the palette, the minimap, a preview) | `canvas/canvas.css` |

## Gotchas

- **Controls are in the paper's front layer**, not in the element views; the paper's `guard` (`app.ts`) ignores their events, or a slider press would be a blank-canvas press.
- **Import cycles** - `shapes/common/footprint.ts`, `gradients.ts`, `attributes/computed.ts` import `Shape` as a type only; the shapes don't import `plant/` (`plant/tags.ts` reads `featuresOf()`, which imports `Shape`: the tag of a cell is read by `getTag()` of `shapes/common/tag.ts`) nor `inspector/` (the color fields of a cell: `shapes/common/color-fields.ts`).
- **Stencil** - `fitPaperToContent()` is overridden (not in the typings); the `cellCursor` option breaks link hit-testing, fixed in the theme.
- **Context menus** (`ui.ContextToolbar`) - one open at a time, no submenus; kept inside the window by `keepInWindow()` (`canvas/context-menu.ts`).
- **Workarounds of missing APIs** - the drag handed over to the copy of a duplicating drag (`canvas/drag.ts`, `ElementView`'s internal event data; a link's copy moved by `EditController` itself: clientIO/joint#3534), the guard of the vertices tool (`canvas/tools.ts`: clientIO/joint#3540), the selector of a computed part (`attributes/computed.ts`: clientIO/joint#3541), `preventSelectionInteraction()` (`canvas/selection.ts`, `ui.Selection`'s internals), the snapping of a delegated drag (`canvas/Snaplines.ts`, an internal method of `ui.Snaplines`) and the palette's fitting, search and group content (`palette/stencil.ts`: `fitPaperToContent()`, the `unmatched` class, the markup of a group): to be replaced when JointJS / JointJS+ expose them (each marked TODO).
- **Full screen** - our own toolbar button (`toggleFullScreen()` in `actions/view.ts`, shown if `document.fullscreenEnabled`), not the built-in `fullscreen` tool: the tool reads `window.top.document`, which throws in a cross-origin iframe (the demo embedded in another site). Back to the tool once it uses the document of its target (TODO in `toolbar/config.ts`).
- **The animations wait for the first render** - the paper is `async` and starts `frozen`, so a view has no nodes to animate until it is rendered (`findNode()` finds nothing). `AnimationsController` starts them on the paper's `render:done`, or at once if nothing is scheduled (`hasScheduledUpdates()`): from the Run button the diagram is rendered long since, but on a phone the example picked runs the moment it is opened (`phone.ts`). One render is enough because the paper sets no `cellVisibility`: every view is mounted in the first pass and never unmounted again - `viewManagement` buys lazy initialization here, not viewport culling. Give the paper a `cellVisibility` (a large plant) and the cells mounted later need animating as they are.
- **The mock is random** beyond a few couplings (feedwater follows the feed pumps, charts follow the flow, the beacon follows the pressure).
