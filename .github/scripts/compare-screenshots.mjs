#!/usr/bin/env node

/**
 * Captures a fresh screenshot of each demo and compares it against its test
 * baseline in .github/tests/screenshots/, flagging any demo whose rendered
 * output has visibly changed.
 *
 * Baselines are kept separately from each demo's own screenshot.png at the
 * demo's root, since that file is sometimes hand-curated for presentation
 * (README/site thumbnails) and isn't guaranteed to reflect the current
 * rendering. A demo with no baseline yet is reported as such rather than as
 * a failure; run with --update-baseline once to create it.
 *
 * Usage:
 *   node .github/scripts/compare-screenshots.mjs [demo-name] [options]
 *
 * Options:
 *   --threshold=<percent>       Max allowed % of differing pixels before a
 *                               demo is flagged as mismatched (default: 1)
 *   --local-core=<path>         Use a local @joint/core package (a .tgz
 *                               tarball or an unpacked package directory)
 *                               instead of installing it from the npm registry
 *   --local-plus=<path>         Same as --local-core but for @joint/plus
 *   --local-package=<name>=<path>
 *                               Same idea for any other @joint/* package (e.g.
 *                               @joint/format-visio for the visio demos, or
 *                               @joint/layout-directed-graph). Repeatable.
 *   --local-dir=<path>          A directory containing several local packages
 *                               at once (e.g. the output of running `npm pack`
 *                               for each of them). Each demo's @joint/*
 *                               dependencies are matched against files/folders
 *                               in this directory named `joint-<name>*.tgz`,
 *                               `<name>*.tgz`, `joint-<name>/` or `<name>/`
 *                               (where <name> is the part after "@joint/").
 *                               Unmatched dependencies install from npm as
 *                               usual. --local-core/--local-plus/
 *                               --local-package take precedence over this.
 *   --update-baseline           When a demo differs (or has no baseline yet),
 *                               write the newly captured screenshot as its
 *                               baseline instead of reporting a mismatch
 *                               (use to accept an intentional visual change,
 *                               or to create a baseline for the first time)
 *   --force-reinstall           Run `npm install` for every demo even when
 *                               node_modules/ already exists (e.g. to pick up
 *                               a version bump in an already-installed demo)
 *   --baseline-dir=<dir>        Directory holding baseline screenshots, one
 *                               <demo-name>.png per demo
 *                               (default: .github/tests/screenshots/)
 *   --out=<dir>                 Directory to write diff artifacts to
 *                               (default: screenshot-diff-results/)
 *
 * A demo without an existing baseline has nothing to compare against and is
 * reported separately as "no baseline" rather than as a failure.
 *
 * For every mismatched demo, baseline.png / actual.png / diff.png are written
 * to the result folder for manual review.
 *
 * Prerequisites:
 *   npm install
 *   npx playwright install chromium
 *
 * The script reuses the same variant-resolution and dev-server logic as
 * screenshot-demos.mjs / build-demos.sh, reading demos.config.json for
 * per-demo overrides. Two fields there are specific to this script:
 *   - skipScreenshotComparison: excludes a demo from comparison without
 *     affecting build-demos.sh / screenshot-demos.mjs (unlike `skip`, which
 *     is shared and also removes the demo from build/deploy).
 *   - screenshotThreshold: per-demo override of --threshold.
 *   - query: query string the screenshot is taken with, for a demo whose
 *     starting state is otherwise random (see screenshot-demos.mjs).
 */

import { chromium } from 'playwright';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import {
    readFileSync,
    writeFileSync,
    existsSync,
    readdirSync,
    statSync,
    mkdirSync,
    rmSync,
} from 'fs';
import { join, resolve, basename } from 'path';
import { execSync, spawn } from 'child_process';
import { resolveLocalSpec, findLocalPackageInDir, toFileSpec } from './lib/local-packages.mjs';

const ROOT = resolve(import.meta.dirname, '..', '..');
const CONFIG_FILE = join(ROOT, 'demos.config.json');
const DEFAULT_BASELINE_DIR = join(ROOT, '.github', 'tests', 'screenshots');

const DEFAULT_VIEWPORT = { width: 800, height: 600 };
const SERVER_TIMEOUT_MS = 60_000;
const SETTLE_MS = 3000;
const BASE_PORT = 9200;
const DEFAULT_THRESHOLD_PERCENT = 1;
const IS_WINDOWS = process.platform === 'win32';

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

let FILTER = '';
let THRESHOLD_PERCENT = DEFAULT_THRESHOLD_PERCENT;
let LOCAL_CORE_PATH = null;
let LOCAL_PLUS_PATH = null;
const LOCAL_PACKAGE_PATHS = {}; // package name -> local path, from repeatable --local-package
let LOCAL_DIR = null;
let UPDATE_BASELINE = false;
let FORCE_REINSTALL = false;
let BASELINE_DIR = DEFAULT_BASELINE_DIR;
let OUT_DIR = join(ROOT, 'screenshot-diff-results');
let SHOW_HELP = false;

for (const arg of process.argv.slice(2)) {
    if (arg === '--help' || arg === '-h') SHOW_HELP = true;
    else if (arg === '--update-baseline') UPDATE_BASELINE = true;
    else if (arg === '--force-reinstall') FORCE_REINSTALL = true;
    else if (arg.startsWith('--threshold=')) THRESHOLD_PERCENT = Number(arg.slice('--threshold='.length));
    else if (arg.startsWith('--local-core=')) LOCAL_CORE_PATH = arg.slice('--local-core='.length);
    else if (arg.startsWith('--local-plus=')) LOCAL_PLUS_PATH = arg.slice('--local-plus='.length);
    else if (arg.startsWith('--local-package=')) {
        const spec = arg.slice('--local-package='.length);
        const sep = spec.indexOf('=');
        if (sep === -1) {
            console.error(`Invalid --local-package value '${spec}', expected <name>=<path>`);
            process.exit(1);
        }
        LOCAL_PACKAGE_PATHS[spec.slice(0, sep)] = spec.slice(sep + 1);
    }
    else if (arg.startsWith('--local-dir=')) LOCAL_DIR = arg.slice('--local-dir='.length);
    else if (arg.startsWith('--baseline-dir=')) BASELINE_DIR = resolve(arg.slice('--baseline-dir='.length));
    else if (arg.startsWith('--out=')) OUT_DIR = resolve(arg.slice('--out='.length));
    else if (!arg.startsWith('--')) FILTER = arg;
}

const HELP_OPTIONS = [
    ['--threshold=<percent>', `Max allowed % of differing pixels before a demo is flagged as mismatched (default: ${DEFAULT_THRESHOLD_PERCENT})`],
    ['--local-core=<path>', 'Use a local @joint/core package (tarball or directory) instead of installing from npm'],
    ['--local-plus=<path>', 'Use a local @joint/plus package (tarball or directory) instead of installing from npm'],
    ['--local-package=<name>=<path>', 'Same idea for any other @joint/* package, e.g. --local-package=@joint/format-visio=../joint-visio.tgz. Repeatable for multiple packages.'],
    ['--local-dir=<path>', 'A directory holding several local packages at once (e.g. from running npm pack for each). Each demo\'s @joint/* deps are matched against joint-<name>*.tgz / <name>*.tgz files or folders in it; unmatched deps install from npm. Explicit --local-* flags win over this.'],
    ['--update-baseline', 'Write the newly captured screenshot as the baseline when a demo differs or has no baseline yet'],
    ['--force-reinstall', 'Run npm install for every demo even when node_modules/ already exists'],
    ['--baseline-dir=<dir>', 'Directory holding baseline screenshots, one <demo-name>.png per demo (default: .github/tests/screenshots/)'],
    ['--out=<dir>', 'Directory for diff artifacts (default: screenshot-diff-results/)'],
];

function wrapText(text, width) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
        if (line && (line.length + 1 + word.length) > width) {
            lines.push(line);
            line = word;
        } else {
            line = line ? `${line} ${word}` : word;
        }
    }
    if (line) lines.push(line);
    return lines;
}

function printHelp() {
    console.log(`Usage: node .github/scripts/compare-screenshots.mjs [demo-name] [options]\n`);
    console.log('Options:');
    const labelWidth = Math.max(...HELP_OPTIONS.map(([label]) => label.length)) + 2;
    const indent = ' '.repeat(2 + labelWidth);
    for (const [label, description] of HELP_OPTIONS) {
        const lines = wrapText(description, 60);
        console.log(`  ${label.padEnd(labelWidth)}${lines[0]}`);
        for (const line of lines.slice(1)) {
            console.log(`${indent}${line}`);
        }
    }
}

// On Windows, npm/npx are npm.cmd/npx.cmd; spawn() without shell:true won't
// resolve the bare name (and PATHEXT lookup is unreliable across Node versions).
function resolveCommand(command) {
    if (IS_WINDOWS && (command === 'npm' || command === 'npx')) return `${command}.cmd`;
    return command;
}

// ---------------------------------------------------------------------------
// Config helpers
// ---------------------------------------------------------------------------

function loadConfig() {
    if (existsSync(CONFIG_FILE)) {
        return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
    }
    return { demos: {} };
}

function demoConfig(config, name, field) {
    return config.demos?.[name]?.[field] ?? null;
}

// ---------------------------------------------------------------------------
// Variant resolution (mirrors build-demos.sh logic)
// ---------------------------------------------------------------------------

function resolveBuildDir(config, demoName) {
    const demoDir = join(ROOT, demoName);

    const variant = demoConfig(config, demoName, 'variant');
    if (variant) {
        const variantDir = join(demoDir, variant);
        if (existsSync(join(variantDir, 'package.json'))) return variantDir;
        console.warn(`  WARNING: variant '${variant}' not found, falling back`);
    }

    for (const fallback of ['ts', 'js']) {
        const dir = join(demoDir, fallback);
        if (existsSync(join(dir, 'package.json'))) return dir;
    }
    return null;
}

// ---------------------------------------------------------------------------
// Detect dev command and port flag for each server type
// ---------------------------------------------------------------------------

function detectDevServer(buildDir, port) {
    const pkg = JSON.parse(readFileSync(join(buildDir, 'package.json'), 'utf-8'));
    const p = String(port);

    if (pkg.scripts?.dev) {
        // Vite — accepts --port via npm passthrough
        return { command: 'npm', args: ['run', 'dev', '--', '--port', p], port };
    }
    const startScriptName = pkg.scripts?.start ? 'start' : pkg.scripts?.serve ? 'serve' : null;
    const startScript = pkg.scripts?.[startScriptName] || '';
    if (startScript) {
        if (startScript.includes('ng serve')) {
            // Angular — accepts --port via npm passthrough
            return { command: 'npm', args: ['run', startScriptName, '--', '--port', p], port };
        }
        if (startScript.includes('react-scripts')) {
            // Create React App — uses PORT env variable
            return { command: 'npm', args: ['run', startScriptName], port, env: { PORT: p } };
        }
        if (startScript.includes('vue-cli-service')) {
            // Vue CLI — accepts --port via npm passthrough
            return { command: 'npm', args: ['run', startScriptName, '--', '--port', p], port };
        }
        // webpack-dev-server — run directly to bypass concurrently
        // which swallows extra args passed via npm start --
        return { command: 'npx', args: ['webpack', 'serve', '--config', 'webpack.config.js', '--port', p], port };
    }
    return null;
}

// ---------------------------------------------------------------------------
// Wait for the server to respond
// ---------------------------------------------------------------------------

async function waitForServer(url, timeoutMs) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        try {
            const res = await fetch(url);
            if (res.ok) return true;
        } catch {
            // not ready yet
        }
        await new Promise(r => setTimeout(r, 500));
    }
    return false;
}

// ---------------------------------------------------------------------------
// Wait for a port to be free
// ---------------------------------------------------------------------------

async function waitForPortFree(port, timeoutMs = 10_000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        try {
            await fetch(`http://localhost:${port}`);
            // Still responding — wait
            await new Promise(r => setTimeout(r, 300));
        } catch {
            return true; // Connection refused = port is free
        }
    }
    return false;
}

// ---------------------------------------------------------------------------
// Kill an entire process tree
// ---------------------------------------------------------------------------

async function killProcessTree(proc) {
    if (!proc.pid) return;

    if (IS_WINDOWS) {
        // process.kill(-pid) process-group signalling doesn't exist on Windows;
        // taskkill /T walks the tree (npm.cmd -> node) and kills it outright.
        try { execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: 'pipe', windowsHide: true }); } catch { /* already dead */ }
        return;
    }

    try {
        // Kill the entire process group (npm + child server)
        process.kill(-proc.pid, 'SIGTERM');
    } catch {
        // Process group kill failed, try direct kill
        try { proc.kill('SIGTERM'); } catch { /* already dead */ }
    }
    // Give the process a moment to exit gracefully
    await new Promise(r => setTimeout(r, 2000));
    // Force kill if still alive
    try {
        process.kill(-proc.pid, 'SIGKILL');
    } catch { /* already dead */ }
}

// ---------------------------------------------------------------------------
// Local @joint/core / @joint/plus package overrides
// ---------------------------------------------------------------------------

// Temporarily rewrites a demo's @joint/* dependencies to point at local
// overrides, and returns a restore() to revert package.json verbatim.
// explicitOverrides (from --local-core/--local-plus/--local-package) take
// precedence over a --local-dir match for the same package name.
function patchLocalPackages(buildDir, { explicitOverrides, localDir }) {
    const pkgPath = join(buildDir, 'package.json');
    const original = readFileSync(pkgPath, 'utf-8');
    const pkg = JSON.parse(original);
    let changed = false;
    const applied = [];

    for (const field of ['dependencies', 'devDependencies']) {
        if (!pkg[field]) continue;
        for (const depName of Object.keys(pkg[field])) {
            if (!depName.startsWith('@joint/')) continue;

            let spec = explicitOverrides[depName];
            if (!spec && localDir) {
                const found = findLocalPackageInDir(localDir, depName);
                if (found) spec = toFileSpec(found);
            }
            if (!spec) continue;

            pkg[field][depName] = spec;
            changed = true;
            applied.push(depName);
        }
    }

    if (!changed) {
        return { changed: false, restore: () => {}, applied };
    }

    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    return { changed: true, restore: () => writeFileSync(pkgPath, original), applied };
}

function installDeps(buildDir, forceReinstall) {
    if (forceReinstall || !existsSync(join(buildDir, 'node_modules'))) {
        console.log('  Installing dependencies...');
        execSync('npm install', { cwd: buildDir, stdio: 'pipe', windowsHide: true });
    }
}

// ---------------------------------------------------------------------------
// Image comparison
// ---------------------------------------------------------------------------

function compareImages(baselineBuffer, actualBuffer, thresholdPercent) {
    const baseline = PNG.sync.read(baselineBuffer);
    const actual = PNG.sync.read(actualBuffer);

    if (baseline.width !== actual.width || baseline.height !== actual.height) {
        return {
            match: false,
            reason: `size mismatch: baseline ${baseline.width}x${baseline.height} vs actual ${actual.width}x${actual.height}`,
            diffPng: null,
        };
    }

    const { width, height } = baseline;
    const diff = new PNG({ width, height });
    const numDiffPixels = pixelmatch(baseline.data, actual.data, diff.data, width, height, {
        threshold: 0.1,
        alpha: 0.2,
    });
    const diffPercent = (numDiffPixels / (width * height)) * 100;
    const match = diffPercent <= thresholdPercent;

    return {
        match,
        reason: match ? null : `${diffPercent.toFixed(2)}% pixels differ (threshold ${thresholdPercent}%)`,
        diffPng: PNG.sync.write(diff),
    };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    if (SHOW_HELP) {
        printHelp();
        return;
    }

    if (!Number.isFinite(THRESHOLD_PERCENT) || THRESHOLD_PERCENT < 0) {
        console.error(`Invalid --threshold value: must be a non-negative number`);
        process.exit(1);
    }

    const explicitOverrides = {};
    if (LOCAL_CORE_PATH) explicitOverrides['@joint/core'] = resolveLocalSpec(LOCAL_CORE_PATH);
    if (LOCAL_PLUS_PATH) explicitOverrides['@joint/plus'] = resolveLocalSpec(LOCAL_PLUS_PATH);
    for (const [depName, depPath] of Object.entries(LOCAL_PACKAGE_PATHS)) {
        explicitOverrides[depName] = resolveLocalSpec(depPath);
    }
    if (Object.keys(explicitOverrides).length > 0) {
        console.log(':: Using local packages:', explicitOverrides);
    }

    let localDir = null;
    if (LOCAL_DIR) {
        localDir = resolve(process.cwd(), LOCAL_DIR);
        if (!existsSync(localDir) || !statSync(localDir).isDirectory()) {
            console.error(`--local-dir path is not a directory: ${localDir}`);
            process.exit(1);
        }
        console.log(`:: Matching @joint/* dependencies against local packages in: ${localDir}`);
    }

    rmSync(OUT_DIR, { recursive: true, force: true });
    mkdirSync(BASELINE_DIR, { recursive: true });

    const config = loadConfig();
    const browser = await chromium.launch();

    const entries = readdirSync(ROOT)
        .filter(name => {
            if (name.startsWith('.') || name === '_site' || name === 'node_modules') return false;
            if (name === basename(OUT_DIR)) return false;
            return statSync(join(ROOT, name)).isDirectory();
        })
        .sort();

    const results = { matched: [], failed: [], noBaseline: [], errored: [], updated: [], created: [], skipped: [] };
    let portCounter = BASE_PORT;

    for (const demoName of entries) {
        if (FILTER && demoName !== FILTER) continue;

        if (demoConfig(config, demoName, 'skip') === true || demoConfig(config, demoName, 'skipScreenshotComparison') === true) {
            results.skipped.push(demoName);
            continue;
        }

        const buildDir = resolveBuildDir(config, demoName);
        if (!buildDir) {
            results.skipped.push(demoName);
            continue;
        }

        const baselinePath = join(BASELINE_DIR, `${demoName}.png`);
        const baselineExists = existsSync(baselinePath);
        if (!baselineExists && !UPDATE_BASELINE) {
            console.log(`:: ${demoName} — no baseline yet, skipping comparison (rerun with --update-baseline to create one)`);
            results.noBaseline.push(demoName);
            continue;
        }

        const port = portCounter++;
        const server = detectDevServer(buildDir, port);
        if (!server) {
            results.skipped.push(demoName);
            continue;
        }

        console.log(`:: ${demoName} (${buildDir}, port ${port})`);

        let proc;
        let restorePkg = () => {};
        try {
            const patch = patchLocalPackages(buildDir, { explicitOverrides, localDir });
            restorePkg = patch.restore;
            if (patch.applied.length > 0) {
                console.log(`  Using local packages: ${patch.applied.join(', ')}`);
            }
            installDeps(buildDir, patch.changed || FORCE_REINSTALL);

            // Start dev server in its own process group so we can kill the tree
            // .cmd files (npm/npx on Windows) aren't real executables — spawn()
            // needs a shell to invoke them, otherwise it throws EINVAL. All args
            // here are fixed internal literals/port numbers, so string-joining
            // them for the shell is safe (avoids Node's shell+argv-array warning).
            // windowsHide suppresses the console window Node otherwise pops up
            // per spawned process on Windows (default: false). detached is
            // omitted on Windows: it maps to the DETACHED_PROCESS creation
            // flag, which conflicts with windowsHide's CREATE_NO_WINDOW and
            // can make the window reappear anyway — and it's not needed here
            // since killProcessTree() kills the Windows tree via `taskkill /T`
            // on the PID, not via a POSIX process group.
            const command = resolveCommand(server.command);
            proc = IS_WINDOWS
                ? spawn([command, ...server.args].join(' '), { cwd: buildDir, stdio: 'pipe', shell: true, windowsHide: true, env: { ...process.env, BROWSER: 'none', ...server.env } })
                : spawn(command, server.args, { cwd: buildDir, stdio: 'pipe', detached: true, env: { ...process.env, BROWSER: 'none', ...server.env } });

            const url = `http://localhost:${port}`;
            console.log(`  Waiting for ${url}...`);

            const ready = await waitForServer(url, SERVER_TIMEOUT_MS);
            if (!ready) {
                console.log(`  TIMEOUT waiting for server`);
                results.errored.push({ demoName, reason: 'server timeout' });
                continue;
            }

            // Let the app settle (animations, async rendering)
            await new Promise(r => setTimeout(r, SETTLE_MS));

            // Resolve viewport: per-demo config or default
            const configViewport = demoConfig(config, demoName, 'viewport');
            const viewport = configViewport
                ? { width: configViewport.width || DEFAULT_VIEWPORT.width, height: configViewport.height || DEFAULT_VIEWPORT.height }
                : DEFAULT_VIEWPORT;

            /*
             * Same query the baseline was captured with, so a demo whose
             * starting state is otherwise random is compared against the board
             * it was shot from rather than a fresh one.
             */
            const query = demoConfig(config, demoName, 'query');
            const pageUrl = query ? `${url}/${String(query).replace(/^[?]?/, '?')}` : url;

            const page = await browser.newPage({ viewport });
            await page.goto(pageUrl, { waitUntil: 'networkidle' });
            await page.waitForTimeout(SETTLE_MS);

            // Clip to the bounding box of <body> children to avoid excess whitespace
            const clip = await page.evaluate(() => {
                const body = document.body;
                if (!body.children.length) return null;
                let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
                for (const child of body.children) {
                    const rect = child.getBoundingClientRect();
                    if (rect.width === 0 || rect.height === 0) continue;
                    minX = Math.min(minX, rect.x);
                    minY = Math.min(minY, rect.y);
                    maxX = Math.max(maxX, rect.x + rect.width);
                    maxY = Math.max(maxY, rect.y + rect.height);
                }
                if (minX >= maxX || minY >= maxY) return null;
                return { x: Math.max(0, minX), y: Math.max(0, minY), width: maxX - minX, height: maxY - minY };
            });

            const actualBuffer = await page.screenshot({
                ...(clip ? { clip } : {}),
            });
            await page.close();

            if (!baselineExists) {
                // Reached only with --update-baseline (see the earlier skip above).
                writeFileSync(baselinePath, actualBuffer);
                console.log(`  Baseline created`);
                results.created.push(demoName);
            } else {
                const baselineBuffer = readFileSync(baselinePath);
                const demoThreshold = demoConfig(config, demoName, 'screenshotThreshold') ?? THRESHOLD_PERCENT;
                const comparison = compareImages(baselineBuffer, actualBuffer, demoThreshold);

                if (comparison.match) {
                    console.log(`  OK`);
                    results.matched.push(demoName);
                } else if (UPDATE_BASELINE) {
                    writeFileSync(baselinePath, actualBuffer);
                    console.log(`  MISMATCH (${comparison.reason}) — baseline updated`);
                    results.updated.push(demoName);
                } else {
                    console.log(`  MISMATCH: ${comparison.reason}`);
                    const demoOutDir = join(OUT_DIR, demoName);
                    mkdirSync(demoOutDir, { recursive: true });
                    writeFileSync(join(demoOutDir, 'baseline.png'), baselineBuffer);
                    writeFileSync(join(demoOutDir, 'actual.png'), actualBuffer);
                    if (comparison.diffPng) writeFileSync(join(demoOutDir, 'diff.png'), comparison.diffPng);
                    writeFileSync(join(demoOutDir, 'reason.txt'), `${comparison.reason}\n`);
                    results.failed.push({ demoName, reason: comparison.reason });
                }
            }
        } catch (err) {
            console.log(`  ERROR: ${err.message}`);
            results.errored.push({ demoName, reason: err.message });
        } finally {
            restorePkg();
            if (proc) {
                await killProcessTree(proc);
                const freed = await waitForPortFree(port);
                if (!freed) {
                    console.log(`  WARNING: port ${port} still in use after killing server`);
                }
            }
        }
    }

    await browser.close();

    console.log('\n=== Screenshot comparison summary ===');
    console.log(`Matched: ${results.matched.length}`);
    if (results.failed.length) {
        console.log(`Mismatched: ${results.failed.length}`);
        for (const { demoName, reason } of results.failed) {
            console.log(`  - ${demoName}: ${reason}`);
        }
        console.log(`  Diff artifacts saved to: ${OUT_DIR}`);
    } else {
        console.log('Mismatched: 0');
    }
    if (results.created.length) {
        console.log(`Baseline created: ${results.created.length}: ${results.created.join(', ')}`);
    }
    if (results.updated.length) {
        console.log(`Baseline updated: ${results.updated.length}: ${results.updated.join(', ')}`);
    }
    if (results.errored.length) {
        console.log(`Errored: ${results.errored.length}`);
        for (const { demoName, reason } of results.errored) {
            console.log(`  - ${demoName}: ${reason}`);
        }
    } else {
        console.log('Errored: 0');
    }
    if (results.noBaseline.length) {
        console.log(`No baseline: ${results.noBaseline.length}: ${results.noBaseline.join(', ')}`);
    }
    if (results.skipped.length) {
        console.log(`Skipped: ${results.skipped.length}`);
    }

    process.exit(results.failed.length > 0 || results.errored.length > 0 ? 1 : 0);
}

main();
