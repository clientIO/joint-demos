# JointJS+: Infinite Paper vs. Sheets (JavaScript)

In JointJS+, various methods exist for determining the paper size. One option involves arbitrary definition, while another allows for dynamic adjustments when an element exceeds its boundary. The canvas dimensions can be specified as a singular sheet or as multiple sheets with distinct borders. This proves particularly effective when utilized alongside the print function. Alternatively, users can opt for an infinite paper approach, which lacks defined borders. To gain a deeper understanding of these techniques, we invite you to explore our interactive demo below, where both approaches can be experimented with.

## How to download this demo

You can download this demo using our `@joint/cli` tool:

```bash
npm install -g @joint/cli
```

Once installed, you can use this command to download the demo:

```bash
joint download infinite-paper-vs-sheets/js
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
