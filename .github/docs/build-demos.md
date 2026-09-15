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

# Build only the demos that depend on a JointJS+ package
bash .github/scripts/build-demos.sh --plus-only

# Print what would be built, without building it
bash .github/scripts/build-demos.sh --plus-only --list-only
```

`--list-only` prints nothing but demo names to stdout, one per line — every
other message goes to stderr — so its output can be fed straight back in as a
`--demos` list.

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
| `--plus-only` | Build only demos that depend on a JointJS+ package (`@joint/plus`, `@joint/react-plus`, `@joint/format-*`, `@joint/shapes-vsm`). Open-source-only demos are left out. |
| `--list-only` | Print the demos that would be built, one per line, and exit without building or touching `_site/`. |

`--plus-only` reads the `dependencies` and `devDependencies` of the variant that
would actually be built, not the text of `package.json`. That matters after
[`link-local-packages.mjs`](../scripts/link-local-packages.mjs) has run: the
`overrides` block it adds names every local package, so matching on text would
select every demo.

## Environment variables

| Variable | Description |
|----------|-------------|
| `JOINTJS_NPM_TOKEN` | Authentication token for the `@joint` private npm registry. Required for demos that use `@joint/plus`. |
| `CLEANUP` | Set to `1` or `true` to delete each demo's `node_modules/` and `dist/` once its output has been copied into `_site/`. A CI runner has no room to keep every demo's dependencies at once. Opt-in, because it is destructive to a local checkout. |

## Related files

- [`demos.config.json`](../../demos.config.json) — per-demo configuration (skip, variant, buildFlags)
- [`.github/docs/demos-config.md`](./demos-config.md) — documentation for the config file
- [`.github/workflows/build-demos.yml`](../workflows/build-demos.yml) — builds the demos on pull requests, and is the workflow `clientIO/joint-plus` calls to test them against an unreleased JointJS+
- [`.github/workflows/deploy.yml`](../workflows/deploy.yml) — GitHub Actions workflow that invokes this script
