# JointJS+: SysML Parametric Diagram (JavaScript)

SysML is a modeling language for systems engineering, expanding upon UML with additional diagrams. Parametric diagrams (PAR) within SysML focus on modeling relationships between system element parameters, like speed or cost. They enable sensitivity, trade-off, and optimization analyses, aiding informed decisions in system design and performance evaluation.

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
