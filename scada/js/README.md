# JointJS+: SCADA (Piping and Instrumentation Diagram) (JavaScript)

Piping and Instrumentation Diagrams (P&IDs) are integral components of Supervisory Control and Data Acquisition (SCADA) systems, providing a visual representation of the interconnected piping, equipment, and instrumentation in industrial processes. By incorporating real-time data and interactive features, P&IDs enhance the monitoring, control, and maintenance capabilities of SCADA systems, contributing to the efficient and safe operation of complex industrial facilities.

## How to download this demo

You can download this demo using our `@joint/cli` tool:

```bash
npm install -g @joint/cli
```

Once installed, you can use this command to download the demo:

```bash
joint download scada/js
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
