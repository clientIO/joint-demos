#!/usr/bin/env node

// Syncs one Demo Snapshot version and its Demo Manifests to the demos R2
// bucket over the rclone remote `cf-r2` (dev bucket by default, --prod for
// production). Sync-only: it never builds manifests — run
// `npm run manifests:build -- --version X.Y` first. Every destination is
// version-scoped so other versions' objects in the bucket are never touched.
//
// Usage: npm run sync -- --version 4.3 [--allow-dirty]
//        npm run sync:prod -- --version 4.3

import { parseArgs } from 'node:util';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const USAGE = 'Usage: npm run sync -- --version X.Y [--allow-dirty] (sync:prod for production)';

// Verbatim from joint-mcp#30 (grill decision 2026-07-17): every top-level
// non-hidden directory is a demo, demo content lives at depth >= 2 inside it,
// anything new at the root fails closed. First match wins.
export const SNAPSHOT_FILTERS = [
    '--filter', '- .DS_Store',
    '--filter', '- node_modules/**',
    '--filter', '- _site/**',
    '--filter', '- /.*/**',
    '--filter', '+ /*/*/**',
    '--filter', '- *',
];

export function parseSyncArgs(args) {
    let values;
    try {
        ({ values } = parseArgs({
            args,
            options: {
                'version': { type: 'string' },
                'prod': { type: 'boolean', default: false },
                'allow-dirty': { type: 'boolean', default: false },
            },
        }));
    } catch {
        return null;
    }
    if (!values.version || !/^\d+\.\d+$/.test(values.version)) {
        return null;
    }
    return { version: values.version, prod: values.prod, allowDirty: values['allow-dirty'] };
}

export function planCommands({ version, bucket }) {
    return [
        ['sync', './', `cf-r2:${bucket}/versioned_demos/version-${version}`, ...SNAPSHOT_FILTERS],
        ['sync', `.manifests/manifests/version-${version}`, `cf-r2:${bucket}/manifests/version-${version}`],
        ['copyto', `.manifests/manifests-index/version-${version}.json`, `cf-r2:${bucket}/manifests-index/version-${version}.json`],
    ];
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
    const parsed = parseSyncArgs(process.argv.slice(2));
    if (!parsed) {
        console.warn(USAGE);
        process.exit(1);
    }
    const { version, prod, allowDirty } = parsed;
    const ROOT = resolve(import.meta.dirname, '..', '..');
    const bucket = prod ? 'jointjs-demos' : 'jointjs-demos-dev';

    // Preflight 1: manifests:build output for this version must exist (sync-only script).
    const manifestsDir = join(ROOT, '.manifests', 'manifests', `version-${version}`);
    const indexFile = join(ROOT, '.manifests', 'manifests-index', `version-${version}.json`);
    if (!existsSync(manifestsDir) || readdirSync(manifestsDir).length === 0 || !existsSync(indexFile)) {
        console.warn(`No manifest build output for version ${version} in .manifests/.`);
        console.warn(`run: npm run manifests:build -- --version ${version}`);
        process.exit(1);
    }

    // Preflight 2: clean tree. The snapshot filters admit every file at depth >= 2
    // inside demo directories, so untracked local files would upload into the
    // Demo Snapshot. A fresh clone passes trivially; ignored files (.manifests/,
    // node_modules/) don't trip porcelain.
    const dirty = execFileSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' }).trim();
    if (dirty && !allowDirty) {
        console.warn('Working tree is not clean — untracked files inside demo directories would upload into the Demo Snapshot.');
        console.warn('Sync from a fresh clone, or pass --allow-dirty to override.');
        process.exit(1);
    }

    for (const args of planCommands({ version, bucket })) {
        console.log(`rclone ${args.join(' ')}`);
        const { status } = spawnSync('rclone', args, { cwd: ROOT, stdio: 'inherit' });
        if (status !== 0) {
            process.exit(status ?? 1);
        }
    }
    console.log(`Synced Demo Snapshot + Manifests version ${version} to ${bucket}`);
}
