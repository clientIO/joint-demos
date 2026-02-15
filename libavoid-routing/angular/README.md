# JointJS + Angular: Libavoid Routing

This example demonstrates how to use the [libavoid](https://github.com/nicknisi/libavoid-js) WASM library with JointJS and Angular for automatic orthogonal link routing around obstacles.

<a href="https://stackblitz.com/github/clientio/joint-demos/tree/main/libavoid-routing/angular">
  <img
    alt="Open in StackBlitz"
    src="https://developer.stackblitz.com/img/open_in_stackblitz.svg"
  />
</a>

## Features

- **Automatic Routing**: Links are routed orthogonally around nodes using the libavoid WASM library
- **Port-based Connections**: Nodes have left (input) and right (output) port groups with labeled ports
- **Live Re-routing**: Dragging nodes triggers automatic re-routing of all connected links
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
- JointJS @joint/core or @joint/plus

## Project Structure

```
src/
├── main.ts                           # Angular bootstrap
├── styles.css                        # Global styles
├── index.html                        # HTML entry point
└── app/
    ├── app.component.ts              # Main component with JointJS + AvoidRouter setup
    ├── app.component.html            # Paper container template
    ├── app.component.css             # Layout styles
    ├── models/
    │   ├── node.ts                   # Node shape with left/right port groups
    │   └── edge.ts                   # Link with arrow marker
    └── shared/
        └── avoid-router.js           # Libavoid WASM router integration
```
