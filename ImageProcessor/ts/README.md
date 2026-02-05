# JointJS+ Image Processor Application

Process your images by combining and filtering them to get something new.

This application provides node-based image filtering and transforming tool. The application allows the creating of a complex processing workflow with different steps. The built-in example provides a workflow for the TTRPG token creation.
## Running the application

Demo requires `Node.js` and `npm`

```
npm install
npm start
```

`npm start` runs the Webpack bundle. Resulted js files are being hosted by webpack-dev-server.

Due to Same-Origin policy implemented in the majority of browsers to prevent content from being accessed if the file exists on another domain, it is recommended to access the application through a **Web server**. The application might work only partially when viewed from a file-system location.

