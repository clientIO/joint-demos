import type { EdgeRef } from './edit-source.ts';
import { FLOWCHART_HEADER, META_BLOCK_BODY, parseFlowchartSpans } from './flowchart-tree.ts';

/**
 * Removing a node or an edge from Mermaid source.
 *
 * Mermaid declares a graph as chains — `a --> b --> c`, `a --> b & c` — so a
 * node cannot simply be blanked out of the text: the chain it sits in has to
 * be cut around it, and every piece left standing must still be a valid
 * statement. The rewrite works line by line: each chain line is read as
 * groups of node tokens with the arrow text between them kept verbatim, the
 * removal is applied to that structure, and only the lines that changed are
 * written back. Everything else — comments, formatting, the arrow spellings —
 * survives untouched.
 *
 * `linkStyle` addresses edges by declaration index, so removing an edge
 * renumbers the statements after it; `style`, `class` and `click` lines lose
 * the node; an edge id's `e1@{ … }` config goes with its edge.
 */

/** A node as written: its id plus the shape, `@{ … }` block or `:::class` on it. */
interface NodeToken {
    readonly id: string;
    readonly text: string;
    /** Offset in the source, to keep rewritten pieces in the author's order. */
    readonly from: number;
}

/** A chain statement: node groups with the arrow text between them. */
interface Statement {
    readonly groups: readonly (readonly NodeToken[])[];
    /** `segments[i]` is the text between `groups[i]` and `groups[i + 1]`. */
    readonly segments: readonly string[];
}

interface ChainLine {
    readonly line: number;
    readonly indent: string;
    readonly statement: Statement;
    /** Text after the last node: a trailing comment, whitespace. */
    readonly suffix: string;
}

interface Edge {
    readonly source: NodeToken;
    readonly target: NodeToken;
    /** The author's `e1@` id, when the arrow carries one. */
    readonly id?: string;
    readonly line: number;
    readonly segment: number;
}

interface Document {
    readonly lines: readonly string[];
    readonly chains: ReadonlyMap<number, ChainLine>;
    /** Every declared edge, in Mermaid's own order — what `linkStyle <n>` counts. */
    readonly edges: readonly Edge[];
}

/** Statements this rewrite never touches, by their leading keyword. */
const PASSTHROUGH = /^[ \t]*(?:flowchart|graph|subgraph|end|direction|classDef|accTitle|accDescr)\b|^[ \t]*%%/;
const STYLE_LINE = /^([ \t]*(?:style|class|click)[ \t]+)(\S+)([ \t].*)?$/;
const LINK_STYLE_LINE = /^([ \t]*linkStyle[ \t]+)([\d,]+)([ \t].*)$/;
const EDGE_CONFIG_LINE = /^[ \t]*([\w-]+)@\{/;
const SUBGRAPH_LINE = /^[ \t]*subgraph\b/;
const END_LINE = /^[ \t]*end\b/;
/** Sticky, so a token's tail is read in place rather than off a slice. */
const META_BLOCK_AFTER = new RegExp(`@\\{${META_BLOCK_BODY}\\}`, 'y');
const CLASS_SUFFIX_AFTER = /:::[\w-]+/y;
/** `e1@-->`: the id belongs to the arrow after it, not to a node. */
const EDGE_ID = /([\w-]+)@(?=[-=.<xo~])/;
const FAN_GAP = /^\s*&\s*$/;
/**
 * The old split-label form, `a -- text --> b`: the grammar reads the label
 * words as node ids. An opener is exactly two line characters — a real
 * headless link (`---`, `===`, `-.-`) is longer — and the label runs until
 * the arrow that closes it.
 */
const LABEL_OPENER = /^\s*(?:--|==|-\.)\s*$/;
const LABEL_CLOSER = /-{2,}|={2,}|\.-/;

function escapeRegExp(text: string): string {
    return text.replaceAll(/[$()*+.?[\\\]^{|}]/g, String.raw`\$&`);
}

/** Where a node token ends: after its shape, `@{ … }` block and `:::class`. */
function tokenEnd(source: string, idTo: number, shapeEnds: ReadonlyMap<number, number>): number {
    let end = shapeEnds.get(idTo) ?? idTo;
    META_BLOCK_AFTER.lastIndex = end;
    end = META_BLOCK_AFTER.exec(source) ? META_BLOCK_AFTER.lastIndex : end;
    CLASS_SUFFIX_AFTER.lastIndex = end;
    return CLASS_SUFFIX_AFTER.exec(source) ? CLASS_SUFFIX_AFTER.lastIndex : end;
}

function isChainLine(line: string): boolean {
    return !PASSTHROUGH.test(line) && !STYLE_LINE.test(line) && !LINK_STYLE_LINE.test(line);
}

/** Reads one chain line into groups and segments, plus the edges it declares. */
function parseChain(
    source: string,
    line: number,
    lineFrom: number,
    lineTo: number,
    ids: ReadonlyArray<{ from: number; to: number }>,
    shapeEnds: ReadonlyMap<number, number>
): { chain: ChainLine; edges: Edge[] } {
    const groups: NodeToken[][] = [];
    const segments: string[] = [];
    // `prevEnd` closes the last real node; `lastEnd` the last id-like token
    // of any kind, so a label word's closer is read from the right place.
    let prevEnd = 0;
    let lastEnd = 0;
    let isLabelText = false;
    for (const span of ids) {
        const end = tokenEnd(source, span.to, shapeEnds);
        const token: NodeToken = {
            id: source.slice(span.from, span.to),
            text: source.slice(span.from, end),
            from: span.from,
        };
        const gap = source.slice(lastEnd, span.from);
        lastEnd = span.to;
        if (groups.length === 0) {
            groups.push([token]);
        } else if (isLabelText) {
            if (!LABEL_CLOSER.test(gap)) continue;
            isLabelText = false;
            segments.push(source.slice(prevEnd, span.from));
            groups.push([token]);
        } else if (FAN_GAP.test(gap)) {
            groups[groups.length - 1].push(token);
        } else if (LABEL_OPENER.test(gap)) {
            isLabelText = true;
            continue;
        } else {
            segments.push(gap);
            groups.push([token]);
        }
        prevEnd = end;
        lastEnd = end;
    }
    const edges: Edge[] = [];
    for (const [segment, text] of segments.entries()) {
        const id = EDGE_ID.exec(text)?.[1];
        for (const from of groups[segment]) {
            for (const to of groups[segment + 1]) edges.push({ source: from, target: to, id, line, segment });
        }
    }
    return {
        chain: {
            line,
            indent: source.slice(lineFrom, ids[0].from),
            statement: { groups, segments },
            suffix: source.slice(prevEnd, lineTo),
        },
        edges,
    };
}

function parseDocument(source: string): Document {
    const lines = source.split('\n');
    const lineStarts: number[] = [0];
    for (const line of lines.slice(0, -1)) lineStarts.push(lineStarts[lineStarts.length - 1] + line.length + 1);

    const spans = parseFlowchartSpans(source);
    const shapeEnds = new Map<number, number>();
    for (const span of spans) if (span.name === 'Node') shapeEnds.set(span.from, span.to);
    const edgeIds = new Set<string>();
    for (const match of source.matchAll(new RegExp(EDGE_ID.source, 'g'))) edgeIds.add(match[1]);

    // Node ids bucketed by line. Edge ids and `:::class` names are not nodes;
    // the spans arrive in document order, so the line pointer only advances.
    const idsByLine = new Map<number, Array<{ from: number; to: number }>>();
    let line = 0;
    for (const span of spans) {
        if (span.name !== 'NodeId') continue;
        if (source[span.to] === '@' && source[span.to + 1] !== '{') continue;
        if (source.slice(span.from - 3, span.from) === ':::') continue;
        while (line + 1 < lineStarts.length && lineStarts[line + 1] <= span.from) line += 1;
        if (!isChainLine(lines[line])) continue;
        const bucket = idsByLine.get(line) ?? [];
        bucket.push(span);
        idsByLine.set(line, bucket);
    }

    const chains = new Map<number, ChainLine>();
    const edges: Edge[] = [];
    for (const [index, ids] of idsByLine) {
        // A lone `e1@{ animate: true }` line configures an edge, not a node.
        const config = EDGE_CONFIG_LINE.exec(lines[index]);
        if (config && edgeIds.has(config[1])) continue;
        const lineFrom = lineStarts[index];
        const parsed = parseChain(source, index, lineFrom, lineFrom + lines[index].length, ids, shapeEnds);
        chains.set(index, parsed.chain);
        edges.push(...parsed.edges);
    }
    return { lines, chains, edges };
}

/** Runs of non-empty groups, each a statement of its own. */
function splitAtEmptyGroups(statement: Statement, keep: (token: NodeToken) => boolean): Statement[] {
    const pieces: Statement[] = [];
    let groups: NodeToken[][] = [];
    let segments: string[] = [];
    const flush = () => {
        if (groups.length > 0) pieces.push({ groups, segments });
        groups = [];
        segments = [];
    };
    for (const [index, group] of statement.groups.entries()) {
        const kept = group.filter(keep);
        if (kept.length === 0) {
            flush();
            continue;
        }
        if (groups.length > 0) segments.push(statement.segments[index - 1]);
        groups.push(kept);
    }
    flush();
    return pieces;
}

/**
 * The statement with one edge taken out. A plain chain is cut at the arrow;
 * a fan (`a --> b & c`) has to be unrolled, since the remaining edges of that
 * arrow no longer form a product of two groups.
 */
function withoutEdge(statement: Statement, edge: Edge): Statement[] {
    const { groups, segments } = statement;
    const at = edge.segment;
    const pieces: Statement[] = [];
    if (at > 0) pieces.push({ groups: groups.slice(0, at + 1), segments: segments.slice(0, at) });
    for (const from of groups[at]) {
        const targets = groups[at + 1].filter((to) => from !== edge.source || to !== edge.target);
        if (targets.length > 0) pieces.push({ groups: [[from], targets], segments: [segments[at]] });
    }
    if (at + 1 < groups.length - 1) {
        pieces.push({ groups: groups.slice(at + 1), segments: segments.slice(at + 1) });
    }
    return pieces;
}

interface RewrittenLine {
    readonly statements: readonly Statement[];
    /** Node groups a cut left on their own; kept only if nothing else declares them. */
    readonly orphans: readonly (readonly NodeToken[])[];
}

function rewriteChain(chain: ChainLine, removedNodes: ReadonlySet<string>, removedEdge: Edge | null): RewrittenLine {
    const { statement } = chain;
    if (removedEdge?.line === chain.line) {
        const statements = withoutEdge(statement, removedEdge);
        const declared = new Set(statements.flatMap((piece) => piece.groups.flat()));
        const ends = [...statement.groups[removedEdge.segment], ...statement.groups[removedEdge.segment + 1]];
        return { statements, orphans: ends.filter((token) => !declared.has(token)).map((token) => [token]) };
    }
    const pieces = splitAtEmptyGroups(statement, (token) => !removedNodes.has(token.id));
    // A group left on its own by a cut is an orphan; a statement that was a
    // lone group to begin with is the author's declaration and stays.
    if (statement.groups.length === 1) return { statements: pieces, orphans: [] };
    return {
        statements: pieces.filter((piece) => piece.groups.length > 1),
        orphans: pieces.filter((piece) => piece.groups.length === 1).map((piece) => piece.groups[0]),
    };
}

/**
 * Writes statements back as text, in the author's order. A token unrolled
 * onto several lines keeps its shape on the first and is a bare id after
 * that; the author's own repeated mentions are distinct tokens and keep
 * their text.
 */
function emit(statements: readonly Statement[]): string[] {
    const written = new Set<NodeToken>();
    const tokenText = (token: NodeToken) => {
        if (written.has(token)) return token.id;
        written.add(token);
        return token.text;
    };
    return statements
        .toSorted((a, b) => a.groups[0][0].from - b.groups[0][0].from)
        .map(({ groups, segments }) =>
            groups.map((group) => group.map(tokenText).join(' & '))
                .reduce((text, group, index) => `${text}${segments[index - 1]}${group}`));
}

/** Rewrites `linkStyle` indices; `null` when none of the line's edges survive. */
function renumberLinkStyle(line: string, newIndex: ReadonlyMap<number, number>): string | null {
    const match = LINK_STYLE_LINE.exec(line);
    if (!match) return line;
    const indices = match[2].split(',')
        .map((index) => newIndex.get(Number(index)))
        .filter((index) => index !== undefined);
    return indices.length === 0 ? null : `${match[1]}${indices.join(',')}${match[3]}`;
}

/** Drops ids from a `style` / `class` / `click` list; `null` when none are left. */
function withoutStyledIds(line: string, removed: ReadonlySet<string>): string | null {
    const match = STYLE_LINE.exec(line);
    if (!match) return line;
    const ids = match[2].split(',').filter((id) => !removed.has(id));
    return ids.length === 0 ? null : `${match[1]}${ids.join(',')}${match[3] ?? ''}`;
}

interface Removal {
    readonly nodes: ReadonlySet<string>;
    readonly edge: Edge | null;
    /** Whole lines to drop, by index: an unwrapped subgraph's `subgraph` and `end`. */
    readonly lines: ReadonlySet<number>;
}

function rewrite(document: Document, removal: Removal): string {
    const { lines, chains, edges } = document;
    const isRemoved = (edge: Edge) =>
        edge === removal.edge || removal.nodes.has(edge.source.id) || removal.nodes.has(edge.target.id);
    const newIndex = new Map<number, number>();
    const removedEdgeIds = new Set<string>();
    for (const [index, edge] of edges.entries()) {
        if (!isRemoved(edge)) newIndex.set(index, newIndex.size);
        else if (edge.id !== undefined) removedEdgeIds.add(edge.id);
    }

    const rewritten = new Map<number, RewrittenLine>();
    const mentioned = new Set<string>();
    for (const chain of chains.values()) {
        const isTouched = removal.edge?.line === chain.line
            || chain.statement.groups.flat().some((token) => removal.nodes.has(token.id));
        const result = isTouched
            ? rewriteChain(chain, removal.nodes, removal.edge)
            : { statements: [chain.statement], orphans: [] };
        rewritten.set(chain.line, result);
        for (const statement of result.statements) {
            for (const token of statement.groups.flat()) mentioned.add(token.id);
        }
    }

    const output: string[] = [];
    // A bare orphan already declared by a surviving statement, or by an
    // earlier orphan, would only repeat itself; a shaped one carries its
    // label and stays unless the very same text was kept already.
    const keepOrphan = (token: NodeToken): boolean => {
        if (mentioned.has(token.text)) return false;
        if (token.text === token.id && mentioned.has(token.id)) return false;
        mentioned.add(token.text);
        mentioned.add(token.id);
        return true;
    };
    for (const [index, line] of lines.entries()) {
        if (removal.lines.has(index)) continue;
        const chain = chains.get(index);
        const result = rewritten.get(index);
        if (!chain || !result) {
            const config = EDGE_CONFIG_LINE.exec(line);
            if (config && removedEdgeIds.has(config[1])) continue;
            const styled = withoutStyledIds(line, removal.nodes);
            const next = styled === null ? null : renumberLinkStyle(styled, newIndex);
            if (next !== null) output.push(next);
            continue;
        }
        if (result.statements[0] === chain.statement) {
            output.push(line);
            continue;
        }
        const orphans = result.orphans
            .map((group) => group.filter(keepOrphan))
            .filter((group) => group.length > 0)
            .map((group): Statement => ({ groups: [group], segments: [] }));
        const texts = emit([...result.statements, ...orphans]);
        for (const [position, text] of texts.entries()) {
            output.push(`${chain.indent}${text}${position === texts.length - 1 ? chain.suffix : ''}`);
        }
    }
    return output.join('\n');
}

/** Line indices of `subgraph <id> …` and its matching `end`, when `id` names a group. */
function subgraphBlock(lines: readonly string[], id: string): readonly [number, number] | null {
    const header = new RegExp(`^[ \t]*subgraph[ \t]+${escapeRegExp(id)}(?:[ \t]*\\[|[ \t]*$)`);
    const start = lines.findIndex((line) => header.test(line));
    if (start === -1) return null;
    let depth = 0;
    for (let index = start; index < lines.length; index += 1) {
        if (SUBGRAPH_LINE.test(lines[index])) depth += 1;
        else if (END_LINE.test(lines[index])) depth -= 1;
        if (depth === 0) return [start, index];
    }
    return null;
}

/**
 * Remove a node and every edge that touches it.
 *
 * Chains are cut around it, fans keep their other members, and the
 * neighbours it leaves behind stay declared — with their shape and label
 * when they carry one inline. Its `style`, `class` and `click` lines go, and
 * `linkStyle` indices are renumbered for the edges that disappeared. A
 * subgraph id unwraps the block, leaving its members in place.
 * @param source - Current Mermaid source.
 * @param id - Node (or subgraph) to remove.
 * @returns The updated source, or `null` when the source is not a flowchart
 *   or nothing declares the node.
 */
export function removeNode(source: string, id: string): string | null {
    if (!FLOWCHART_HEADER.test(source)) return null;
    const document = parseDocument(source);
    const block = subgraphBlock(document.lines, id);
    const isDeclared = [...document.chains.values()]
        .some((chain) => chain.statement.groups.flat().some((token) => token.id === id));
    if (!isDeclared && block === null) return null;
    return rewrite(document, { nodes: new Set([id]), edge: null, lines: new Set(block ?? []) });
}

/**
 * Remove exactly one edge. Both ends stay declared unless something else in
 * the source already declares them; a chain is cut at the arrow, and a fan is
 * unrolled so its other edges survive. `linkStyle` indices are renumbered.
 * @param source - Current Mermaid source.
 * @param edge - Which edge, by its ends and its position among their duplicates.
 * @returns The updated source, or `null` when the edge cannot be located.
 */
export function removeEdge(source: string, edge: Pick<EdgeRef, 'source' | 'target' | 'pairIndex'>): string | null {
    if (!FLOWCHART_HEADER.test(source)) return null;
    const document = parseDocument(source);
    const matches = document.edges.filter(
        (candidate) => candidate.source.id === edge.source && candidate.target.id === edge.target
    );
    const target = matches[edge.pairIndex];
    if (!target) return null;
    return rewrite(document, { nodes: new Set(), edge: target, lines: new Set() });
}
