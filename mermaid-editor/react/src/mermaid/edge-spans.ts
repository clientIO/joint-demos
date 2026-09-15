import { blankMetaBlocks, parseFlowchartSpans } from './flowchart-tree.ts';

/** The span of one edge's arrow token: `-->`, `-.->`, `<==>`. */
export interface EdgeSpan {
    readonly source: string;
    readonly target: string;
    readonly from: number;
    readonly to: number;
}

/** One whole arrow token: optional start head, line pattern, optional end head. */
const ARROW_TOKEN = /[<xo]?(?:-{2,}|={2,}|-\.+-)[>xo]?/g;

/**
 * Span names whose text must never be mistaken for an arrow: shapes and
 * labels (either can contain `-->` as prose), strings, style text, comments.
 */
const MASKED_SPANS = new Set(['Node', 'NodeText', 'NodeEdgeText', 'String', 'StyleText', 'LineComment']);


/**
 * Every arrow token in the source, with the node ids on either side.
 *
 * The Lezer grammar locates the node ids reliably, but not the arrows — it
 * predates several spellings (`-.->` lexes into fragments, `e1@-->` not at
 * all). So the ids come from the grammar and the arrow is found by regex in
 * the gap between two consecutive ids, with the grammar's shape/label/string
 * spans blanked out first so arrow-lookalikes inside prose never match.
 * A gap holding anything other than exactly one arrow-shaped token — an
 * `a & b` fan, the old split-label form `a-- text -->b` — is reported as
 * *unfindable* rather than guessed at, so edits no-op instead of corrupting
 * the text. An id directly followed by `@` and an arrow is an edge id, not a
 * node; `id@{ … }` is a node (its block is blanked before the parse).
 */
export function edgeSpans(source: string): EdgeSpan[] {
    const nodes = parseFlowchartSpans(source);
    // Gaps are read from the blanked text: a `x --> y` inside a `@{ label }`
    // must never pass for an arrow.
    const blanked = blankMetaBlocks(source);
    const ids: Array<{ id: string; from: number; to: number }> = [];
    const masked: Array<readonly [number, number]> = [];

    for (const [index, node] of nodes.entries()) {
        if (MASKED_SPANS.has(node.name)) masked.push([node.from, node.to]);
        if (node.name !== 'NodeId') continue;
        if (nodes[index - 1]?.name === 'StyleKeyword') continue;
        // `e1@-->` names the edge; `b@{ … }` is a node with a metadata block.
        if (source[node.to] === '@' && source[node.to + 1] !== '{') continue;
        ids.push({ id: source.slice(node.from, node.to), from: node.from, to: node.to });
    }

    const spans: EdgeSpan[] = [];
    for (let index = 0; index < ids.length - 1; index += 1) {
        const gapFrom = ids[index].to;
        const gapTo = ids[index + 1].from;
        if (gapTo <= gapFrom) continue;
        let gap = blanked.slice(gapFrom, gapTo);
        for (const [maskFrom, maskTo] of masked) {
            if (maskTo <= gapFrom || maskFrom >= gapTo) continue;
            const start = Math.max(maskFrom, gapFrom) - gapFrom;
            const end = Math.min(maskTo, gapTo) - gapFrom;
            gap = gap.slice(0, start) + ' '.repeat(end - start) + gap.slice(end);
        }
        const matches = [...gap.matchAll(ARROW_TOKEN)];
        if (matches.length !== 1 || matches[0].index === undefined) continue;
        spans.push({
            source: ids[index].id,
            target: ids[index + 1].id,
            from: gapFrom + matches[0].index,
            to: gapFrom + matches[0].index + matches[0][0].length,
        });
    }
    return spans;
}
