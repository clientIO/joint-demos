# JointJS+: Tree graph and cycles (JavaScript)

Trees are graphs that do not contain cycles. Each node of a tree has exactly one parent (except the root, which has none). This demo shows how to maintain a tree with automatic tree layout, and also how to allow users to add special backlinks that may create cycles but are not taken into account by automatic layout.

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
