// Walks a joint-demos checkout and produces one Demo Manifest per demo
// (a demo is any top-level dir with a root README.md; its variants are the
// direct subdirs containing a package.json). Enumeration mirrors
// build-demos.sh: skip dot-dirs, node_modules, _site. demos.config.json
// skip flags are build-only and intentionally not honored.

import { existsSync, lstatSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { buildDemoManifest, renderIndex } from './transform.mjs';

const SKIP_TOP_LEVEL = new Set(['node_modules', '_site']);
const SKIP_VARIANT_ENTRIES = new Set(['node_modules', 'dist', 'build', 'coverage', '.git', '.angular', '.DS_Store']);
const CODE_FILE_RE = /\.(?:js|mjs|ts|mts|jsx|tsx)$/;

// Overlay entries are validated here (warn + skip on commas, warn + omit on
// missing demos) so the transform stays pure. Exported for its unit test.
export function resolveKeywords(demoName, overlay) {
    const entry = overlay[demoName];
    if (entry === undefined) {
        console.warn(`:: No demo-keywords.json entry for ${demoName}; Keywords line omitted`);
        return [];
    }
    return entry.filter((keyword) => {
        if (keyword.includes(',')) {
            console.warn(`:: ${demoName}: skipping keyword with comma: ${JSON.stringify(keyword)}`);
            return false;
        }
        return true;
    });
}

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
    const keywordsPath = join(rootDir, 'demo-keywords.json');
    const keywordOverlay = existsSync(keywordsPath)
        ? JSON.parse(readFileSync(keywordsPath, 'utf8'))
        : {};
    for (const demoName of readdirSync(rootDir).sort()) {
        if (demoName.startsWith('.') || SKIP_TOP_LEVEL.has(demoName)) continue;
        const demoDir = join(rootDir, demoName);
        if (!statSync(demoDir).isDirectory()) continue;
        // Title/summary come from the demo-root README only; no root README
        // means no manifest and no index entries for the demo.
        const readmePath = join(demoDir, 'README.md');
        if (!existsSync(readmePath)) {
            console.warn(`:: Skipping ${demoName} (no root README.md)`);
            continue;
        }
        const variants = [];
        for (const variantDir of readdirSync(demoDir).sort()) {
            const variantPath = join(demoDir, variantDir);
            if (variantDir.startsWith('.') || !statSync(variantPath).isDirectory()) continue;
            if (!existsSync(join(variantPath, 'package.json'))) continue;
            const files = listFiles(variantPath);
            variants.push({
                variantDir,
                packageJson: JSON.parse(readFileSync(join(variantPath, 'package.json'), 'utf8')),
                files,
                sources: files
                    .filter((file) => CODE_FILE_RE.test(file))
                    .map((file) => readFileSync(join(variantPath, file), 'utf8')),
            });
        }
        // A demo with a root README but no variants yields no manifest;
        // resolve keywords only past this guard so it never warns about a
        // missing entry.
        if (variants.length === 0) continue;
        const manifest = buildDemoManifest({
            demoName,
            version,
            readme: readFileSync(readmePath, 'utf8'),
            keywords: resolveKeywords(demoName, keywordOverlay),
            variants,
        });
        outputs.set(manifest.path, manifest.content);
        indexEntries.push(...manifest.indexEntries);
    }
    outputs.set(`manifests-index/version-${version}.json`, renderIndex(indexEntries));
    return outputs;
}
