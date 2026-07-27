import assert from 'node:assert/strict';
import { test } from 'node:test';
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
            '--filter', '- /.*/**',
            '--filter', '+ /*/*/**',
            '--filter', '- *',
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

test('SNAPSHOT_FILTERS is the verbatim #30 ruleset', () => {
    assert.deepEqual(
        SNAPSHOT_FILTERS.filter((arg) => arg !== '--filter'),
        ['- .DS_Store', '- node_modules/**', '- _site/**', '- /.*/**', '+ /*/*/**', '- *'],
    );
});
