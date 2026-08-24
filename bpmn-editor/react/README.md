# JointJS+ BPMN Editor — React

React version of the BPMN editor demo, built with [`@joint/react-plus`](https://docs.jointjs.com/react).

The graph is the single source of truth and the BPMN shapes are classic JointJS shape classes rendering through their own views (no `renderElement`). Everything around them is React: the UI is composed from `@joint/react-plus` components (`<Diagram>`, `<Paper>`, `<PaperScroller>`, `<Selection>`, `<Halo>`, `<FreeTransform>`, `<Snaplines>`, `<Navigator>`, `<Stencil>`) and all imperative access goes through its hooks (`useGraph`, `usePaper`, `usePaperScroller`, `useCells`, `useOnPaperEvents`, ...).

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

## Embedding

`<BpmnEditor>` (`src/components/bpmn-editor`) is the whole editor — self-contained, it fills its container (which must have a definite size). `src/app.tsx` is just a host that mounts it full-page; see the comment there for a multi-column embedding example.

The editor's behavior is composed from components, so features can be removed by unmounting them:

- `<ViewInteractions>` — viewing behavior: selection semantics (`ctrl`/`cmd`+click cherry-picking scoped to a pool), embedding highlights, link snap styling
- `<EditInteractions>` — editing gestures: element/pool/swimlane drag behavior, boundary-event snapping, the inline label editor, link replacement on connect — unmount it for a read-only diagram
- `<KeyboardShortcuts>` — delete, undo/redo (`ctrl/cmd+z`, `ctrl/cmd+y`, `shift+ctrl/cmd+z`), select all, zoom (`ctrl/cmd±`), print (`ctrl/cmd+p`), escape
- `<BpmnSelection>`, `<BpmnHalo>`, `<BpmnFreeTransform>`, `<BpmnSnaplines>`, `<LinkTools>`, `<LinkContextMenu>` — the individual widgets
- `<ExampleDiagram>` — loads the sample car-wash process on mount

## Structure

- `src/shapes/` — the BPMN shape classes (one folder per family: activity, event, gateway, data, flow, pool, group, annotation). Each shape carries its own logic as typed members: connection/embedding validation, halo handles, link context-menu actions, inspector appearance config, label-editor styles.
- `src/components/` — the React UI; each component sits in its own folder with its colocated CSS (`bpmn-stencil`, `toolbar`, `inspector`, `navigator`, `link-context-menu`, `export-dialog`, `file-import-overlay`, `tooltip`, ...).
- `src/hooks/` — the interaction hooks behind the components (`use-view-interactions`, `use-edit-interactions`, `use-keyboard-shortcuts`).
- `src/dnd/` — the stencil/element/pool/swimlane drag-and-drop pipeline (`on*` handlers are void, `drop*` handlers return the model to select).
- `src/actions/` — imperative actions (import/export, print, fit-to-viewport, label editor, shape replacement).
- `src/configs/` — paper/halo/link-tools configuration and the color palette.
- `src/css/` — global styles: `variables.css` holds the theme (see below), plus fonts, icons, keyframes and print styles.
- `src/effects/`, `src/utils/` — visual drag effects and shared helpers.

## Theming

All colors are CSS variables in `src/css/variables.css`:

- `--bpmn-*` — the app's tokens: the diagram palette (`--bpmn-palette-*`, referenced from the shape defaults and the example diagram, and offered as the inspector's color swatches) and the chrome (backgrounds, borders, text).
- `--jj-*` — reserved for `@joint/react-plus` built-in widget variables (halo, free-transform, snaplines, selection region, navigator, grid color); the app only overrides them.

The dark theme is a `:root[data-theme='dark']` token block — the toolbar's theme toggle flips `document.documentElement.dataset.theme`, and the whole diagram re-colors with it (including the grid dots and native scrollbars via `color-scheme`).
