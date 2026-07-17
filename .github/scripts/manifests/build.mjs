#!/usr/bin/env node

// Builds Demo Manifests for every demo variant into .manifests/version-X.Y/
// (one markdown Manifest per variant + index.json), ready to upload to the
// demos R2 bucket under manifests/version-X.Y/ — see README.md here.
//
// Usage: npm run manifests:build -- --version 4.3

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { generateManifests } from './generate.mjs';

const { values } = parseArgs({ options: { version: { type: 'string' } } });
if (!values.version || !/^\d+\.\d+$/.test(values.version)) {
    console.warn('Usage: npm run manifests:build -- --version X.Y (e.g. 4.3)');
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
console.log(`Wrote ${outputs.size} files to .manifests/ (Demo Snapshot version ${values.version})`);
