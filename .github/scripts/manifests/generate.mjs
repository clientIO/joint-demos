// Walks a joint-demos checkout and produces Demo Manifests for every demo
// variant (any direct subdir of a demo that contains a package.json).
// Enumeration mirrors build-demos.sh: skip dot-dirs, node_modules, _site.
// demos.config.json skip flags are build-only and intentionally not honored.

import { existsSync, lstatSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { buildManifest, renderIndex } from './transform.mjs';

const SKIP_TOP_LEVEL = new Set(['node_modules', '_site']);
const SKIP_VARIANT_ENTRIES = new Set(['node_modules', 'dist', 'build', 'coverage', '.git', '.angular', '.DS_Store']);
const CODE_FILE_RE = /\.(?:js|mjs|ts|mts|jsx|tsx)$/;

function listFiles(dir, prefix = '') {
    const files = [];
    for (const name of readdirSync(dir).sort()) {
        if (SKIP_VARIANT_ENTRIES.has(name)) continue;
        const path = join(dir, name);
        const rel = prefix ? `${prefix}/${name}` : name;
        const stats = lstatSync(path);
        if (stats.isSymbolicLink()) continue;
        if (stats.isDirectory()) {
            if (name.startsWith('.')) continue;
            files.push(...listFiles(path, rel));
        } else {
            files.push(rel);
        }
    }
    return files;
}

export function generateManifests(rootDir, version) {
    const outputs = new Map();
    const indexEntries = [];
    for (const demoName of readdirSync(rootDir).sort()) {
        if (demoName.startsWith('.') || SKIP_TOP_LEVEL.has(demoName)) continue;
        const demoDir = join(rootDir, demoName);
        if (!statSync(demoDir).isDirectory()) continue;
        for (const variantDir of readdirSync(demoDir).sort()) {
            const variantPath = join(demoDir, variantDir);
            if (variantDir.startsWith('.') || !statSync(variantPath).isDirectory()) continue;
            if (!existsSync(join(variantPath, 'package.json'))) continue;
            const readmePath = [join(variantPath, 'README.md'), join(demoDir, 'README.md')]
                .find((candidate) => existsSync(candidate));
            if (!readmePath) {
                console.warn(`:: Skipping ${demoName}/${variantDir} (no README.md at variant or demo level)`);
                continue;
            }
            const files = listFiles(variantPath);
            const manifest = buildManifest({
                demoName,
                variantDir,
                version,
                readme: readFileSync(readmePath, 'utf8'),
                packageJson: JSON.parse(readFileSync(join(variantPath, 'package.json'), 'utf8')),
                files,
                sources: files
                    .filter((file) => CODE_FILE_RE.test(file))
                    .map((file) => readFileSync(join(variantPath, file), 'utf8')),
            });
            outputs.set(manifest.path, manifest.content);
            indexEntries.push(manifest.indexEntry);
        }
    }
    outputs.set(`version-${version}/index.json`, renderIndex(version, indexEntries));
    return outputs;
}
