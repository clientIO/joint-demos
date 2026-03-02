# JointJS Demos & Boilerplates

![Unique Demos](https://img.shields.io/github/directory-file-count/clientio/joint-demos?type=dir&label=Unique%20Demos)

Welcome to the JointJS demos repository! This collection contains community examples as well as JointJS+ commercial applications showcasing the powerful features and capabilities of JointJS. Whether you're building flowcharts, org charts, BPMN diagrams, network diagrams, or any other type of interactive diagram, you'll find a demo here to help you get started.

You can find a preview of all the demos on our website at [https://www.jointjs.com/demos](https://www.jointjs.com/demos).

## 🚀 Quick Start

### Using the Joint CLI (Recommended)

The easiest way to download and run individual demos is using the official `@joint/cli` tool:

```bash
# Install the CLI globally
npm install -g @joint/cli

# List all available demos
joint list

# Download a specific demo
joint download <demo-name>

# Example: Download the Kanban demo
joint download kanban/js
```

For more information, visit the [@joint/cli npm package](https://www.npmjs.com/package/@joint/cli).

After the download is complete, navigate to the demo directory and install dependencies:

```bash
npm install
```

> [!IMPORTANT]
> For JointJS+ demos, you must have a valid JointJS+ token configured in your `.npmrc` file to access the private npm registry and install dependencies. See the [Obtaining Your JointJS+ Token](#-obtaining-your-jointjs-token) section below for instructions on how to get and configure your token.

Then start the demo according to the instructions in the demo's README file (usually `npm run dev` or `npm start`).

### Manual Installation

Alternatively, you can clone this repository and navigate to any demo directory:

```bash
# Clone the repository
git clone https://github.com/clientIO/joint-demos.git
cd joint-demos

# Navigate to a demo (e.g., flowchart)
cd flowchart/js

# Install dependencies
npm install

# Run the demo
npm run dev
```

## 🔑 Using JointJS+ NPM Repository

JointJS+ demos require a valid license token to access the npm registry. You can get it by having a JointJS+ license or by starting a [free trial](https://www.jointjs.com/free-trial).

All demos have `.npmrc` files configured to use the private registry at `https://npm.jointjs.com/`, which requires authentication. By default, the `.npmrc` file looks like this:

```
@joint:registry=https://npm.jointjs.com
always-auth=true
//npm.jointjs.com/:_authToken=${JOINTJS_NPM_TOKEN}
```

### How to obtain access token

If you are a trial user, you received your access token during the trial sign-up process.
If you are a customer, log in to the customer portal at https://my.jointjs.com to obtain your access token.

Learn more about our [private npm registry here.](https://docs.jointjs.com/learn/help-center/npm-registry)

### Set the token as an environment variable

We are using an environment variable `JOINTJS_NPM_TOKEN` to securely access your token. You need to set this environment variable with your JointJS+ token before installing dependencies.

You can define the `JOINTJS_NPM_TOKEN` environment variable in your terminal or CI environment in the following way:

**macOS / Linux**:
```sh
export JOINTJS_NPM_TOKEN="jjs-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**Windows (PowerShell)**:
```sh
$env:JOINTJS_NPM_TOKEN="jjs-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

## 🛠️ Root Scripts

After cloning the repository, install the root dev dependencies once:

```bash
npm install
```

The following scripts are then available from the repository root:

| Script | Command | Description |
|---|---|---|
| `lint` | `npm run lint` | Lint all JS/TS files using the root ESLint config |
| `build` | `npm run build` | Build all demos into `_site/` (stops on first failure) |
| `screenshot` | `npm run screenshot` | Capture screenshots for demos that don't have one yet |

> [!NOTE]
> `build` require Bash. On Windows, run them from Git Bash or WSL.
>
> `screenshot` require Playwright's Chromium browser. Install it once with:
> ```bash
> npx playwright install chromium
> ```

## 🤝 Resources

- [Documentation](https://docs.jointjs.com/)
- [Website](https://www.jointjs.com)
- [Support](https://github.com/clientIO/joint/discussions)
- [Report an Issue](https://https://github.com/clientIO/joint/issues)

**Packages**
- [@joint/core on npm](https://www.npmjs.com/package/@joint/core)
- [@joint/cli on npm](https://www.npmjs.com/package/@joint/cli)

**Source Code**
- [JointJS on GitHub](https://github.com/clientIO/joint)
- [Documentation on GitHub](https://github.com/clientIO/joint-docs)
