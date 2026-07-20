#!/usr/bin/env node

// Builds Demo Manifests into .manifests/: one markdown Manifest per demo at
// manifests/version-X.Y/{demo}.md plus a slim index at
// manifests-index/version-X.Y.json, ready to upload to the demos R2 bucket
// under the matching prefixes — see README.md here.
//
// Usage: npm run manifests:build -- --version 4.3

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { generateManifests } from './generate.mjs';

const USAGE = 'Usage: npm run manifests:build -- --version X.Y (e.g. 4.3)';

let values = {};
try {
    ({ values } = parseArgs({ options: { version: { type: 'string' } } }));
} catch {
    console.warn(USAGE);
    process.exit(1);
}
if (!values.version || !/^\d+\.\d+$/.test(values.version)) {
    console.warn(USAGE);
    process.exit(1);
}

const ROOT = resolve(import.meta.dirname, '..', '..', '..');
const OUT_DIR = join(ROOT, '.manifests');

rmSync(OUT_DIR, { recursive: true, force: true });
const outputs = generateManifests(ROOT, values.version);
for (const [relPath, content] of outputs) {
    const destination = join(OUT_DIR, relPath);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, content);
}
const demoCount = [...outputs.keys()].filter((key) => key.startsWith('manifests/version-')).length;
const variantCount = JSON.parse(outputs.get(`manifests-index/version-${values.version}.json`)).length;
console.log(
    `Wrote ${outputs.size} files to .manifests/ (${demoCount} demos, ${variantCount} variants, Demo Snapshot version ${values.version})`,
);
