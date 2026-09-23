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
| `--force` | Continue building remaining demos when a build fails. Without this flag the script exits on the first failure. |

## Environment variables

| Variable | Description |
|----------|-------------|
| `JOINTJS_NPM_TOKEN` | Authentication token for the `@joint` private npm registry. Required for demos that use `@joint/plus`. |

## Related files

- [`demos.config.json`](../../demos.config.json) — per-demo configuration (skip, variant, buildFlags)
- [`.github/docs/demos-config.md`](./demos-config.md) — documentation for the config file
- [`.github/workflows/deploy.yml`](../workflows/deploy.yml) — GitHub Actions workflow that invokes this script
