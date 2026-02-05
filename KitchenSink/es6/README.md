# JointJS+ Demo Application - JavaScript

This application showcases the JointJS+ plugins in action and shows how the plugins
can be combined together. You can use this demo app as a reference for your own application
development.

The application is also available online [on our website](https://www.jointjs.com/demos/kitchen-sink-app).

## Running the application

A simple HTTP server (requires `Node.js` and `npm`) is part of this demo. Run the following commands from the `KitchenSink/Js` directory:

```
npm install
npm start
```

## Develop the application

The source code is meant to serve as a boilerplate for your application. You are encouraged to start editing the source files to tailor the application to your needs.

Here is the breakdown of the folders in this project:

### `./js`

All _JS_ source codes. The entry point to the application is `./js/index.js`.

### `./js/config`

This application introduces various JSON configuration files for quick application customization.
Note that everything you configure here using JSON can be also done programmatically using the JointJS API.

- `font-style-sheet.js` - add additional fonts that are used on export to SVG or PNG
- `halo.js` - add/remove element tools
- `inspector.js` - define inputs in the property editor on the right
- `sample-graphs.js` - JSON (serialized) representation of the default graph shown on startup
- `selection.js` - add/remove selection tools
- `stencil.js` - define groups and shapes in the element palette on the left
- `toolbar.js` - add/remove toolbar tools in the toolbar at the top

### `./js/shapes`

The application uses built-in shapes and introduces several custom ones.

Note that in _JointJS_ terminology, the `graph` (model for a `paper` or canvas) contains of `cells` (shapes). A `cell` is either an `element` (node) or a `link` (edge).

- `links.js` - if you want to introduce a new custom link to your app or modify the default link, check out this file.
- `navigator.js` - custom element view that renders simplified shapes inside the navigator.
- `stencil-highlighter.js` - custom highlighter view that renders a rectangle below a shape that is being hovered in stencil

### `./js/views`

The application organizes its interfaces into logical views.

- `main.js` - the main application view that initializes the application components and configures the interactions.

### `./assets`

Static files (e.g fonts, icons) served from the local server to the browser.

### `./css`

Various CSS stylesheets.
