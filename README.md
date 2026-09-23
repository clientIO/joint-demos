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
allow-remote=all
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
| `screenshot:compare` | `npm run screenshot:compare` | Capture a fresh screenshot per demo and compare it against the committed baseline |
| `link-local-packages` | `npm run link-local-packages` | Repoint every demo's `@joint/*` dependencies at local packages from `.packages/` |

> [!NOTE]
> `build` require Bash. On Windows, run them from Git Bash or WSL.
>
> `screenshot` and `screenshot:compare` require Playwright's Chromium browser. Install it once with:
> ```bash
> npx playwright install chromium
> ```

### Visual regression testing (`screenshot:compare`)

`node .github/scripts/compare-screenshots.mjs [demo-name] [options]` re-renders every demo and diffs the result against its test baseline in `.tests/screenshots/<demo-name>.png`, using [pixelmatch](https://github.com/mapbox/pixelmatch) to flag any demo where more than 1% of pixels differ (configurable). Baselines are kept separate from each demo's own `screenshot.png` (at the demo's root), since that file is sometimes hand-curated for presentation (README/site thumbnails) rather than a reliable rendering snapshot.

A demo with no baseline yet is reported separately and not treated as a failure — run with `--update-baseline` to create one.

For every mismatched demo, `baseline.png`, `actual.png` and `diff.png` are written to `screenshot-diff-results/<demo-name>/` for manual review. The script exits non-zero if any demo mismatches or errors.

Options:
- `--threshold=<percent>` — max allowed % of differing pixels (default `1`)
- `--local-core=<path>` / `--local-plus=<path>` — point `@joint/core` / `@joint/plus` at a local tarball or unpacked package directory instead of installing from npm, useful for testing an unreleased build without needing `JOINTJS_NPM_TOKEN`
- `--local-package=<name>=<path>` — same idea for any other `@joint/*` package (e.g. `@joint/format-visio` for the visio demos, `@joint/layout-directed-graph`, `@joint/format-bpmn-export`). Repeatable to override several packages at once.
- `--local-dir=<path>` — point at a single directory holding several local packages at once (e.g. the output of running `npm pack` for each of them in a JointJS+ checkout). For each demo, every `@joint/*` dependency it declares is matched against a file or folder in this directory named `joint-<name>*.tgz`, `<name>*.tgz`, `joint-<name>/` or `<name>/` (`<name>` is the part after `@joint/`, e.g. `core`, `plus`, `format-visio`). Dependencies with no match install from npm as usual. `--local-core` / `--local-plus` / `--local-package` take precedence over a `--local-dir` match for the same package.
- `--update-baseline` — write the newly captured screenshot as the baseline when a demo differs, or to create a baseline for the first time
- `--baseline-dir=<dir>` — where baselines live (default `.tests/screenshots/`)
- `--out=<dir>` — where to write diff artifacts (default `screenshot-diff-results/`)

```bash
# First-time setup: create a baseline for every demo
npm run screenshot:compare -- --update-baseline

# Compare every demo against its baseline
npm run screenshot:compare

# Compare a single demo
npm run screenshot:compare -- kanban

# Test all demos against a local @joint/plus build instead of npm
npm run screenshot:compare -- --local-plus=../joint-plus/joint-plus-4.4.0.tgz

# Test the visio demos against a local @joint/format-visio build
npm run screenshot:compare -- visio-default-import --local-package=@joint/format-visio=../joint-visio.tgz

# Test everything against a folder containing joint-core-*.tgz, joint-plus-*.tgz,
# joint-format-visio-*.tgz, etc. — only the packages each demo actually uses are swapped in
npm run screenshot:compare -- --local-dir=../joint-packages
```

### Linking local packages repo-wide (`link-local-packages`)

`node .github/scripts/link-local-packages.mjs [options]` permanently repoints every demo's `@joint/*` dependencies at local packages from a `.packages/` folder at the repo root, instead of the temporary per-run overrides `screenshot:compare` uses. Useful for building/running any demo (or `npm run build`) against an unreleased JointJS/JointJS+ build without needing `JOINTJS_NPM_TOKEN`.

It walks every `package.json` in the repo and, for each `@joint/*` dependency, looks for a match in `.packages/` using the same naming convention as `--local-dir` above (`joint-<name>*.tgz`, `<name>*.tgz`, `joint-<name>/` or `<name>/`). Dependencies with no match are left untouched. Matched `package.json` files are rewritten in place and `npm install` is run in each affected demo so the change actually takes effect. A manifest of every file it touched is kept at `.packages/.link-manifest.json` so the change can be undone later with `--restore`, independent of git state.

Options:
- `--packages-dir=<path>` — directory holding the local packages (default `.packages/`)
- `--dry-run` — print what would change without writing anything or installing
- `--skip-install` — rewrite `package.json` files but don't run `npm install`
- `--restore` — undo a previous run using its manifest

```bash
# Preview what would be linked
npm run link-local-packages -- --dry-run

# Link and install for real
npm run link-local-packages

# Revert back to the npm-registry versions
npm run link-local-packages -- --restore
```

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
