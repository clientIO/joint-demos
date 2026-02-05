# JointJS+ BPMN Editor Application

A BPMN editor application built with JointJS+ showing pools, swimlanes, activities, events, gateways, data objects, annotations, and BPMN-aware editing UX (stencil, inspector, snaplines, minimap, import/export).

## Running the application

Demo requires `Node.js` and `npm`

```
npm install
npm start
```

`npm start` runs the Webpack bundle. Resulted js files are being hosted by webpack-dev-server.

Due to Same-Origin policy implemented in the majority of browsers to prevent content from being accessed if the file exists on another domain, it is recommended to access the application through a **Web server**. The application might work only partially when viewed from a file-system location.

