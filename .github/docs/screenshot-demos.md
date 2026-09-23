# screenshot-demos.mjs

Captures a browser screenshot of each demo and saves it to `.github/screenshots/<demo-name>.png` (untracked by git — this directory is not the same as each demo's own `screenshot.png`, which is hand-curated for README/site thumbnails and is never touched by this script).

## Prerequisites

```bash
npm install playwright
npx playwright install chromium
```

## Usage

```bash
# Screenshot only demos missing a screenshot in .github/screenshots/
node .github/scripts/screenshot-demos.mjs

# Regenerate screenshots for all demos
node .github/scripts/screenshot-demos.mjs --update

# Screenshot a single demo (always runs, even if screenshot exists)
node .github/scripts/screenshot-demos.mjs data-pipeline
```

## How it works

1. Reads `demos.config.json` for variant and skip configuration (same logic as `test-all.sh`)
2. For each demo, detects the dev server type:
   - Vite (`npm run dev`) on port 5173
   - webpack-dev-server (`npm start`) on port 8080
   - Angular (`ng serve`) on port 4200
3. Installs dependencies if `node_modules/` is missing
4. Starts the dev server and waits for it to respond (up to 60s)
5. Opens a headless Chromium browser (1280x800 viewport) via Playwright
6. Waits for `networkidle` + a settle delay for animations to complete
7. Saves `.github/screenshots/<demo-name>.png`
8. Kills the dev server and moves to the next demo

## Notes

- Screenshots are saved to `.github/screenshots/`, keyed by demo name (e.g. `.github/screenshots/data-pipeline.png`), not into the demo's own directory. That folder is gitignored.
- By default, demos that already have a screenshot in `.github/screenshots/` are skipped. Use `--update` to regenerate all screenshots.
- When a specific demo name is provided, it always runs regardless of whether a screenshot exists.
- The script skips demos marked with `skip: true` in `demos.config.json`.

## Related files

- [`demos.config.json`](../../demos.config.json) — per-demo configuration
- [`.github/docs/demos-config.md`](./demos-config.md) — documentation for the config file
- [`.github/docs/test-all.md`](./test-all.md) — documentation for the build/test script
