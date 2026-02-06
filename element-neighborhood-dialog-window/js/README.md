# JointJS+: Element Neighborhood Dialog Window (JavaScript)

When working with a large number of objects, it is useful to activate a local view and drill down into the surroundings of a specific element. In this demo, we show you multiple element relationships and local views: Neighbors, Successors, Predecessors, Siblings and Path from Element, all displayed as a floating popup that can be freely placed anywhere on the paper. In addition, the demo shows how to incorporate subscript and superscript into HTML.

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
