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

/**
 * The body of a v11 `id@{ shape: …, label: "…" }` block, as a regex source: a
 * `}` inside a quoted label belongs to the label, not the block.
 */
export const META_BLOCK_BODY = '(?:"[^"]*"|[^}])*';

const META_BLOCK = new RegExp(`@\\{${META_BLOCK_BODY}\\}`, 'g');

/**
 * The source with every `@{ … }` block turned into spaces of the same length.
 * The grammar predates these blocks: left in, a `(` or `[` inside a label
 * desyncs it for the rest of the line and the ids after it never come out.
 * Same-length blanks keep every offset valid.
 * @param source - Mermaid source.
 * @returns The source, metadata blocks blanked.
 */
export function blankMetaBlocks(source: string): string {
    return source.replace(META_BLOCK, (block) => ' '.repeat(block.length));
}

export function parseFlowchartSpans(source: string): SourceSpan[] {
    const blanked = blankMetaBlocks(source);
    const match = MISSING_DIRECTION.exec(blanked);
    const at = match ? match[1].length : -1;
    const text = at === -1
        ? blanked
        : blanked.slice(0, at) + IMPLIED_DIRECTION + blanked.slice(at);
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
