# JointJS+: Inspector for Selection (JavaScript)

The Inspector and Selection plugins of JointJS+ allow users to view and modify the data of multiple diagram elements simultaneously. The Inspector component evaluates the collection of selected elements and presents the most appropriate value for each property. If all elements have the same property value, it displays that value. If there are varying values, a dash appears in the input field. Properties not supported by any selected element are hidden in the Inspector. For instance, the "corner radius" property won't appear if an ellipse is selected. Any edited property value gets assigned to all currently selected elements.

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
