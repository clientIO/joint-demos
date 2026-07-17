import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { canonicalVariant, edition, extractUses, parseReadme } from './transform.mjs';
import { generateManifests, resolveKeywords } from './generate.mjs';

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
        'render(GraphProvider);',
    ].join('\n');
    // shapes is never imported from a Joint package, so it is not recorded;
    // GraphProvider has no member access, so it is recorded bare.
    assert.deepEqual(extractUses([source]), ['GraphProvider', 'dia.Paper', 'ui.Stencil']);
});

test('extractUses collapses chains after the first capitalized segment', () => {
    const source = [
        'import { dia, shapes, util, highlighters } from \'@joint/core\';',
        'new dia.Paper({} as dia.Paper.Options);',
        'const id: dia.Cell.ID = id2;',
        'new shapes.standard.Rectangle();',
        'util.breakText(\'x\');',
        'highlighters.addClass.add(view, \'body\', \'hl\');',
    ].join('\n');
    assert.deepEqual(extractUses([source]), [
        'dia.Cell',
        'dia.Paper',
        'highlighters.addClass',
        'shapes.standard.Rectangle',
        'util.breakText',
    ]);
});

test('extractUses canonicalizes aliased and star imports', () => {
    const aliased = [
        'import { shapes as defaultShapes } from \'@joint/core\';',
        'new defaultShapes.standard.Rectangle();',
    ].join('\n');
    assert.deepEqual(extractUses([aliased]), ['shapes.standard.Rectangle']);
    const bareAlias = [
        'import { shapes as defaultShapes } from \'@joint/core\';',
        'register(defaultShapes);',
    ].join('\n');
    assert.deepEqual(extractUses([bareAlias]), ['shapes']);
    const star = [
        'import * as joint from \'@joint/core\';',
        'new joint.shapes.standard.Rectangle();',
        'joint.util.breakText(\'x\');',
    ].join('\n');
    assert.deepEqual(extractUses([star]), ['shapes.standard.Rectangle', 'util.breakText']);
});

test('extractUses drops tooling and unused imports', () => {
    const source = [
        'import { jsx } from \'@joint/react-plus/jsx-runtime\';',
        'import { env } from \'@joint/core\';',
        'import { dia, ui } from \'@joint/plus\';',
        'if (env.test) {}',
        'new dia.Paper({});',
    ].join('\n');
    // jsx and env are tooling bindings; ui is imported but never referenced.
    assert.deepEqual(extractUses([source]), ['dia.Paper']);
});

test('parseReadme strips multi-line HTML and keeps prose angle brackets', () => {
    const markdown = [
        '# Demo',
        '',
        'Summary paragraph.',
        '',
        '<a href="https://stackblitz.com/github/clientio/joint-demos/tree/main/demo/js">',
        '  <img',
        '    alt="Open in StackBlitz"',
        '    src="https://developer.stackblitz.com/img/open_in_stackblitz.svg"',
        '  />',
        '</a>',
        '',
        'Costs a < b and <em>emphasis</em> works.',
        '',
        '## Next',
    ].join('\n');
    const { summary } = parseReadme(markdown);
    assert.equal(summary, 'Summary paragraph.\n\nCosts a < b and emphasis works.');
});

test('resolveKeywords omits missing demos and skips comma keywords', () => {
    // Both paths warn on stderr; assertions cover the returned value only.
    assert.deepEqual(resolveKeywords('kanban', {}), []);
    assert.deepEqual(
        resolveKeywords('kanban', { kanban: ['task board', 'flowchart, diagram', 'swimlane'] }),
        ['task board', 'swimlane'],
    );
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
