import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { edgeSpans } from './edge-spans.ts';
import { PRESETS } from './presets.ts';

const tokens = (source: string) =>
    edgeSpans(source).map((span) => `${span.source} ${source.slice(span.from, span.to)} ${span.target}`);

describe('edgeSpans', () => {
    it('finds the arrow into a node declared with an @{ } block', () => {
        assert.deepEqual(tokens('flowchart TD\n  a --> b@{ shape: docs, label: "Audit trail" }\n'), ['a --> b']);
    });

    it('keeps parallel edges apart, in document order', () => {
        const source = 'flowchart TD\n  a --> b@{ shape: docs, label: "Audit trail" }\n  a --x b\n';
        assert.deepEqual(tokens(source), ['a --> b', 'a --x b']);
    });

    it('never reads an arrow out of an @{ } label', () => {
        assert.deepEqual(tokens('flowchart TD\n  a --> b@{ label: "x --> y" }\n  b --> c\n'), ['a --> b', 'b --> c']);
    });

    it('survives brackets inside an @{ } label, for the ids after it too', () => {
        const source = 'flowchart TD\n  a --> b@{ shape: braces, label: "Comment (both)" } --> c[Next]\n  c --> d\n';
        assert.deepEqual(tokens(source), ['a --> b', 'b --> c', 'c --> d']);
    });

    it('finds every arrow in the "All node shapes" example', () => {
        const preset = PRESETS.find((candidate) => candidate.name === 'All node shapes');
        assert.ok(preset);
        const arrows = preset.source.match(/-->/g) ?? [];
        const spans = edgeSpans(preset.source);
        assert.equal(spans.length, arrows.length);
        for (const span of spans) assert.match(span.source + span.target, /^[\w-]+$/);
    });

    it('treats id@ before an arrow as an edge id, not a node', () => {
        assert.deepEqual(tokens('flowchart TD\n  a e1@--> b\n'), ['a --> b']);
    });

    it('reports a fan-out gap as unfindable instead of guessing', () => {
        assert.deepEqual(tokens('flowchart TD\n  a --> b & c\n'), ['a --> b']);
    });
});
