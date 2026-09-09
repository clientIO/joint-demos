import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { completionsFor, nodeIds } from './completions.ts';

const SOURCE = 'flowchart TD\n    start([Go]) --> validate{Ok?}\n    validate -->|Yes| ship[Ship]\n';

const labels = (lineBefore: string) => completionsFor(lineBefore, SOURCE).map((entry) => entry.label);
const kinds = (lineBefore: string) => new Set(completionsFor(lineBefore, SOURCE).map((entry) => entry.kind));

describe('completionsFor', () => {
    it('offers statements, snippets and known nodes at the start of a line', () => {
        const found = labels('    ');
        assert.ok(found.includes('subgraph'));
        assert.ok(found.includes('style'));
        assert.ok(found.includes('subgraph … end'));
        assert.ok(found.includes('validate'));
    });

    it('offers directions after the diagram header and after `direction`', () => {
        assert.deepEqual(labels('flowchart '), ['TB', 'TD', 'BT', 'LR', 'RL']);
        assert.deepEqual(labels('    direction L'), ['TB', 'TD', 'BT', 'LR', 'RL']);
    });

    it('offers arrows after a node, including one declared inline', () => {
        assert.ok(labels('    validate ').includes('-->'));
        assert.ok(labels('    a[Some label] ').includes('-.->'));
        assert.ok(labels('    validate -').includes('-->'));
        assert.deepEqual(kinds('    validate '), new Set(['arrow']));
    });

    it('offers the nodes of the diagram after an arrow, plus a new-node snippet', () => {
        const found = labels('    validate --> ');
        assert.ok(found.includes('start'));
        assert.ok(found.includes('ship'));
        assert.ok(found.includes('new node'));
        assert.ok(labels('    validate -->|No| s').includes('ship'));
    });

    it('offers shape names inside an @{ shape: } block', () => {
        const found = labels('    a@{ shape: ');
        assert.ok(found.includes('rect'));
        assert.ok(found.includes('docs'));
        assert.ok(found.includes('braces'));
        assert.deepEqual(kinds('    a@{ shape: d'), new Set(['shape']));
    });

    it('offers nothing in the middle of a label', () => {
        assert.deepEqual(labels('    a[Some la'), []);
    });
});

describe('nodeIds', () => {
    it('lists each id once, in order of first appearance, ignoring keywords', () => {
        assert.deepEqual(nodeIds(SOURCE), ['start', 'validate', 'ship']);
        assert.deepEqual(nodeIds('flowchart LR\n  x@{ shape: docs, label: "Docs (all)" } --> y\n  y --> x\n'), ['x', 'y']);
    });
});
