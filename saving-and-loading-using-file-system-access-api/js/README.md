# JointJS: Saving and Loading Using File System Access API (JavaScript)

Wondering how to allow users to save and load diagrams from the local file system? Check out the integration with the File System Access API to help accomplish this.

<a href="https://stackblitz.com/github/clientio/joint-demos/tree/main/saving-and-loading-using-file-system-access-api/js" target="_blank">
  <img
    alt="Open in StackBlitz"
    src="https://developer.stackblitz.com/img/open_in_stackblitz.svg"
  />
</a>

This demo is also available online at [jointjs.com](https://jointjs.com/demos/saving-and-loading-using-file-system-access-api).

## How to download this demo

You can download this demo using our [`@joint/cli` tool](https://www.npmjs.com/package/@joint/cli):

```bash
npx @joint/cli download saving-and-loading-using-file-system-access-api/js
```

Alternatively, you can get the [copy of the repository](https://github.com/clientIO/joint-demos/archive/refs/heads/main.zip) from GitHub as usual.

## Running the application

To run this application you need to have access to JointJS+ package. You can get it by having a JointJS+ license or by starting a [free trial](https://www.jointjs.com/free-trial).

If you are a trial user, you received your access token during the trial sign-up process.
If you are a customer, log in to the customer portal at https://my.jointjs.com to obtain your access token.

This example uses `.npmrc` file to set up access to the JointJS+ private npm registry. By default it uses `JOINTJS_NPM_TOKEN` environment variable to get authentication token. You can set this environment variable in your terminal or CI environment in the following way:

**macOS / Linux**:
```sh
export JOINTJS_NPM_TOKEN="jjs-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**Windows (PowerShell)**:
```sh
$env:JOINTJS_NPM_TOKEN="jjs-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Learn more about our [private npm registry here.](https://docs.jointjs.com/learn/help-center/npm-registry)

After setting up access to JointJS+ package, install the dependencies by running:

```bash
npm install
```

And then start the application with:

```bash
npm run dev
```
