# JointJS+: Shape Builder (JavaScript)

Some applications necessitate the capability for users to create diagram shapes via a user interface. Users need to have the flexibility to define various attributes of the shape, such as its color, name, and the type of data it can contain, which may include numbers, text, and other kinds of data. In the demo below, we present a method that enables users to initially set up shape metadata using forms offered by the ui.inspector plugin. This shape is then incorporated into the stencil as a template for later use. Users can later modify the specific data of the shape, once again utilizing the Inspector.

## Running the application

To run this application you need to have access to JointJS+ package. You can get it by having a JointJS+ license or by starting a [free trial](https://www.jointjs.com/free-trial).

### Private npm registry

By default, this application uses JointJS+ from our private npm registry. This example assumes that you have already set up your npm to access JointJS+ package and put your authentication token in the `JOINTJS_NPM_TOKEN` environment variable.

Learn more about our [private npm registry here.](https://docs.jointjs.com/learn/help-center/npm-registry)

### Install dependencies

After setting up access to JointJS+ package, install the dependencies by running:

```bash
npm install
```

And then start the application with:

```bash
npm run dev
```
