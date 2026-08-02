import { flowchartLanguage } from 'codemirror-lang-mermaid';

/**
 * The Lezer parse of a flowchart, as a flat list of spans.
 *
 * Everything that maps between the source text and the diagram — the syntax
 * highlighting, the caret/selection link, the node edits — reads this tree, so
 * it is shared rather than parsed separately in each place.
 *
 * It also papers over a disagreement between the two parsers. Mermaid treats
 * the direction as optional and defaults it to `TB`, so `flowchart` on its own
 * renders fine; the Lezer grammar requires one and, without it, yields nothing
 * but error nodes. Left alone that made a pasted `flowchart\n a --> b` render
 * correctly while every source-driven feature silently did nothing. A direction
 * is inserted for the parse only, and the offsets are mapped back, so the
 * author's text is untouched.
 */

export interface SourceSpan {
    readonly name: string;
    readonly from: number;
    readonly to: number;
}

/** A diagram declaration with no direction after it. */
const MISSING_DIRECTION = /^([ \t]*(?:flowchart|graph))[ \t]*(?=\r?\n|$)/i;
const IMPLIED_DIRECTION = ' TB';

export function parseFlowchartSpans(source: string): SourceSpan[] {
    const match = MISSING_DIRECTION.exec(source);
    const at = match ? match[1].length : -1;
    const text = at === -1
        ? source
        : source.slice(0, at) + IMPLIED_DIRECTION + source.slice(at);
    // Offsets past the insertion point shift back by its length; the inserted
    // direction itself collapses to a zero-width span at `at`, which no caller
    // looks for.
    const unshift = (position: number) =>
        at === -1 || position <= at
            ? position
            : Math.max(at, position - IMPLIED_DIRECTION.length);

    const spans: SourceSpan[] = [];
    flowchartLanguage.parser.parse(text).iterate({
        enter: (node) => {
            spans.push({ name: node.name, from: unshift(node.from), to: unshift(node.to) });
        },
    });
    return spans;
}
