import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { setEdgeLabel } from './edit-source.ts';
import type { EdgeRef } from './edit-source.ts';

const edge = (source: string, target: string, pairIndex = 0): EdgeRef =>
    ({ id: `${source}-${target}`, source, target, index: 0, pairIndex });

describe('setEdgeLabel', () => {
    it('adds a pipe label to a bare edge', () => {
        assert.equal(setEdgeLabel('flowchart TD\n  a --> b\n', edge('a', 'b'), 'Yes'), 'flowchart TD\n  a -->|Yes| b\n');
    });

    it('rewrites an existing pipe label in place', () => {
        assert.equal(setEdgeLabel('flowchart TD\n  a -->|Yes| b\n', edge('a', 'b'), 'No'), 'flowchart TD\n  a -->|No| b\n');
    });

    it('drops the pipes when the label is emptied', () => {
        assert.equal(setEdgeLabel('flowchart TD\n  a -->|Yes| b\n', edge('a', 'b'), '  '), 'flowchart TD\n  a --> b\n');
    });

    it('quotes a label that carries delimiters and never emits a pipe', () => {
        assert.equal(
            setEdgeLabel('flowchart TD\n  a -.-> b\n', edge('a', 'b'), 'a|b (c)'),
            'flowchart TD\n  a -.->|"a/b (c)"| b\n'
        );
    });

    it('targets the right one of two parallel edges', () => {
        const source = 'flowchart TD\n  a --> b\n  a --x b\n';
        assert.equal(setEdgeLabel(source, edge('a', 'b', 1), 'retry'), 'flowchart TD\n  a --> b\n  a --x|retry| b\n');
    });

    it('returns null for an edge it cannot locate', () => {
        assert.equal(setEdgeLabel('flowchart TD\n  a --> b\n', edge('a', 'z'), 'x'), null);
    });
});
