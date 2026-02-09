# JointJS+: Connecting nodes by dragging and dropping (JavaScript)

Have you ever wondered how to create a new connection when the user drags one element over another, or over a link that connects two elements with enough space between them? Or how to automatically place a new element next to the destination element and let the user choose the direction in which to place it? Check out this demo to see how you can achieve both scenarios, using SVG previews to help the user understand the impact of each drop action.

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
