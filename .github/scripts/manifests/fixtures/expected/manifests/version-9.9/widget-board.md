---
demo: "widget-board"
version: "9.9"
edition: "commercial"
title: "JointJS+: Widget Board"
---

# JointJS+: Widget Board

The Widget Board demo lets users arrange dashboard widgets on a grid and connect them with links.

**Edition:** commercial

**Keywords:** Dashboard, Drag & Drop, widget grid

## Variant: js

**demo_id:** version-9.9/widget-board/js
**Packages:** @joint/plus
**Uses:** dia.Graph, dia.Paper, highlighters.addClass, ui.Stencil

### Source files

- index.html
- package.json
- src/index.js

## Variant: react-js

**demo_id:** version-9.9/widget-board/react-js
**Packages:** @joint/plus
⚠ **API note:** this variant uses the imperative `@joint/plus` API inside React, not the declarative React package. For new React apps call `get_started(framework="react")` and prefer `@joint/react` — or `@joint/react-plus` if the project has a JointJS+ license (this demo relies on JointJS+ features). Adapt this demo's ideas, not its integration pattern.
**Uses:** dia.Paper

### Source files

- package.json
- src/App.jsx

## Variant: react-ts

**demo_id:** version-9.9/widget-board/react-ts
**Packages:** @joint/react-plus
**Uses:** GraphProvider, Paper

### Source files

- package.json
- src/App.tsx
