import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { parseSyncArgs, planCommands, SNAPSHOT_FILTERS } from './sync.mjs';

test('parseSyncArgs parses a plain dev sync', () => {
    assert.deepEqual(parseSyncArgs(['--version', '4.3']), {
        version: '4.3',
        prod: false,
        allowDirty: false,
    });
});

test('parseSyncArgs parses --prod and --allow-dirty', () => {
    assert.deepEqual(parseSyncArgs(['--prod', '--version', '4.3', '--allow-dirty']), {
        version: '4.3',
        prod: true,
        allowDirty: true,
    });
});

test('parseSyncArgs rejects bad input', () => {
    assert.equal(parseSyncArgs([]), null);                          // version required
    assert.equal(parseSyncArgs(['--version', '4']), null);          // not X.Y
    assert.equal(parseSyncArgs(['--version', 'v4.3']), null);       // not X.Y
    assert.equal(parseSyncArgs(['--version', '4.3', '--nope']), null); // unknown flag
});

test('planCommands emits the three version-scoped rclone commands', () => {
    assert.deepEqual(planCommands({ version: '4.3', bucket: 'jointjs-demos-dev' }), [
        [
            'sync', './', 'cf-r2:jointjs-demos-dev/versioned_demos/version-4.3',
            '--filter', '- .DS_Store',
            '--filter', '- node_modules/**',
            '--filter', '- _site/**',
            '--filter', '- dist/**',
            '--filter', '- package-lock.json',
            '--filter', '- yarn.lock',
            '--filter', '- pnpm-lock.yaml',
            '--filter', '- bun.lock',
            '--filter', '- bun.lockb',
            '--filter', '- npm-shrinkwrap.json',
            '--filter', '- /.*/**',
            '--filter', '+ /*/*/**',
            '--filter', '- *',
            '--delete-excluded',
        ],
        [
            'sync', '.manifests/manifests/version-4.3',
            'cf-r2:jointjs-demos-dev/manifests/version-4.3',
        ],
        [
            'delete', 'cf-r2:jointjs-demos-dev/manifests-index',
            '--include', 'version-4.3.json',
        ],
    ]);
});

test('planCommands targets the prod bucket when asked', () => {
    const destinations = planCommands({ version: '4.3', bucket: 'jointjs-demos' })
        .map((args) => args.find((arg) => arg.startsWith('cf-r2:')));
    assert.deepEqual(destinations, [
        'cf-r2:jointjs-demos/versioned_demos/version-4.3',
        'cf-r2:jointjs-demos/manifests/version-4.3',
        'cf-r2:jointjs-demos/manifests-index',
    ]);
});

const hasRclone = spawnSync('rclone', ['version'], { stdio: 'ignore' }).status === 0;

// Runs the real rclone matcher over a synthetic demo tree, so a mis-anchored
// pattern (e.g. `- /dist/**`) fails even though the literal list looks right.
test('SNAPSHOT_FILTERS admit demo content and exclude derived artifacts', { skip: !hasRclone }, () => {
    const admitted = [
        'demo/js/assets/data.json',
        'demo/js/src/distributed.js',
        'demo/js/src/main.js',
    ];
    const excluded = [
        'root-file.md',
        '.hidden/js/file.js',
        'demo/js/node_modules/pkg/index.js',
        'demo/js/dist/bundle.js',
        'demo/js/nested/dist/chunk.js',
        'demo/js/package-lock.json',
        'demo/js/yarn.lock',
        'demo/js/pnpm-lock.yaml',
        'demo/js/bun.lock',
        'demo/js/bun.lockb',
        'demo/js/npm-shrinkwrap.json',
    ];
    const root = mkdtempSync(join(tmpdir(), 'snapshot-filters-'));
    try {
        for (const path of [...admitted, ...excluded]) {
            mkdirSync(join(root, dirname(path)), { recursive: true });
            writeFileSync(join(root, path), 'x');
        }
        const { status, stdout, stderr } = spawnSync(
            'rclone', ['lsf', '-R', '--files-only', ...SNAPSHOT_FILTERS, root],
            { encoding: 'utf8' },
        );
        assert.equal(status, 0, stderr);
        assert.deepEqual(stdout.trim().split('\n').sort(), admitted);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

// Excluded paths are invisible to a plain mirror, so without --delete-excluded
// derived artifacts already at the destination survive every sync.
test('snapshot sync deletes excluded keys already at the destination', { skip: !hasRclone }, () => {
    const src = mkdtempSync(join(tmpdir(), 'snapshot-sync-src-'));
    const dst = mkdtempSync(join(tmpdir(), 'snapshot-sync-dst-'));
    try {
        for (const [base, paths] of [
            [src, ['demo/js/src/main.js']],
            [dst, ['demo/js/src/main.js', 'demo/js/dist/bundle.js', 'demo/js/package-lock.json']],
        ]) {
            for (const path of paths) {
                mkdirSync(join(base, dirname(path)), { recursive: true });
                writeFileSync(join(base, path), 'x');
            }
        }
        const snapshotArgs = planCommands({ version: '0.0', bucket: 'unused' })[0].slice(3);
        const { status, stderr } = spawnSync(
            'rclone', ['sync', src, dst, ...snapshotArgs],
            { encoding: 'utf8' },
        );
        assert.equal(status, 0, stderr);
        const listed = spawnSync('rclone', ['lsf', '-R', '--files-only', dst], { encoding: 'utf8' });
        assert.deepEqual(listed.stdout.trim().split('\n').sort(), ['demo/js/src/main.js']);
    } finally {
        rmSync(src, { recursive: true, force: true });
        rmSync(dst, { recursive: true, force: true });
    }
});

test('SNAPSHOT_FILTERS excludes derived artifacts and fails closed at the root', () => {
    assert.deepEqual(
        SNAPSHOT_FILTERS.filter((arg) => arg !== '--filter'),
        [
            '- .DS_Store',
            '- node_modules/**',
            '- _site/**',
            '- dist/**',
            '- package-lock.json',
            '- yarn.lock',
            '- pnpm-lock.yaml',
            '- bun.lock',
            '- bun.lockb',
            '- npm-shrinkwrap.json',
            '- /.*/**',
            '+ /*/*/**',
            '- *',
        ],
    );
});
