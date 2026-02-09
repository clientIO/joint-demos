# Kitchen Sink App (React TypeScript)

This application showcases the JointJS+ plugins in action and shows how the plugins
can be combined together. You can use this demo app as a reference for your own application
development.

The application logic is written using [React](https://reactjs.org/) and [TypeScript](https://www.typescriptlang.org/) and built with [Vite](https://vite.dev/guide/). The JointJS library itself is written in JS.

## How to download this demo

You can download this demo using our `@joint/cli` tool:

```bash
npm install -g @joint/cli
```

Once installed, you can use this command to download the demo:

```bash
joint download kitchen-sink/react/ts
```

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
