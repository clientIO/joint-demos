# JointJS+: Kitchen Sink App (Angular) <a href="https://www.jointjs.com/jointjs-plus"><img src="../../jointjs-plus-badge.svg" alt="JointJS+" width="123" align="right" /></a>

This application showcases the JointJS+ plugins in action and shows how the plugins
can be combined together. You can use this demo app as a reference for your own application
development.

This project was generated with [Angular CLI](https://github.com/angular/angular-cli).

## How to download this demo

You can download this demo using our [`@joint/cli` tool](https://www.npmjs.com/package/@joint/cli):

```bash
npx @joint/cli download kitchen-sink/angular
```

Alternatively, you can get the [copy of the repository](https://github.com/clientIO/joint-demos/archive/refs/heads/main.zip) from GitHub as usual.

## Running the application

To run this application you need to have access to JointJS+ package. You can get it by having a JointJS+ license or by starting a [free trial](https://www.jointjs.com/free-trial).

This example uses `.npmrc` file to set up access to the JointJS+ private npm registry.  By default it uses `JOINTJS_NPM_TOKEN` environment variable to get authentication token.

If you are a trial user, you received your access token during the trial sign-up process.
If you are a customer, log in to the customer portal at https://my.jointjs.com to obtain your access token. Learn more about our [private npm registry here.](https://docs.jointjs.com/learn/help-center/npm-registry)

After setting up access to JointJS+ package, install the dependencies by running:

```bash
npm install
```

## Available Scripts

### Development server

```bash
ng serve
```

Start a dev server at `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

### Code scaffolding

```bash
ng generate component component-name
```

Generate a new component `component-name` in your project. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

### Build

```bash
ng build
```

Build the project. The build artifacts are stored in the `dist/` directory. Use the `--prod` flag for a production build.

## Running unit tests

```bash
ng test
```

Execute unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

```bash
ng e2e
```

Execute end-to-end tests via [Cypress](https://docs.cypress.io/guides/overview/why-cypress).

## Further help

To get more help on the Angular CLI, run `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).
