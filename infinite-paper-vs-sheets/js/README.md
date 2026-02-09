# JointJS+: Infinite Paper vs. Sheets (JavaScript)

In JointJS+, various methods exist for determining the paper size. One option involves arbitrary definition, while another allows for dynamic adjustments when an element exceeds its boundary. The canvas dimensions can be specified as a singular sheet or as multiple sheets with distinct borders. This proves particularly effective when utilized alongside the print function. Alternatively, users can opt for an infinite paper approach, which lacks defined borders. To gain a deeper understanding of these techniques, we invite you to explore our interactive demo below, where both approaches can be experimented with.

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
