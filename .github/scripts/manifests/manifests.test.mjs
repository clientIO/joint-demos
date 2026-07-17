import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { canonicalVariant, edition, extractUses } from './transform.mjs';
import { generateManifests } from './generate.mjs';

const FIXTURES = join(import.meta.dirname, 'fixtures');

function walk(dir, prefix = '') {
    const files = [];
    for (const name of readdirSync(dir).sort()) {
        const path = join(dir, name);
        const rel = prefix ? `${prefix}/${name}` : name;
        if (statSync(path).isDirectory()) {
            files.push(...walk(path, rel));
        } else {
            files.push(rel);
        }
    }
    return files;
}

test('canonicalVariant maps directory names to Variants', () => {
    assert.equal(canonicalVariant('js'), 'js');
    assert.equal(canonicalVariant('ts'), 'ts');
    assert.equal(canonicalVariant('angular'), 'angular');
    assert.equal(canonicalVariant('react'), 'react');
    assert.equal(canonicalVariant('react-ts'), 'react');
    assert.equal(canonicalVariant('react-js'), 'react');
    assert.equal(canonicalVariant('react-redux-ts'), 'react');
    assert.equal(canonicalVariant('vue'), 'vue');
    assert.equal(canonicalVariant('vue-ts'), 'vue');
    assert.equal(canonicalVariant('vue-js'), 'vue');
    assert.equal(canonicalVariant('svelte'), 'svelte');
});

test('edition distinguishes commercial from open-source', () => {
    assert.equal(edition(['@joint/plus'], 'anything'), 'commercial');
    assert.equal(edition(['@joint/core', '@joint/react-plus'], 'anything'), 'commercial');
    assert.equal(edition(['@clientio/rappid'], 'anything'), 'commercial');
    assert.equal(edition(['rappid'], 'anything'), 'commercial');
    assert.equal(edition(['@joint/core'], 'anything'), 'open-source');
    assert.equal(edition([], 'JointJS+: CDN Demo'), 'commercial');
    assert.equal(edition([], 'Plain Demo'), 'open-source');
});

test('extractUses resolves namespace members and named symbols', () => {
    const source = [
        'import { dia, ui } from \'@joint/plus\';',
        'import { GraphProvider } from \'@joint/react-plus\';',
        'new dia.Paper({});',
        'new ui.Stencil({});',
        'new shapes.standard.Rectangle();',
    ].join('\n');
    // shapes is never imported from a Joint package, so it is not recorded;
    // GraphProvider has no member access, so it is recorded bare.
    assert.deepEqual(extractUses([source]), ['GraphProvider', 'dia.Paper', 'ui.Stencil']);
});

test('golden: sample repo produces the expected manifests and index', () => {
    const outputs = generateManifests(join(FIXTURES, 'sample-repo'), '9.9');
    const expectedRoot = join(FIXTURES, 'expected');
    const expectedFiles = walk(expectedRoot);
    assert.deepEqual([...outputs.keys()].sort(), expectedFiles);
    for (const relPath of expectedFiles) {
        assert.equal(outputs.get(relPath), readFileSync(join(expectedRoot, relPath), 'utf8'), relPath);
    }
});
