# JointJS+ Cables Application

This application shows an interactive way to build multi-wire harnesses by combining cables, screw terminals, and plugs from a drag-and-drop stencil.

## Running the application

Demo requires `Node.js` and `npm`

```
npm install
npm start
```

`npm start` runs the Webpack bundle. Resulted js files are being hosted by webpack-dev-server.

Due to Same-Origin policy implemented in the majority of browsers to prevent content from being accessed if the file exists on another domain, it is recommended to access the application through a **Web server**. The application might work only partially when viewed from a file-system location.

## Build ES6 bundle

```
npm run build_es6
```

This command compiles the TypeScript sources into the `es6/` directory and copies the static assets that ship with the demo.
