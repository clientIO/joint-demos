# JointJS Demos & Boilerplates

Welcome to the JointJS demos repository! This collection contains over 170+ production-ready demos and boilerplates showcasing the powerful features and capabilities of JointJS. Whether you're building flowcharts, org charts, BPMN diagrams, network diagrams, or any other type of interactive diagram, you'll find a demo here to help you get started.

You can find preview of all the demos on our website at [https://www.jointjs.com/demos](https://www.jointjs.com/demos).

## 🚀 Quick Start

### Using the Joint CLI (Recommended)

The easiest way to download and run individual demos is using the official `@joint/cli` tool:

```bash
# Install the CLI globally
npm install -g @joint/cli

# Download a specific demo
joint download <demo-name>

# Example: Download the Kanban demo
joint download kanban/js
```

After the download is complete, navigate to the demo directory and install dependencies:

```bash
npm install
```

> [!IMPORTANT]
> You must have a valid JointJS+ token configured in your `.npmrc` file to access the private npm registry and install dependencies. See the [Obtaining Your JointJS+ Token](#-obtaining-your-jointjs-token) section below for instructions on how to get and configure your token.

Then start the demo according to the instructions in the demo's README file (usually `npm run dev` or `npm run start`).

For more information, visit the [@joint/cli npm package](https://www.npmjs.com/package/@joint/cli).

### Manual Installation

Alternatively, you can clone this repository and navigate to any demo directory:

```bash
# Clone the repository
git clone https://github.com/your-org/joint-demos.git
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
//npm.jointjs.com/:_authToken=${JOINTJS_NPM_TOKEN}`
```

They use an environment variable `JOINTJS_NPM_TOKEN` to securely store your access token. You need to set this environment variable with your JointJS+ token before installing dependencies.

If you are a trial user, you received your access token during the trial sign-up process.
If you are a customer, log in to the customer portal at https://my.jointjs.com to obtain your access token.

> [!NOTE]
> Access to the npm registry is available while your subscription to JointJS updates is active. Once the subscription expires, registry access will be disabled, but you can continue using JointJS from the ZIP archive you can [download from the customer portal](./downloading-jointjs-plus).

Learn more about our [private npm registry here.](https://docs.jointjs.com/learn/help-center/npm-registry)

## 🤝 Resources

- **Documentation**: [https://docs.jointjs.com/](https://docs.jointjs.com/)
- **API Reference**: [https://docs.jointjs.com/api/](https://docs.jointjs.com/api/alg/)
- **JointJS Repository**: [https://github.com/clientIO/joint](https://github.com/clientIO/joint)
- **Website**: [https://www.jointjs.com](https://www.jointjs.com)
