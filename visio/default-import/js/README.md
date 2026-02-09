# Visio Default Import (JavaScript) <a href="https://www.jointjs.com/jointjs-plus"><img src="../../../_assets/jointjs-plus-badge.svg" alt="JointJS+" width="123" align="right" /></a>

The Visio Default Import demo imports a Microsoft Visio VSDX file and converts it to a JointJS diagram as is.

## How to download this demo

You can download this demo using our [`@joint/cli` tool](https://www.npmjs.com/package/@joint/cli):

```bash
npx @joint/cli download visio/default-import/js
```

Alternatively, you can get the [copy of the repository](https://github.com/clientIO/joint-demos/archive/refs/heads/main.zip) from GitHub as usual.

## Running the application

To run this application you need to have access to JointJS+ package. You can get it by having a JointJS+ license or by starting a [free trial](https://www.jointjs.com/free-trial).

This example uses `.npmrc` file to set up access to the JointJS+ private npm registry.  By default it uses `JOINTJS_NPM_TOKEN` environment variable to get authentication token.

If you are a trial user, you received your access token during the trial sign-up process.
If you are a customer, log in to the customer portal at https://my.jointjs.com to obtain your access token.

Learn more about our [private npm registry here.](https://docs.jointjs.com/learn/help-center/npm-registry)

### JointJS+ packages from local path

If you don't have access to JointJS+ private npm registry but have it downloaded locally, you can install it from a local path by changing the `package.json` file. In that case, replace the line:

```json
    "@joint/plus": "^4.2.2",
    "@joint/format-visio": "^4.2.2"
```

with

```json
    "@joint/plus": "file:path-to-the-archive/joint-plus.tgz",
    "@joint/format-visio": "file:path-to-the-archive/joint-format-visio.tgz"
```

### Install dependencies

After setting up access to JointJS+ package, install the dependencies by running:

```bash
npm install
```

And then start the application with:

```bash
npm run dev
```
