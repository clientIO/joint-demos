// Shared helpers for pointing @joint/* dependencies at local packages
// instead of the npm registry. Used by compare-screenshots.mjs (temporary,
// per-run overrides) and link-local-packages.mjs (persistent repo-wide
// relinking).

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { execFileSync } from 'child_process';

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

// Reads the `name` a local package declares for itself. Authoritative, unlike
// the filename, which may be hand-chosen. Returns null if it cannot be read.
function localPackageName(path) {
    try {
        if (statSync(path).isDirectory()) {
            return JSON.parse(readFileSync(join(path, 'package.json'), 'utf8')).name ?? null;
        }
        // npm tarballs keep the manifest at `package/package.json`.
        const manifest = execFileSync('tar', ['-xzOf', path, 'package/package.json'], {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
        });
        return JSON.parse(manifest).name ?? null;
    } catch {
        return null;
    }
}

// Every @joint/* package staged in a local packages directory, as
// { name: path }.
//
// Read from the directory rather than inferred from what the demos declare: a
// package reached only *through* another local package is named by no manifest
// here - @joint/react arrives via @joint/react-plus - so a map built from this
// checkout alone would leave it resolving from the registry.
export function localPackagesInDir(dirPath) {
    const found = {};
    if (!existsSync(dirPath)) return found;

    for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
        if (entry.isFile() && !entry.name.toLowerCase().endsWith('.tgz')) continue;
        const path = join(dirPath, entry.name);
        const name = localPackageName(path);
        if (name?.startsWith('@joint/')) found[name] = path;
    }
    return found;
}

// Fields that count as "this demo reaches @joint/*".
// - NOTE: `peerDependencies` must be included, since NPM 7+ installs them.
const SCAN_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];

// Find every directly depended `@joint/*` package in a parsed `package.json`.
// Returns names of those packages.
export function jointDepNames(pkg) {
    const names = new Set();
    for (const field of SCAN_FIELDS) {
        if (!pkg[field]) continue;
        for (const name of Object.keys(pkg[field])) {
            if (name.startsWith('@joint/')) names.add(name);
        }
    }
    return names;
}

// Fields that get rewritten to `file:` spec.
// - NOTE: `peerDependencies` aren't resolution targets = `file:` means nothing.
const REWRITE_FIELDS = SCAN_FIELDS.filter((field) => {
    return (field !== 'peerDependencies');
});

// Point a parsed `package.json` to local packages, in place.
// - `specs` maps `@joint/*` package names to `file:` specifiers for them.
// - Two things must happen for each:
//   - Rewrite dependency (= make the demo build against local copy).
//   - Add `overrides` entry (= relevant when nothing rewritable refers to it).
//     - (Relevant for `@joint/core`.)
//     - (Avoids using released `@joint/core` against local `@joint/plus`.)
// - The rewritten dependencies and overrides must agree.
//   - (NPM rejects the override otherwise.)
// Returns names of packages pointed at something local (rewrites + overrides).
export function applyLocalPackages(pkg, specs) {
    for (const field of REWRITE_FIELDS) {
        if (!pkg[field]) continue;
        for (const depName of Object.keys(pkg[field])) {
            const spec = specs[depName];
            if (spec && pkg[field][depName] !== spec) pkg[field][depName] = spec;
        }
    }

    // Must count across every scanned field, not just rewritten ones.
    // - Package declared in `peerDependencies` still needs `overrides`.
    const applied = [...jointDepNames(pkg)].filter((name) => specs[name]);

    // Only write `overrides` if `@joint/*` is used at all.
    if (applied.length > 0) {
        pkg.overrides = { ...pkg.overrides, ...specs };
    }

    return applied;
}
