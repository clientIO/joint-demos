import { parseFlowchartSpans } from './flowchart-tree.ts';
import { ARROWS, CLASSIC_SHAPE_NAMES, DIRECTIONS, EXTENDED_SHAPES, KEYWORDS } from './vocabulary.ts';

/**
 * What the source editor suggests at the caret, as plain data. Monaco is
 * kept out so the rules can be tested on strings: given the line up to the
 * caret and the whole document, which suggestions apply.
 */

export type CompletionKind = 'keyword' | 'direction' | 'arrow' | 'node' | 'shape' | 'snippet';

export interface Completion {
    readonly kind: CompletionKind;
    /** What the list shows. */
    readonly label: string;
    /** What gets inserted; `$1`/`${1:x}` tab stops when `isSnippet`. */
    readonly insertText: string;
    readonly isSnippet?: true;
    readonly detail: string;
}

/** Statement snippets offered at the start of a line. */
const SNIPPETS: readonly Completion[] = [
    {
        kind: 'snippet',
        label: 'subgraph … end',
        insertText: 'subgraph ${1:group} [${2:Title}]\n    $0\nend',
        isSnippet: true,
        detail: 'A titled group of nodes',
    },
    {
        kind: 'snippet',
        label: 'node with shape',
        insertText: '${1:id}@{ shape: ${2:rect}, label: "${3:Label}" }',
        isSnippet: true,
        detail: 'A node declared with a v11 shape',
    },
    {
        kind: 'snippet',
        label: 'style node',
        insertText: 'style ${1:id} fill:#${2:ddffee},stroke:#${3:0f766e}',
        isSnippet: true,
        detail: 'Fill and border for one node',
    },
    {
        kind: 'snippet',
        label: 'click link',
        insertText: 'click ${1:id} "${2:https://example.com}"',
        isSnippet: true,
        detail: 'Open a URL when the node is clicked',
    },
];

/** A line that is (so far) only whitespace, or a word being typed at its start. */
const AT_LINE_START = /^\s*[\w-]*$/;
/** After the diagram header, or after `direction`, a direction follows. */
const WANTS_DIRECTION = /^\s*(?:flowchart|graph|direction)\s+[A-Za-z]*$/;
/** Inside an `@{ … }` block, right after `shape:`. */
const WANTS_SHAPE = /@\{[^}]*\bshape\s*:\s*[\w-]*$/;
/** An id (possibly with its shape text) followed by whitespace: an arrow may come next. */
const AFTER_NODE = /(?:^|\s)[\w-]+(?:[[({>][^\n]*?[\])}])?\s+[-=<.~xo>|]*$/;
/** An arrow token followed by whitespace: a node id may come next. */
const AFTER_ARROW = /[<xo]?(?:-{2,}|={2,}|-\.+-|~{3,})[>xo]?(?:\|[^|]*\|)?\s+[\w-]*$/;

/** Every node id declared in the document, in order of first appearance. */
export function nodeIds(source: string): readonly string[] {
    const ids: string[] = [];
    const seen = new Set<string>();
    for (const span of parseFlowchartSpans(source)) {
        if (span.name !== 'NodeId') continue;
        const id = source.slice(span.from, span.to);
        if (seen.has(id)) continue;
        seen.add(id);
        ids.push(id);
    }
    return ids;
}

/**
 * The completions that fit the caret. `lineBefore` is the current line up to
 * the caret; `source` is the whole document (for the node ids).
 * @param lineBefore - Text of the caret's line before the caret.
 * @param source - The whole document.
 * @returns Suggestions, most specific context first; empty when nothing fits.
 */
export function completionsFor(lineBefore: string, source: string): readonly Completion[] {
    if (WANTS_SHAPE.test(lineBefore)) {
        return [...CLASSIC_SHAPE_NAMES, ...EXTENDED_SHAPES].map((shape) => ({
            kind: 'shape',
            label: shape.id,
            insertText: shape.id,
            detail: shape.label,
        }));
    }
    if (WANTS_DIRECTION.test(lineBefore)) {
        return DIRECTIONS.map((direction) => ({
            kind: 'direction',
            label: direction.word,
            insertText: direction.word,
            detail: direction.detail,
        }));
    }
    if (AT_LINE_START.test(lineBefore)) {
        return [
            ...KEYWORDS.map((keyword): Completion => ({
                kind: 'keyword',
                label: keyword.word,
                insertText: keyword.word,
                detail: keyword.detail,
            })),
            ...SNIPPETS,
            ...nodeCompletions(source),
        ];
    }
    if (AFTER_ARROW.test(lineBefore)) {
        return [
            ...nodeCompletions(source),
            {
                kind: 'snippet',
                label: 'new node',
                insertText: '${1:id}[${2:Label}]',
                isSnippet: true,
                detail: 'Declare a new node here',
            },
        ];
    }
    if (AFTER_NODE.test(lineBefore)) {
        return ARROWS.map((arrow) => ({
            kind: 'arrow',
            label: arrow.token,
            insertText: arrow.token,
            detail: arrow.detail,
        }));
    }
    return [];
}

function nodeCompletions(source: string): readonly Completion[] {
    return nodeIds(source).map((id) => ({ kind: 'node', label: id, insertText: id, detail: 'Node in this diagram' }));
}
