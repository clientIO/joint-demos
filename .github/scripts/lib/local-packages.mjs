// Shared helpers for pointing @joint/* dependencies at local packages
// instead of the npm registry. Used by compare-screenshots.mjs (temporary,
// per-run overrides) and link-local-packages.mjs (persistent repo-wide
// relinking).

import { existsSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

// npm's file: specifier accepts an absolute path with forward slashes on
// every platform, including Windows drive-letter paths (file:C:/...).
export function toFileSpec(absPath) {
    return `file:${absPath.split('\\').join('/')}`;
}

// Resolves a user-supplied CLI path (possibly relative to cwd) to a file:
// specifier, validating that it exists.
export function resolveLocalSpec(rawPath) {
    const abs = resolve(process.cwd(), rawPath);
    if (!existsSync(abs)) {
        throw new Error(`local package path not found: ${abs}`);
    }
    return toFileSpec(abs);
}

// Looks for a tarball or unpacked directory matching a @joint/<name> package
// inside dirPath, accepting both the "npm pack" naming convention
// (joint-<name>-<version>.tgz) and plain hand-named files (<name>.tgz).
export function findLocalPackageInDir(dirPath, depName) {
    const suffix = depName.replace(/^@joint\//, '').toLowerCase();
    const entries = readdirSync(dirPath, { withFileTypes: true });

    for (const candidate of [`joint-${suffix}`, suffix]) {
        const exactTgz = entries.find(e => e.isFile() && e.name.toLowerCase() === `${candidate}.tgz`);
        if (exactTgz) return join(dirPath, exactTgz.name);

        const versioned = entries
            .filter(e => e.isFile() && e.name.toLowerCase().startsWith(`${candidate}-`) && e.name.toLowerCase().endsWith('.tgz'))
            .sort((a, b) => statSync(join(dirPath, b.name)).mtimeMs - statSync(join(dirPath, a.name)).mtimeMs);
        if (versioned.length > 0) return join(dirPath, versioned[0].name);

        const dirMatch = entries.find(e => e.isDirectory() && e.name.toLowerCase() === candidate);
        if (dirMatch) return join(dirPath, dirMatch.name);
    }
    return null;
}
