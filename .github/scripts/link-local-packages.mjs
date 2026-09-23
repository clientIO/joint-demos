#!/usr/bin/env node

/**
 * Repoints every demo's @joint/* npm dependencies at local packages from a
 * ".packages" folder (tarballs or unpacked directories), so the whole repo
 * can be tested against an unreleased JointJS / JointJS+ build at once
 * instead of editing each demo's package.json by hand.
 *
 * Usage:
 *   node .github/scripts/link-local-packages.mjs [options]
 *
 * Options:
 *   --packages-dir=<path>   Directory containing local packages
 *                           (default: .packages/)
 *   --dry-run               Print what would change without writing anything
 *   --skip-install          Don't run npm install in modified demos afterward
 *   --restore               Undo a previous run, restoring every package.json
 *                           this tool modified from its saved manifest
 *
 * Matching convention (shared with compare-screenshots.mjs's --local-dir):
 * for a dependency @joint/<name>, looks for joint-<name>*.tgz, <name>*.tgz,
 * joint-<name>/ or <name>/ inside the packages directory. Dependencies with
 * no match are left untouched.
 *
 * A manifest of every file this tool has changed is kept at
 * <packages-dir>/.link-manifest.json so --restore can put things back
 * exactly, independent of git state.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, rmSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { execSync } from 'child_process';
import { findLocalPackageInDir, toFileSpec } from './lib/local-packages.mjs';

const ROOT = resolve(import.meta.dirname, '..', '..');
const DEFAULT_PACKAGES_DIR = join(ROOT, '.packages');
const IS_WINDOWS = process.platform === 'win32';

let PACKAGES_DIR = DEFAULT_PACKAGES_DIR;
let DRY_RUN = false;
let SKIP_INSTALL = false;
let RESTORE = false;
let SHOW_HELP = false;

for (const arg of process.argv.slice(2)) {
    if (arg === '--help' || arg === '-h') SHOW_HELP = true;
    else if (arg === '--dry-run') DRY_RUN = true;
    else if (arg === '--skip-install') SKIP_INSTALL = true;
    else if (arg === '--restore') RESTORE = true;
    else if (arg.startsWith('--packages-dir=')) PACKAGES_DIR = resolve(arg.slice('--packages-dir='.length));
}

function printHelp() {
    console.log(`Usage: node .github/scripts/link-local-packages.mjs [options]

Options:
  --packages-dir=<path>   Directory containing local packages (default: .packages/)
  --dry-run               Print what would change without writing anything
  --skip-install          Don't run npm install in modified demos afterward
  --restore               Undo a previous run, restoring package.json files
                          from the saved manifest
`);
}

// On Windows, npm/npx are npm.cmd/npx.cmd; execSync needs the .cmd suffix
// to resolve the bare name reliably.
function resolveCommand(command) {
    if (IS_WINDOWS && (command === 'npm' || command === 'npx')) return `${command}.cmd`;
    return command;
}

function findPackageJsonFiles(dir) {
    const results = [];
    let entries;
    try {
        entries = readdirSync(dir, { withFileTypes: true });
    } catch {
        return results;
    }
    for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.') || entry.name === '_site') continue;
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...findPackageJsonFiles(fullPath));
        } else if (entry.isFile() && entry.name === 'package.json') {
            results.push(fullPath);
        }
    }
    return results;
}

function manifestPath() {
    return join(PACKAGES_DIR, '.link-manifest.json');
}

function loadManifest() {
    const path = manifestPath();
    if (!existsSync(path)) return {};
    return JSON.parse(readFileSync(path, 'utf-8'));
}

function saveManifest(manifest) {
    writeFileSync(manifestPath(), JSON.stringify(manifest, null, 2));
}

function restore() {
    const manifest = loadManifest();
    const files = Object.keys(manifest);
    if (files.length === 0) {
        console.log('Nothing to restore (no manifest found).');
        return;
    }
    for (const file of files) {
        writeFileSync(file, manifest[file]);
        console.log(`Restored ${file}`);
    }
    rmSync(manifestPath(), { force: true });
    console.log(`\nRestored ${files.length} package.json file(s).`);
}

function main() {
    if (SHOW_HELP) {
        printHelp();
        return;
    }

    if (RESTORE) {
        restore();
        return;
    }

    if (!existsSync(PACKAGES_DIR) || !statSync(PACKAGES_DIR).isDirectory()) {
        console.error(`Packages directory not found: ${PACKAGES_DIR}`);
        process.exit(1);
    }

    const pkgFiles = findPackageJsonFiles(ROOT);
    const manifest = loadManifest();
    const modifiedDirs = [];
    const unresolvedDeps = new Set();
    let filesChanged = 0;

    for (const pkgPath of pkgFiles) {
        const original = readFileSync(pkgPath, 'utf-8');
        const pkg = JSON.parse(original);
        let changed = false;
        const linked = [];

        for (const field of ['dependencies', 'devDependencies']) {
            if (!pkg[field]) continue;
            for (const depName of Object.keys(pkg[field])) {
                if (!depName.startsWith('@joint/')) continue;

                const found = findLocalPackageInDir(PACKAGES_DIR, depName);
                if (!found) {
                    unresolvedDeps.add(depName);
                    continue;
                }

                const spec = toFileSpec(found);
                if (pkg[field][depName] === spec) continue;

                linked.push(`${depName}: ${pkg[field][depName]} -> ${spec}`);
                pkg[field][depName] = spec;
                changed = true;
            }
        }

        if (!changed) continue;

        console.log(`:: ${pkgPath}`);
        for (const line of linked) console.log(`   ${line}`);

        if (!DRY_RUN) {
            if (!(pkgPath in manifest)) manifest[pkgPath] = original;
            writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
            modifiedDirs.push(dirname(pkgPath));
        }
        filesChanged++;
    }

    console.log(`\n${DRY_RUN ? 'Would modify' : 'Modified'} ${filesChanged} package.json file(s).`);
    if (unresolvedDeps.size > 0) {
        console.log(`No local match found in ${PACKAGES_DIR} for: ${[...unresolvedDeps].sort().join(', ')}`);
    }

    if (DRY_RUN) return;

    saveManifest(manifest);

    if (SKIP_INSTALL || modifiedDirs.length === 0) return;

    console.log(`\nInstalling dependencies in ${modifiedDirs.length} demo(s)...`);
    for (const dir of modifiedDirs) {
        console.log(`:: npm install (${dir})`);
        try {
            execSync(`${resolveCommand('npm')} install`, { cwd: dir, stdio: 'inherit' });
        } catch (err) {
            console.error(`  ERROR installing in ${dir}: ${err.message}`);
        }
    }
}

main();
