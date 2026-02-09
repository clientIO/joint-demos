# JointJS+: Clipboard API Integration (JavaScript)

Explore our integration with the Clipboard API, which serves as a bridge between JointJS+ and the system clipboard. With this powerful API, demonstrated in the demo below, you can copy and paste diagram data between different native and web applications. Note that you can copy diagram content in two different formats: a "web application/join" type that can be used in another application that supports JointJS data, and a "text/plain" type, which is a textual representation of diagram data that can be pasted into any OS environment (such as your notepad application). In addition, you can copy and paste generic text and images from the OS clipboard - such objects will be inserted into the diagram as corresponding elements.

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
