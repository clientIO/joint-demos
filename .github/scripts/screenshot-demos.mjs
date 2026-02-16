#!/usr/bin/env node

/**
 * Captures a screenshot of each demo and saves it to the demo's root directory.
 *
 * Usage:
 *   node .github/scripts/screenshot-demos.mjs [demo-name]
 *
 * Prerequisites:
 *   npm install -g playwright
 *   npx playwright install chromium
 *
 * The script reuses the same variant-resolution logic as build-demos.sh,
 * reading demos.config.json for per-demo overrides.
 */

import { chromium } from 'playwright';
import { readFileSync, existsSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { execSync, spawn } from 'child_process';

const ROOT = resolve(import.meta.dirname, '..', '..');
const CONFIG_FILE = join(ROOT, 'demos.config.json');
const FILTER = process.argv[2] || '';

const VIEWPORT = { width: 1280, height: 800 };
const SERVER_TIMEOUT_MS = 60_000;
const SETTLE_MS = 3000;

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
        if (existsSync(variantDir)) return variantDir;
        console.warn(`  WARNING: variant '${variant}' not found, falling back`);
    }

    for (const fallback of ['ts', 'js']) {
        const dir = join(demoDir, fallback);
        if (existsSync(dir)) return dir;
    }
    return null;
}

// ---------------------------------------------------------------------------
// Detect dev command and expected port
// ---------------------------------------------------------------------------

function detectDevServer(buildDir) {
    const pkg = JSON.parse(readFileSync(join(buildDir, 'package.json'), 'utf-8'));

    if (pkg.scripts?.dev) {
        // Vite → default port 5173
        return { command: 'npm', args: ['run', 'dev'], port: 5173 };
    }
    if (pkg.scripts?.start) {
        const startScript = pkg.scripts.start;
        if (startScript.includes('ng serve')) {
            return { command: 'npm', args: ['start'], port: 4200 };
        }
        // webpack-dev-server → default port 8080
        return { command: 'npm', args: ['start'], port: 8080 };
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
// Install dependencies if needed
// ---------------------------------------------------------------------------

function ensureDeps(buildDir) {
    if (!existsSync(join(buildDir, 'node_modules'))) {
        console.log('  Installing dependencies...');
        execSync('npm install', { cwd: buildDir, stdio: 'pipe' });
    }
}

// ---------------------------------------------------------------------------
// Insert screenshot into README
// ---------------------------------------------------------------------------

function updateReadme(demoDir, screenshotFilename) {
    const readmePath = join(demoDir, 'README.md');
    if (!existsSync(readmePath)) return;

    let content = readFileSync(readmePath, 'utf-8');
    const imgTag = `![screenshot](./${screenshotFilename})`;

    // Already has the screenshot reference
    if (content.includes(screenshotFilename)) return;

    // Insert after the first heading line
    const lines = content.split('\n');
    let insertIndex = 0;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('# ')) {
            insertIndex = i + 1;
            // Skip any blank lines after the heading
            while (insertIndex < lines.length && lines[insertIndex].trim() === '') {
                insertIndex++;
            }
            break;
        }
    }

    lines.splice(insertIndex, 0, '', imgTag, '');
    writeFileSync(readmePath, lines.join('\n'));
    console.log(`  Updated ${readmePath}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    const config = loadConfig();
    const browser = await chromium.launch();

    const entries = readdirSync(ROOT)
        .filter(name => {
            if (name.startsWith('.') || name === '_site' || name === 'node_modules') return false;
            return statSync(join(ROOT, name)).isDirectory();
        })
        .sort();

    const results = { captured: [], failed: [], skipped: [] };

    for (const demoName of entries) {
        if (FILTER && demoName !== FILTER) continue;

        if (demoConfig(config, demoName, 'skip') === true) {
            console.log(`:: Skipping ${demoName} (skip=true)`);
            results.skipped.push(demoName);
            continue;
        }

        const buildDir = resolveBuildDir(config, demoName);
        if (!buildDir) {
            console.log(`:: Skipping ${demoName} (no variant found)`);
            results.skipped.push(demoName);
            continue;
        }

        const server = detectDevServer(buildDir);
        if (!server) {
            console.log(`:: Skipping ${demoName} (no dev/start script)`);
            results.skipped.push(demoName);
            continue;
        }

        console.log(`:: ${demoName} (${buildDir}, port ${server.port})`);

        try {
            ensureDeps(buildDir);

            // Start dev server
            const proc = spawn(server.command, server.args, {
                cwd: buildDir,
                stdio: 'pipe',
                env: { ...process.env, BROWSER: 'none' },
            });

            const url = `http://localhost:${server.port}`;
            console.log(`  Waiting for ${url}...`);

            const ready = await waitForServer(url, SERVER_TIMEOUT_MS);
            if (!ready) {
                console.log(`  TIMEOUT waiting for server`);
                proc.kill('SIGTERM');
                results.failed.push(demoName);
                continue;
            }

            // Let the app settle (animations, async rendering)
            await new Promise(r => setTimeout(r, SETTLE_MS));

            // Take screenshot
            const page = await browser.newPage({ viewport: VIEWPORT });
            await page.goto(url, { waitUntil: 'networkidle' });
            await page.waitForTimeout(SETTLE_MS);

            const screenshotFile = 'screenshot.png';
            const screenshotPath = join(ROOT, demoName, screenshotFile);
            await page.screenshot({ path: screenshotPath });
            await page.close();

            console.log(`  Saved ${screenshotPath}`);

            // Update README
            updateReadme(join(ROOT, demoName), screenshotFile);

            results.captured.push(demoName);

            // Stop server
            proc.kill('SIGTERM');
            // Give it a moment to shut down
            await new Promise(r => setTimeout(r, 1000));
        } catch (err) {
            console.log(`  ERROR: ${err.message}`);
            results.failed.push(demoName);
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
