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

// The fields a demo declares its @joint/* packages in. Nothing here looks at
// peerDependencies: no demo has any, and overriding one would change what npm
// considers satisfied rather than what it installs.
const DEP_FIELDS = ['dependencies', 'devDependencies'];

// Every @joint/* package a parsed package.json depends on directly.
export function jointDepNames(pkg) {
    const names = new Set();
    for (const field of DEP_FIELDS) {
        if (!pkg[field]) continue;
        for (const name of Object.keys(pkg[field])) {
            if (name.startsWith('@joint/')) names.add(name);
        }
    }
    return names;
}

// Points a parsed package.json at local packages, in place.
//
// `specs` maps a @joint/* package name to the file: specifier standing in for
// it. Two things happen for each one, and both are needed:
//
//   - a direct dependency on it is rewritten, which is what makes the demo
//     build against the local copy;
//   - an `overrides` entry is written, which is what catches the package when
//     nothing declares it directly. @joint/core is the case that matters:
//     @joint/plus depends on it by range, and almost no demo declares it, so
//     without an override npm resolves it from the registry and the run
//     quietly tests a released core against a local @joint/plus.
//
// The two must agree. npm rejects an override that conflicts with a direct
// dependency on the same package unless the specs are identical - which they
// are here, because both come from `specs`.
//
// Returns the names that were pointed at something local.
export function applyLocalPackages(pkg, specs) {
    const applied = [];

    for (const field of DEP_FIELDS) {
        if (!pkg[field]) continue;
        for (const depName of Object.keys(pkg[field])) {
            const spec = specs[depName];
            if (!spec) continue;
            if (pkg[field][depName] !== spec) pkg[field][depName] = spec;
            applied.push(depName);
        }
    }

    // Overrides are only worth writing for a demo that reaches @joint/* at all;
    // on anything else they are noise npm would never consult.
    if (applied.length > 0) {
        pkg.overrides = { ...pkg.overrides, ...specs };
    }

    return applied;
}
