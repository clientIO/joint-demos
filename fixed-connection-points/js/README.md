# JointJS+: Fixed Connection Points (JavaScript) <a href="https://www.jointjs.com/jointjs-plus"><img src="../../_assets/jointjs-plus-badge.svg" alt="JointJS+" width="123" align="right" /></a>

Various configurations are available for link management in different software. A typical method in diagramming tools involves placing several connection points around the perimeter of an element. This allows users to form links solely from these points, with the link targets also restricted to these specific points. This strategy streamlines the interface and aids in creating parallel links between elements, for example. For implementing this in JointJS, incorporating ports into your models is an option. However, an alternative and effective approach is to manage it at the logical level using link anchors, a custom highlighter, and some mathematics. Experience this technique in the demo app below.

## How to download this demo

You can download this demo using our [`@joint/cli` tool](https://www.npmjs.com/package/@joint/cli):

```bash
npx @joint/cli download fixed-connection-points/js
```

Alternatively, you can get the [copy of the repository](https://github.com/clientIO/joint-demos/archive/refs/heads/main.zip) from GitHub as usual.

## Running the application

To run this application you need to have access to JointJS+ package. You can get it by having a JointJS+ license or by starting a [free trial](https://www.jointjs.com/free-trial).

This example uses `.npmrc` file to set up access to the JointJS+ private npm registry.  By default it uses `JOINTJS_NPM_TOKEN` environment variable to get authentication token.

If you are a trial user, you received your access token during the trial sign-up process.
If you are a customer, log in to the customer portal at https://my.jointjs.com to obtain your access token. Learn more about our [private npm registry here.](https://docs.jointjs.com/learn/help-center/npm-registry)

After setting up access to JointJS+ package, install the dependencies by running:

```bash
npm install
```

And then start the application with:

```bash
npm run dev
```
