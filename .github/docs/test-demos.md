# test-demos.sh

Builds every demo and runs the tests of those that define any. Reports which demos failed, and exits non-zero if any did.

This is the testing counterpart of [`build-demos.sh`](./build-demos.md). Building is part of the test: the scheduled joint-plus run exists to find out whether every demo still compiles against a fresh `@joint/*` build, so a demo that no longer builds has failed whether or not it defines any tests.

## Usage

```bash
# Build and test all demos (stops after the first failure)
bash .github/scripts/test-demos.sh

# One demo, or several
bash .github/scripts/test-demos.sh data-pipeline
bash .github/scripts/test-demos.sh data-pipeline charts

# Keep going past failures
bash .github/scripts/test-demos.sh --force

# Several named demos
bash .github/scripts/test-demos.sh --demos charts,kitchen-sink
```

## How it works

1. Iterates over top-level directories in the repository root
2. For each demo, resolves which variant (subdirectory) to use:
   - Checks `demos.config.json` for a `variant` override
   - Falls back to `ts/` then `js/`
3. Detects the build tool and sets appropriate flags:
   - Vite projects get `--base=./ --mode=production`
   - Other projects get `--mode=production`
   - `buildFlags` in `demos.config.json` overrides the defaults (e.g. `--configuration production` for Angular)
4. Runs `npm install` and `npm run build` in the variant directory, and checks that a `dist/` was produced
5. Runs `npm test` if the demo defines a `test` script. Most demos define none, which is not a failure — only a test that runs and fails marks the demo failed
6. Prints a summary of built, tested, failed and skipped demos
7. Exits with code 1 if any demo failed. By default the script stops starting new demos after the first failure; use `--force` to run them all before exiting
8. Exits with code 2, before doing any work, if an argument is invalid or a selected demo name matches no directory — a typo would otherwise test nothing and still report success

Nothing is copied into `_site/`, and no `index.html` is generated. Each demo's build output is left in its own `dist/` (or removed, with `CLEANUP`).

## Options

| Flag | Description |
|------|-------------|
| `--force` | Continue with the remaining demos when one fails. Without this flag no further demo is started after a failure (the ones already running are left to finish). |
| `--jobs N` | How many demos to work on at once. Defaults to the machine's core count, capped at 4. |
| `--demos a,b,c` | Only these demos. Repeatable, and adds to the same list as any bare demo names. |

## Environment variables

| Variable | Description |
|----------|-------------|
| `JOINTJS_NPM_TOKEN` | Authentication token for the `@joint` private npm registry. Required for demos that use `@joint/plus`. |
| `CLEANUP` | Set to `1` or `true` to delete each demo's `node_modules/` and `dist/` once it is done. A CI runner has no room to keep every demo's dependencies at once. Opt-in, because it is destructive to a local checkout. |

## Related files

- [`demos.config.json`](../../demos.config.json) — per-demo configuration (skip, variant, buildFlags)
- [`.github/docs/demos-config.md`](./demos-config.md) — documentation for the config file
- [`.github/workflows/test-demos.yml`](../workflows/test-demos.yml) — GitHub Actions workflow that invokes this script (can be called by another repository with its own locally built `@joint/*` packages)
