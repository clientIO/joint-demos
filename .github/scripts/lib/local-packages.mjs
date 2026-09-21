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

// `<candidate>-<version>.tgz`, which is what `npm pack` writes.
// - The version is bounded to start with a digit, so that a longer package name
//   is not read as a version: `joint-react-plus-4.3.1.tgz` begins with
//   `joint-react-`, and a plain prefix test makes it a versioned `@joint/react`.
function isVersionedTarball(fileName, candidate) {
    if (!fileName.startsWith(`${candidate}-`) || !fileName.endsWith('.tgz')) return false;
    return /^[0-9]/.test(fileName.slice(candidate.length + 1));
}

// Looks for a tarball or unpacked directory matching a @joint/<name> package
// inside dirPath, accepting both the "npm pack" naming convention
// (joint-<name>-<version>.tgz) and plain hand-named files (<name>.tgz).
export function findLocalPackageInDir(dirPath, depName) {
    const suffix = depName.replace(/^@joint\//, '').toLowerCase();
    const entries = readdirSync(dirPath, { withFileTypes: true });

    // A filename is a convention; the manifest inside is the fact. An artifact
    // that says it is some other package is never returned for this one - the
    // spec would otherwise install a tarball under the wrong name and fail.
    // An unreadable manifest is not treated as a mismatch, so a hand-named or
    // unusual artifact still resolves the way it always did.
    const declaresThis = (path) => {
        const name = localPackageName(path);
        return name === null || name === depName;
    };
    const accept = (entryName) => {
        const path = join(dirPath, entryName);
        return declaresThis(path) ? path : null;
    };

    for (const candidate of [`joint-${suffix}`, suffix]) {
        const exactTgz = entries.find(e => e.isFile() && e.name.toLowerCase() === `${candidate}.tgz`);
        if (exactTgz) {
            const path = accept(exactTgz.name);
            if (path) return path;
        }

        const versioned = entries
            .filter(e => e.isFile() && isVersionedTarball(e.name.toLowerCase(), candidate))
            .sort((a, b) => statSync(join(dirPath, b.name)).mtimeMs - statSync(join(dirPath, a.name)).mtimeMs);
        for (const entry of versioned) {
            const path = accept(entry.name);
            if (path) return path;
        }

        const dirMatch = entries.find(e => e.isDirectory() && e.name.toLowerCase() === candidate);
        if (dirMatch) {
            const path = accept(dirMatch.name);
            if (path) return path;
        }
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
//
// Only the *names* come from the artifacts. Which artifact a name resolves to
// stays with findLocalPackageInDir, so a single policy settles it whether the
// name was found here or declared by a demo - and so directory order is never
// what picks when several artifacts match one name.
export function localPackagesInDir(dirPath) {
    const found = {};
    if (!existsSync(dirPath)) return found;

    const names = new Set();
    for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
        if (entry.isFile() && !entry.name.toLowerCase().endsWith('.tgz')) continue;
        const name = localPackageName(join(dirPath, entry.name));
        if (name?.startsWith('@joint/')) names.add(name);
    }

    for (const name of names) {
        const picked = findLocalPackageInDir(dirPath, name);
        if (picked) found[name] = picked;
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
// - Two things happen, and both are needed:
//   - Every declared dependency that has a spec is rewritten to it (= the demo
//     builds against the local copy).
//   - One `overrides` block covering all of `specs` is added, whenever the
//     manifest reaches `@joint/*` at all (= catches what nothing declares).
//     - (Relevant for `@joint/core`, which arrives via `@joint/plus`.)
//     - (Avoids using released `@joint/core` against local `@joint/plus`.)
// - The rewritten dependencies and overrides must agree.
//   - (NPM rejects the override otherwise.)
// Returns the names rewritten in place.
// - NOTE: An empty return does not mean "nothing changed" (due to `overrides`)!
export function applyLocalPackages(pkg, specs) {
    const rewritten = [];
    for (const field of REWRITE_FIELDS) {
        if (!pkg[field]) continue;
        for (const depName of Object.keys(pkg[field])) {
            const spec = specs[depName];
            if (!spec) continue;
            if (pkg[field][depName] !== spec) pkg[field][depName] = spec;
            rewritten.push(depName);
        }
    }

    // `overrides` are written whenever the manifest reaches `@joint/*` at all.
    // - Demo declaring just `@joint/plus` pulls in `@joint/core` transitively.
    //   - So locally staged core has to be overridden there too.
    // - If genuinely no `@joint/*` package is reached, `overrides` are skipped.
    if (jointDepNames(pkg).size > 0) {
        pkg.overrides = { ...pkg.overrides, ...specs };
    }

    return rewritten;
}
