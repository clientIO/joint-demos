# JointJS+: Inspector for Selection (JavaScript)

The Inspector and Selection plugins of JointJS+ allow users to view and modify the data of multiple diagram elements simultaneously. The Inspector component evaluates the collection of selected elements and presents the most appropriate value for each property. If all elements have the same property value, it displays that value. If there are varying values, a dash appears in the input field. Properties not supported by any selected element are hidden in the Inspector. For instance, the "corner radius" property won't appear if an ellipse is selected. Any edited property value gets assigned to all currently selected elements.

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
