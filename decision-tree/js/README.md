# JointJS+: Decision Tree (JavaScript)

An AI-driven experiment based on reinforcement learning can be visualized as a decision tree. Due to the complexity of these graphs, specialized display techniques may be necessary. Strategies such as reducing labels, color-coding links based on outcomes, consolidating branch results, and providing detailed information on request enhance the clarity of the visualization. Below is an example of a decision tree with random data. This interactive demo has been developed using our powerful JavaScript/TypeScript diagramming library. Seamlessly integratable with popular frameworks such as React, Angular, Vue, Svelte, or LightningJS, our library empowers developers to create rich and interactive diagramming applications with ease.

## Running the application

To run this application you need to have access to JointJS+ package. You can get it by having a JointJS+ license or by starting a [free trial](https://www.jointjs.com/free-trial).

### Private npm registry

By default, this application uses JointJS+ from our private npm registry. This example assumes that you have already set up your npm to access JointJS+ package and put your authentication token in the `JOINTJS_NPM_TOKEN` environment variable.

Learn more about our [private npm registry here.](https://docs.jointjs.com/learn/help-center/npm-registry)

### JointJS+ package from local path

If you don't have access to JointJS+ private npm registry but have it downloaded locally, you can install it from a local path by changing the `package.json` file. In that case, replace the line:

```json
    "@joint/plus": "^4.2.2",
```

with

```json
    "@joint/plus": "file:path-to-the-archive/joint-plus.tgz",
```

### Install dependencies

After setting up access to JointJS+ package, install the dependencies by running:

```bash
npm install
```

And then start the application with:

```bash
npm run dev
```
