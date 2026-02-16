# JointJS + Angular: Data Pipeline

This example demonstrates a data pipeline diagram built with JointJS and Angular, featuring automatic orthogonal link routing using the [libavoid](https://github.com/nicknisi/libavoid-js) WASM library.

<a href="https://stackblitz.com/github/clientio/joint-demos/tree/main/data-pipeline/angular">
  <img
    alt="Open in StackBlitz"
    src="https://developer.stackblitz.com/img/open_in_stackblitz.svg"
  />
</a>

## Features

- **Data Pipeline Visualization**: Nodes represent pipeline stages (Database, Transform, Aggregate, Dashboard, etc.) with typed input/output ports
- **Automatic Routing**: Links are routed orthogonally around nodes using the libavoid WASM library running in a Web Worker to keep the UI responsive
- **Live Re-routing**: Dragging nodes triggers automatic re-routing of all connected links in the background worker
- **PaperScroller**: Pan and zoom the diagram with trackpad or mouse
- **Navigator**: Minimap with simplified element views for quick orientation
- **Undo/Redo**: Command manager tracks user actions while excluding router-generated changes from the history
- **Toolbar**: Undo/redo, zoom slider, auto layout, and export buttons (PNG, SVG, JSON)
- **Fallback Router**: Uses JointJS `rightAngle` router when libavoid cannot find a valid route

## Running the Example

```bash
# Install dependencies
npm install

# Start development server
npm start
```

Navigate to `http://localhost:4200/` in your browser.

## Requirements

- Angular 19+
- JointJS @joint/plus

## Project Structure

```
src/
├── main.ts                           # Angular bootstrap
├── styles.css                        # Global styles
├── index.html                        # HTML entry point
└── app/
    ├── app.component.ts              # Main component with JointJS setup
    ├── app.component.html            # Layout template
    ├── app.component.css             # Layout styles
    ├── routing/
    │   ├── avoid-router.js           # Libavoid WASM router integration
    │   └── avoid-router.worker.js    # Web worker for off-thread routing
    └── models/
        ├── node.ts                   # Node shape with left/right port groups
        ├── edge.ts                   # Link with arrow marker
        └── port-layouts.ts           # Custom port layout (vertical fixed offsets)
```
