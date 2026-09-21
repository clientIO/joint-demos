# build-demos.sh

Build script that compiles demos and assembles them into a `_site/` directory for deployment to GitHub Pages.

## Usage

```bash
# Build all demos (stops on first failure)
bash .github/scripts/build-demos.sh

# Build a single demo
bash .github/scripts/build-demos.sh data-pipeline

# Build all demos, continuing past failures
bash .github/scripts/build-demos.sh --force

# Build several named demos
bash .github/scripts/build-demos.sh --demos charts,kitchen-sink
```

## How it works

1. Iterates over top-level directories in the repository root
2. For each demo, resolves which variant (subdirectory) to build:
   - Checks `demos.config.json` for a `variant` override
   - Falls back to `ts/` then `js/`
3. Detects the build tool and sets appropriate flags:
   - Vite projects get `--base=./ --mode=production`
   - Other projects get `--mode=production`
   - `buildFlags` in `demos.config.json` overrides the defaults (e.g. `--configuration production` for Angular)
4. Runs `npm install` and `npm run build` in the variant directory
5. Copies `dist/` output into `_site/<demo-name>/`
6. Generates an `_site/index.html` with links to all built demos
7. Prints a summary of built, failed, and skipped demos
8. Exits with code 1 if any demo failed. By default the script stops on the first failure; use `--force` to build all demos before exiting

## Options

| Flag | Description |
|------|-------------|
| `--force` | Continue building remaining demos when a build fails. Without this flag no further demo is started after a failure (the ones already running are left to finish). |
| `--jobs N` | How many demos to build at once. Defaults to the machine's core count, capped at 4. |
| `--demos a,b,c` | Build only these demos. Repeatable, and combines with a bare demo name. |

## Environment variables

| Variable | Description |
|----------|-------------|
| `JOINTJS_NPM_TOKEN` | Authentication token for the `@joint` private npm registry. Required for demos that use `@joint/plus`. |
| `CLEANUP` | Set to `1` or `true` to delete each demo's `node_modules/` and `dist/` once its output has been copied into `_site/`. A CI runner has no room to keep every demo's dependencies at once. Opt-in, because it is destructive to a local checkout. |

## Related files

- [`demos.config.json`](../../demos.config.json) — per-demo configuration (skip, variant, buildFlags)
- [`.github/docs/demos-config.md`](./demos-config.md) — documentation for the config file
- [`.github/workflows/build-demos.yml`](../workflows/build-demos.yml) — builds the demos on pushes to `main`, and is callable by another repository to build them against `@joint/*` packages it has built itself
- [`.github/workflows/deploy.yml`](../workflows/deploy.yml) — GitHub Actions workflow that invokes this script

## Why no pull request check

Building a demo runs `npm install --ignore-scripts=false` and then its build
script, both of which execute code from the commit under test, and the build
needs `JOINTJS_NPM_TOKEN`. A pull request opened from a branch of this
repository **does** receive repository secrets, so a `pull_request` trigger
would hand that credential to unreviewed code, which could read it out of the
environment and exfiltrate it.

So the demos are built after merge instead: on pushes to `main`, on demand via
**Run workflow**, and on `workflow_call` from another repository. Every one of
those runs code that has already been reviewed, or is started by someone who can
already push. This is the same trust model `deploy.yml` has always relied on.

## Which commit gets built

| `demos_ref` | Builds |
|---|---|
| not given | the commit under test — what our own runs want |
| given, and the ref exists here | that ref |
| given, but no such ref | the default branch |

Asking for a ref that does not exist is a fallback rather than an error, so a
caller can request a branch unconditionally and get the default whenever that
branch is absent, without either side tracking whether it exists. Branches and
tags are what `demos_ref` accepts.

The last row resolves the default branch rather than reusing the commit the
workflow file came from, so that a caller pinning `uses:` to a commit — to
control which version of this workflow runs — does not thereby freeze which
demos get built. A remote that cannot be read fails the job instead of quietly
building something else. The run summary records which ref was used and why.
