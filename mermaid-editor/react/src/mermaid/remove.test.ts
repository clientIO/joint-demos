import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseFlowchartSpans } from './flowchart-tree.ts';
import { PRESETS } from './presets.ts';
import { removeEdge, removeNode } from './remove.ts';

const flow = (...lines: string[]) => ['flowchart TD', ...lines.map((line) => `    ${line}`), ''].join('\n');

const edge = (source: string, target: string, pairIndex = 0) =>
    ({ id: `L_${source}_${target}_${pairIndex}`, source, target, index: 0, pairIndex });

describe('removeNode', () => {
    it('cuts a chain around the removed node, keeping the neighbours as declarations', () => {
        assert.equal(removeNode(flow('a[Start] --> b --> c[End]'), 'b'), flow('a[Start]', 'c[End]'));
    });

    it('drops the head or tail of a chain', () => {
        assert.equal(removeNode(flow('a[Start] --> b[Mid] --> c[End]'), 'a'), flow('b[Mid] --> c[End]'));
        assert.equal(removeNode(flow('a[Start] --> b[Mid] --> c[End]'), 'c'), flow('a[Start] --> b[Mid]'));
    });

    it('keeps a fan-out valid', () => {
        assert.equal(removeNode(flow('a --> b & c'), 'c'), flow('a --> b'));
        assert.equal(removeNode(flow('a --> b & c'), 'b'), flow('a --> c'));
        assert.equal(removeNode(flow('a --> b & c'), 'a'), flow('b & c'));
        assert.equal(removeNode(flow('a & b --> c --> d'), 'c'), flow('a & b', 'd'));
    });

    it('drops a bare orphan that is declared elsewhere, keeps one that is not', () => {
        const source = flow('a[Start] --> b', 'b --> c', 'c --> d');
        assert.equal(removeNode(source, 'c'), flow('a[Start] --> b', 'd'));
    });

    it('removes the node\'s edge ids and their config blocks', () => {
        const source = flow('a e1@--> b', 'e1@{ animate: true }', 'b --> c');
        assert.equal(removeNode(source, 'b'), flow('a', 'c'));
    });

    it('renumbers linkStyle lines and drops those pointing at removed edges', () => {
        const source = flow(
            'a --> b',
            'b --> c',
            'c --> d',
            'linkStyle 0 stroke:#f00',
            'linkStyle 1 stroke:#0f0',
            'linkStyle 2 stroke:#00f',
            'linkStyle 0,2 interpolate basis',
            'linkStyle default stroke-width:2px'
        );
        assert.equal(removeNode(source, 'b'), flow(
            'a',
            'c --> d',
            'linkStyle 0 stroke:#00f',
            'linkStyle 0 interpolate basis',
            'linkStyle default stroke-width:2px'
        ));
    });

    it('removes style, class and click lines for the node and keeps classDef', () => {
        const source = flow(
            'a --> b',
            'style b fill:#eee',
            'class b,c myClass',
            'click b "https://example.com"',
            'classDef myClass fill:#fff'
        );
        assert.equal(removeNode(source, 'b'), flow(
            'a',
            'class c myClass',
            'classDef myClass fill:#fff'
        ));
    });

    it('removes a member from a subgraph block', () => {
        const source = flow('subgraph g [Group]', '    b', '    p --> q', 'end');
        assert.equal(removeNode(source, 'b'), flow('subgraph g [Group]', '    p --> q', 'end'));
        assert.equal(removeNode(source, 'p'), flow('subgraph g [Group]', '    b', '    q', 'end'));
    });

    it('unwraps a subgraph when its id is removed, keeping the members', () => {
        const source = flow('subgraph g [Group]', '    b', 'end', 'a --> g');
        assert.equal(removeNode(source, 'g'), flow('    b', 'a'));
    });

    it('handles @{ } nodes and :::class suffixes', () => {
        const source = flow(
            'go@{ shape: sm-circ, label: "Start" } --> rect[Rectangle]',
            'go --> doc@{ shape: doc, label: "Document" }'
        );
        assert.equal(removeNode(source, 'go'), flow('rect[Rectangle]', 'doc@{ shape: doc, label: "Document" }'));
        assert.equal(removeNode(flow('a:::cls --> b'), 'a'), flow('b'));
        assert.equal(removeNode(flow('a:::cls --> b'), 'b'), flow('a:::cls'));
    });

    it('treats the words of an old split-label edge as text, not nodes', () => {
        assert.equal(removeNode(flow('a -- yes --> b --> c'), 'b'), flow('a', 'c'));
        assert.equal(removeNode(flow('a -- yes --> b --> c'), 'c'), flow('a -- yes --> b'));
        assert.equal(removeNode(flow('a -->|no| b -.->|maybe| c'), 'b'), flow('a', 'c'));
    });

    it('refuses a non-flowchart source and an unknown node', () => {
        assert.equal(removeNode('sequenceDiagram\n    a->>b: hi\n', 'a'), null);
        assert.equal(removeNode(flow('a --> b'), 'zzz'), null);
    });

    it('leaves no mention of the node in any preset', () => {
        for (const preset of PRESETS) {
            const ids = new Set(
                parseFlowchartSpans(preset.source)
                    .filter((span) => span.name === 'NodeId')
                    .map((span) => preset.source.slice(span.from, span.to))
            );
            for (const id of ids) {
                const next = removeNode(preset.source, id);
                if (next === null) continue;
                const left = parseFlowchartSpans(next)
                    .filter((span) => span.name === 'NodeId' && next.slice(span.from, span.to) === id);
                assert.deepEqual(left, [], `${preset.name}: "${id}" survives as ${JSON.stringify(next)}`);
            }
        }
    });
});

describe('removeEdge', () => {
    it('leaves both ends as declarations, labels and shapes kept', () => {
        assert.equal(removeEdge(flow('a --> b'), edge('a', 'b')), flow('a', 'b'));
        assert.equal(removeEdge(flow('a[Start] --> b[End]'), edge('a', 'b')), flow('a[Start]', 'b[End]'));
        assert.equal(removeEdge(flow('a -->|yes| b'), edge('a', 'b')), flow('a', 'b'));
    });

    it('cuts a chain at the removed edge', () => {
        assert.equal(removeEdge(flow('a --> b --> c'), edge('a', 'b')), flow('a', 'b --> c'));
        assert.equal(removeEdge(flow('a --> b --> c'), edge('b', 'c')), flow('a --> b', 'c'));
    });

    it('drops a bare end that is declared elsewhere', () => {
        assert.equal(removeEdge(flow('a[Start] --> b', 'b --> c'), edge('a', 'b')), flow('a[Start]', 'b --> c'));
    });

    it('picks the right one of two parallel edges', () => {
        assert.equal(removeEdge(flow('a --> b', 'a -.-> b'), edge('a', 'b', 1)), flow('a --> b'));
        assert.equal(removeEdge(flow('a --> b', 'a -.-> b'), edge('a', 'b', 0)), flow('a -.-> b'));
    });

    it('unrolls a fan to remove one of its edges', () => {
        assert.equal(removeEdge(flow('a --> b & c'), edge('a', 'c')), flow('a --> b', 'c'));
        assert.equal(removeEdge(flow('a --> b & c'), edge('a', 'b')), flow('a --> c', 'b'));
        assert.equal(removeEdge(flow('a --> b & c --> d'), edge('a', 'c')), flow('a --> b', 'b & c --> d'));
        assert.equal(removeEdge(flow('a & b --> c'), edge('b', 'c')), flow('a --> c', 'b'));
    });

    it('renumbers linkStyle lines', () => {
        const source = flow('a --> b', 'b --> c', 'linkStyle 0 stroke:#f00', 'linkStyle 1 stroke:#0f0');
        assert.equal(removeEdge(source, edge('a', 'b')), flow('a', 'b --> c', 'linkStyle 0 stroke:#0f0'));
    });

    it('removes the edge\'s config block with it', () => {
        assert.equal(removeEdge(flow('a e1@--> b', 'e1@{ animate: true }'), edge('a', 'b')), flow('a', 'b'));
    });

    it('refuses a non-flowchart source and an unknown edge', () => {
        assert.equal(removeEdge('sequenceDiagram\n    a->>b: hi\n', edge('a', 'b')), null);
        assert.equal(removeEdge(flow('a --> b'), edge('b', 'a')), null);
        assert.equal(removeEdge(flow('a --> b'), edge('a', 'b', 1)), null);
    });
});
