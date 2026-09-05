#!/usr/bin/env node

/**
 * Captures a screenshot of each demo and saves it to .github/screenshots/
 * (untracked by git), keyed by demo name.
 *
 * Usage:
 *   node .github/scripts/screenshot-demos.mjs [--update] [demo-name]
 *
 * By default, only demos missing a screenshot in .github/screenshots/ are
 * processed.
 * --update    Regenerate screenshots for all demos (including existing ones).
 *
 * Prerequisites:
 *   npm install playwright
 *   npx playwright install chromium
 *
 * The script reuses the same variant-resolution logic as build-demos.sh,
 * reading demos.config.json for per-demo overrides:
 *   - variant: which sub-directory to build and serve.
 *   - viewport: { width, height } the page is shot at.
 *   - query: query string appended to the URL. For a demo whose starting state
 *     is otherwise random — a generated board, a running clock — so that the
 *     capture is the same picture every run and worth comparing.
 */

import { chromium } from 'playwright';
import { readFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { execSync, spawn } from 'child_process';

const ROOT = resolve(import.meta.dirname, '..', '..');
const CONFIG_FILE = join(ROOT, 'demos.config.json');
const SCREENSHOTS_DIR = join(ROOT, '.github', 'screenshots');

let FILTER = '';
let UPDATE = false;
for (const arg of process.argv.slice(2)) {
    if (arg === '--update') UPDATE = true;
    else FILTER = arg;
}

const DEFAULT_VIEWPORT = { width: 800, height: 600 };
const SERVER_TIMEOUT_MS = 60_000;
const SETTLE_MS = 3000;
const BASE_PORT = 9100;
const IS_WINDOWS = process.platform === 'win32';

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
// Install dependencies if needed
// ---------------------------------------------------------------------------

function ensureDeps(buildDir) {
    if (!existsSync(join(buildDir, 'node_modules'))) {
        console.log('  Installing dependencies...');
        execSync('npm install', { cwd: buildDir, stdio: 'pipe', windowsHide: true });
    }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    const config = loadConfig();
    mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    const browser = await chromium.launch();

    const entries = readdirSync(ROOT)
        .filter(name => {
            if (name.startsWith('.') || name === '_site' || name === 'node_modules') return false;
            return statSync(join(ROOT, name)).isDirectory();
        })
        .sort();

    const results = { captured: [], failed: [], skipped: [] };
    let portCounter = BASE_PORT;

    for (const demoName of entries) {
        if (FILTER && demoName !== FILTER) continue;

        if (demoConfig(config, demoName, 'skip') === true) {
            console.log(`:: Skipping ${demoName} (skip=true)`);
            results.skipped.push(demoName);
            continue;
        }

        if (!UPDATE && !FILTER && existsSync(join(SCREENSHOTS_DIR, `${demoName}.png`))) {
            results.skipped.push(demoName);
            continue;
        }

        const buildDir = resolveBuildDir(config, demoName);
        if (!buildDir) {
            console.log(`:: Skipping ${demoName} (no variant found)`);
            results.skipped.push(demoName);
            continue;
        }

        const port = portCounter++;
        const server = detectDevServer(buildDir, port);
        if (!server) {
            console.log(`:: Skipping ${demoName} (no dev/start script)`);
            results.skipped.push(demoName);
            continue;
        }

        console.log(`:: ${demoName} (${buildDir}, port ${port})`);

        let proc;
        try {
            ensureDeps(buildDir);

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
                killProcessTree(proc);
                results.failed.push(demoName);
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
             * Per-demo query string, for a demo whose starting state is
             * otherwise random. Anything that would differ from run to run —
             * a generated board, a running clock — makes comparison
             * meaningless, so the demo is asked for a fixed one instead.
             */
            const query = demoConfig(config, demoName, 'query');
            const pageUrl = query ? `${url}/${String(query).replace(/^[?]?/, '?')}` : url;

            // Take screenshot
            const page = await browser.newPage({ viewport });
            await page.goto(pageUrl, { waitUntil: 'networkidle' });
            await page.waitForTimeout(SETTLE_MS);

            const screenshotPath = join(SCREENSHOTS_DIR, `${demoName}.png`);

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

            await page.screenshot({
                path: screenshotPath,
                ...(clip ? { clip } : {}),
            });
            await page.close();

            console.log(`  Saved ${screenshotPath}`);

            results.captured.push(demoName);
        } catch (err) {
            console.log(`  ERROR: ${err.message}`);
            results.failed.push(demoName);
        } finally {
            // Kill the server and wait for the port to be released
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

    console.log('\n=== Screenshot summary ===');
    console.log(`Captured: ${results.captured.length} demos`);
    if (results.failed.length) {
        console.log(`Failed: ${results.failed.length} demos: ${results.failed.join(', ')}`);
    } else {
        console.log('Failed: 0');
    }
    if (results.skipped.length) {
        console.log(`Skipped: ${results.skipped.length} demos: ${results.skipped.join(', ')}`);
    } else {
        console.log('Skipped: 0');
    }

    process.exit(results.failed.length > 0 ? 1 : 0);
}

main();
