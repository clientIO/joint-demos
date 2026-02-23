# screenshot-demos.mjs

Captures a browser screenshot of each demo and saves it as `screenshot.png` in the demo's root directory. Also inserts the image reference into each demo's `README.md`.

## Prerequisites

```bash
npm install playwright
npx playwright install chromium
```

## Usage

```bash
# Screenshot only demos missing a screenshot.png
node .github/scripts/screenshot-demos.mjs

# Regenerate screenshots for all demos
node .github/scripts/screenshot-demos.mjs --update

# Screenshot a single demo (always runs, even if screenshot exists)
node .github/scripts/screenshot-demos.mjs data-pipeline
```

## How it works

1. Reads `demos.config.json` for variant and skip configuration (same logic as `build-demos.sh`)
2. For each demo, detects the dev server type:
   - Vite (`npm run dev`) on port 5173
   - webpack-dev-server (`npm start`) on port 8080
   - Angular (`ng serve`) on port 4200
3. Installs dependencies if `node_modules/` is missing
4. Starts the dev server and waits for it to respond (up to 60s)
5. Opens a headless Chromium browser (1280x800 viewport) via Playwright
6. Waits for `networkidle` + a settle delay for animations to complete
7. Saves `screenshot.png` in the demo's root directory
8. Inserts `![screenshot](./screenshot.png)` into the demo's `README.md` (after the first heading)
9. Kills the dev server and moves to the next demo

## Notes

- Screenshots are saved in the demo root (e.g. `data-pipeline/screenshot.png`), not the variant subdirectory, so they appear alongside the top-level `README.md`.
- By default, demos that already have a `screenshot.png` are skipped. Use `--update` to regenerate all screenshots.
- When a specific demo name is provided, it always runs regardless of whether a screenshot exists.
- The script skips demos marked with `skip: true` in `demos.config.json`.

## Related files

- [`demos.config.json`](../../demos.config.json) — per-demo configuration
- [`.github/docs/demos-config.md`](./demos-config.md) — documentation for the config file
- [`.github/docs/build-demos.md`](./build-demos.md) — documentation for the build script
