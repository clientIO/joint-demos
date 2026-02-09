# JointJS+: Shape Builder (JavaScript) <a href="https://www.jointjs.com/jointjs-plus"><img src="../../_assets/jointjs-plus-badge.svg" alt="JointJS+" width="123" align="right" /></a>

Some applications necessitate the capability for users to create diagram shapes via a user interface. Users need to have the flexibility to define various attributes of the shape, such as its color, name, and the type of data it can contain, which may include numbers, text, and other kinds of data. In the demo below, we present a method that enables users to initially set up shape metadata using forms offered by the ui.inspector plugin. This shape is then incorporated into the stencil as a template for later use. Users can later modify the specific data of the shape, once again utilizing the Inspector.

## How to download this demo

You can download this demo using our [`@joint/cli` tool](https://www.npmjs.com/package/@joint/cli):

```bash
npx @joint/cli download shape-builder/js
```

Alternatively, you can get the [copy of the repository](https://github.com/clientIO/joint-demos/archive/refs/heads/main.zip) from GitHub as usual.

## Running the application

To run this application you need to have access to JointJS+ package. You can get it by having a JointJS+ license or by starting a [free trial](https://www.jointjs.com/free-trial).

This example uses `.npmrc` file to set up access to the JointJS+ private npm registry.  By default it uses `JOINTJS_NPM_TOKEN` environment variable to get authentication token.

If you are a trial user, you received your access token during the trial sign-up process.
If you are a customer, log in to the customer portal at https://my.jointjs.com to obtain your access token.

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
