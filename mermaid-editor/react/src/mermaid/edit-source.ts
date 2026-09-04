import type { CellId } from '@joint/react-plus';
import { parseFlowchartSpans } from './flowchart-tree';
import type { FlowArrow, FlowStroke } from './types';

/**
 * Targeted edits to Mermaid source, for the controls on a selected node.
 *
 * These rewrite a span of the text rather than regenerating it. Regenerating
 * is the obvious alternative — the parser already produces a structured graph —
 * but that structure is a normalization, not a faithful syntax tree: it has no
 * comments, no formatting, no `classDef` names (classes are resolved into flat
 * declarations), no subgraphs, and shapes come back as ids rather than the
 * delimiters the author typed. Round-tripping through it would reformat the
 * whole document on every click.
 *
 * The spans come from the same Lezer grammar that drives the syntax
 * highlighting, so everything the author wrote outside the edited range —
 * comments included — survives untouched.
 */

/** Delimiters Mermaid uses for each shape this demo can switch between. */
export const SHAPE_SYNTAX = {
    squareRect: ['[', ']'],
    roundedRect: ['(', ')'],
    stadium: ['([', '])'],
    subroutine: ['[[', ']]'],
    cylinder: ['[(', ')]'],
    circle: ['((', '))'],
    diamond: ['{', '}'],
    hexagon: ['{{', '}}'],
    lean_right: ['[/', '/]'],
} as const satisfies Record<string, readonly [string, string]>;

export type EditableShape = keyof typeof SHAPE_SYNTAX;

/** Longest opening delimiter first, so `[/` is tried before `[`. */
const DELIMITER_PAIRS = Object.values(SHAPE_SYNTAX)
    .toSorted((a, b) => b[0].length - a[0].length);

/**
 * How many characters of delimiter sit on each side of the label.
 *
 * The grammar's `NodeText` is not reliably the label. For `[/Wrapped/]` the
 * span includes the slashes, because the parser reads the shape as `[`...`]`
 * with a label that happens to start and end with `/`. Trusting it meant a
 * reshape carried the slashes into the new delimiters — `{/Wrapped/}`, and
 * `[//Wrapped//]` the second time round — while a rename replaced them and
 * quietly turned the parallelogram into a rectangle.
 *
 * Reading the delimiters off the shape span instead makes both operate on the
 * label alone. Shapes this demo cannot switch between (Mermaid's asymmetric
 * `>text]`, the trapezoids) match nothing here and keep using `NodeText`.
 * @returns Opening and closing delimiter lengths, or `null` if unrecognised.
 */
function delimiterWidths(shapeText: string): readonly [number, number] | null {
    for (const [open, close] of DELIMITER_PAIRS) {
        if (
            shapeText.length >= open.length + close.length
            && shapeText.startsWith(open)
            && shapeText.endsWith(close)
        ) {
            return [open.length, close.length];
        }
    }
    return null;
}

/** A node's declaration in the source: `start([Ticket raised])`. */
interface Declaration {
    readonly id: string;
    /** Span of the id itself. */
    readonly idFrom: number;
    readonly idTo: number;
    /** Span of the shape including its delimiters, when the node has one. */
    readonly shapeFrom?: number;
    readonly shapeTo?: number;
    /** Span of the label inside the delimiters. */
    readonly labelFrom?: number;
    readonly labelTo?: number;
}

/** A `style` / `classDef` / `class` line. */
interface StyleLine {
    readonly keyword: string;
    readonly id: string;
    readonly textFrom: number;
    readonly textTo: number;
}

interface Parsed {
    readonly declarations: readonly Declaration[];
    readonly styles: readonly StyleLine[];
}

function parse(source: string): Parsed {
    const nodes = parseFlowchartSpans(source);

    const declarations: Declaration[] = [];
    const styles: StyleLine[] = [];

    for (const [index, node] of nodes.entries()) {
        if (node.name === 'StyleKeyword') {
            // `style <id> <declarations>` — the id and the text follow it.
            const id = nodes[index + 1];
            const text = nodes[index + 2];
            if (id?.name === 'NodeId' && text?.name === 'StyleText') {
                styles.push({
                    keyword: source.slice(node.from, node.to),
                    id: source.slice(id.from, id.to),
                    textFrom: text.from,
                    textTo: text.to,
                });
            }
            continue;
        }

        if (node.name !== 'NodeId') continue;
        // A `StyleKeyword` right before means this id belongs to a style line,
        // not a declaration.
        if (nodes[index - 1]?.name === 'StyleKeyword') continue;

        const id = source.slice(node.from, node.to);
        const next = nodes[index + 1];
        // The shape must start exactly where the id ends. An edge label is also
        // a `Node`, but a `Link` sits between it and the previous id.
        if (next?.name !== 'Node' || next.from !== node.to) {
            declarations.push({ id, idFrom: node.from, idTo: node.to });
            continue;
        }
        const label = nodes[index + 2];
        const hasLabel = label?.name === 'NodeText' && label.from >= next.from && label.to <= next.to;
        const widths = delimiterWidths(source.slice(next.from, next.to));
        const span = widths
            ? { labelFrom: next.from + widths[0], labelTo: next.to - widths[1] }
            : hasLabel ? { labelFrom: label.from, labelTo: label.to } : {};
        declarations.push({
            id,
            idFrom: node.from,
            idTo: node.to,
            shapeFrom: next.from,
            shapeTo: next.to,
            ...span,
        });
    }

    return { declarations, styles };
}

/**
 * The declaration that carries the shape, else the first mention. Renaming or
 * reshaping has to hit the place the node is *defined*, not a later reference.
 */
function findDeclaration(parsed: Parsed, id: CellId): Declaration | undefined {
    const matches = parsed.declarations.filter((declaration) => declaration.id === String(id));
    return matches.find((declaration) => declaration.shapeFrom !== undefined) ?? matches[0];
}

/**
 * Mermaid has no literal newline inside a label — a line break is `<br>`. The
 * in-place editor is a textarea, so it hands over real newlines and they are
 * encoded here, at the boundary where text becomes Mermaid syntax.
 */
function encodeBreaks(label: string): string {
    return label.replaceAll(/\r?\n/g, '<br>');
}

/** Mermaid needs a quoted label once it contains its own delimiters. */
function quoteLabel(label: string): string {
    return /["[\](){}|<>]/.test(label) ? `"${label.replaceAll('"', '\'')}"` : label;
}

function splice(source: string, from: number, to: number, insert: string): string {
    return source.slice(0, from) + insert + source.slice(to);
}

/**
 * Rewrite a node's label.
 * @param source - Current Mermaid source.
 * @param id - Node to rename.
 * @param label - New label text.
 * @returns The updated source, or `null` when the node cannot be found.
 */
export function setNodeLabel(source: string, id: CellId, label: string): string | null {
    // A v11 `id@{ … }` block owns the label; edit it there, or the block's
    // `label:` would override whatever a bracket splice wrote.
    const meta = findMetaBlock(source, id);
    if (meta) {
        const safe = encodeBreaks(label.trim()).replaceAll('"', '\'');
        const body = withMetaEntry(meta.body, 'label', `"${safe}"`);
        return splice(source, meta.bodyFrom, meta.bodyTo, body);
    }

    const parsed = parse(source);
    const declaration = findDeclaration(parsed, id);
    if (!declaration) return null;
    const text = quoteLabel(encodeBreaks(label.trim()));

    if (declaration.labelFrom !== undefined && declaration.labelTo !== undefined) {
        return splice(source, declaration.labelFrom, declaration.labelTo, text);
    }
    // A bare `a --> b` has no shape to hold a label; give it the default one.
    if (declaration.shapeFrom !== undefined && declaration.shapeTo !== undefined) {
        return splice(source, declaration.shapeFrom, declaration.shapeTo, `[${text}]`);
    }
    return splice(source, declaration.idTo, declaration.idTo, `[${text}]`);
}

/** Strips the optional quotes a bracket label may carry, for `label: "…"`. */
function unquoteLabel(label: string): string {
    const trimmed = label.trim();
    return trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')
        ? trimmed.slice(1, -1)
        : trimmed;
}

/**
 * Swap a node's shape. The classic nine rewrite the delimiters, which is how
 * Mermaid originally spelt shape; any other (v11) shape name has no delimiter
 * syntax at all, so the declaration is rewritten into an `id@{ shape: …,
 * label: "…" }` block — the only spelling those shapes have.
 * @param source - Current Mermaid source.
 * @param id - Node to reshape.
 * @param shape - Target shape: an {@link EditableShape} or a v11 shape name.
 * @returns The updated source, or `null` when the node cannot be found.
 */
export function setNodeShape(source: string, id: CellId, shape: string): string | null {
    // Same rule as the label: a `@{ … }` block's `shape:` wins over the
    // delimiters, so the reshape has to land inside the block.
    const meta = findMetaBlock(source, id);
    if (meta) {
        const body = withMetaEntry(meta.body, 'shape', META_SHAPE_NAMES[shape] ?? shape);
        return splice(source, meta.bodyFrom, meta.bodyTo, body);
    }

    const parsed = parse(source);
    const declaration = findDeclaration(parsed, id);
    if (!declaration) return null;
    const label = declaration.labelFrom !== undefined && declaration.labelTo !== undefined
        ? source.slice(declaration.labelFrom, declaration.labelTo)
        : quoteLabel(String(id));

    const bracket = (SHAPE_SYNTAX as Record<string, readonly [string, string]>)[shape];
    const replacement = bracket
        ? `${bracket[0]}${label}${bracket[1]}`
        : `@{ shape: ${shape}, label: "${unquoteLabel(label).replaceAll('"', '\'')}" }`;

    if (declaration.shapeFrom !== undefined && declaration.shapeTo !== undefined) {
        return splice(source, declaration.shapeFrom, declaration.shapeTo, replacement);
    }
    return splice(source, declaration.idTo, declaration.idTo, replacement);
}

/**
 * Rewrites one property of a declaration list, keeping the others.
 *
 * A comma-valued entry (`stroke-dasharray:5,5`) splits into the declaration
 * plus bare continuation tokens; a token without a colon therefore belongs to
 * the declaration before it and must follow its fate — kept with a kept
 * neighbour, dropped with a removed one.
 */
function withProperty(declarations: string, property: string, value: string | null): string {
    const matcher = new RegExp(`^${property}\\s*:`, 'i');
    const kept: string[] = [];
    let isDroppingContinuation = false;
    for (const raw of declarations.split(',')) {
        const entry = raw.trim();
        if (entry === '') continue;
        if (!entry.includes(':')) {
            if (!isDroppingContinuation) kept.push(entry);
            continue;
        }
        isDroppingContinuation = matcher.test(entry);
        if (!isDroppingContinuation) kept.push(entry);
    }
    const next = value === null ? kept : [...kept, `${property}:${value}`];
    return next.join(',');
}

/** The indentation the author is already using for their statements. */
function statementIndent(source: string): string {
    return /^([ \t]+)\S/m.exec(source.slice(source.indexOf('\n') + 1))?.[1] ?? '    ';
}

function escapeRegExp(text: string): string {
    return text.replaceAll(/[$()*+.?[\\\]^{|}]/g, String.raw`\$&`);
}

/** A node's v11 config block: `id@{ shape: card, label: "…" }`. */
interface MetaBlock {
    /** Span of the `{ … }` body, braces excluded. */
    readonly bodyFrom: number;
    readonly bodyTo: number;
    readonly body: string;
}

/**
 * Finds a node's `@{ … }` block. The Lezer grammar predates this syntax and
 * emits error nodes for it, so `parse()` sees such a node as bare — these
 * blocks are located by regex and edited in place instead.
 */
function findMetaBlock(source: string, id: CellId): MetaBlock | null {
    const matcher = new RegExp(
        // Boundary: `-` is legal inside Mermaid ids, so it must not separate —
        // editing `b` may not match `a-b`. Body: a `}` inside a quoted label
        // belongs to the label, not the block.
        `(?:^|[^\\w"-])${escapeRegExp(String(id))}@\\{((?:"[^"]*"|[^}])*)\\}`,
        'm'
    );
    const match = matcher.exec(source);
    if (!match) return null;
    const bodyFrom = match.index + match[0].indexOf('{') + 1;
    return { bodyFrom, bodyTo: bodyFrom + match[1].length, body: match[1] };
}

/** Sets one `key: value` entry inside a `@{ … }` block body. */
function withMetaEntry(body: string, key: string, value: string): string {
    const entry = new RegExp(`(${key}\\s*:\\s*)("[^"]*"|[^,}]*)`);
    if (entry.test(body)) return body.replace(entry, (_, prefix: string) => `${prefix}${value}`);
    const trimmed = body.trim();
    return trimmed === '' ? ` ${key}: ${value} ` : ` ${trimmed}, ${key}: ${value} `;
}

/**
 * How the toolbar's shapes are spelt inside `@{ shape: … }` — Mermaid's v11
 * aliases for the classic delimiter shapes.
 */
const META_SHAPE_NAMES: Record<string, string> = {
    squareRect: 'rect',
    roundedRect: 'rounded',
    stadium: 'stadium',
    subroutine: 'subroutine',
    cylinder: 'cylinder',
    circle: 'circle',
    diamond: 'diamond',
    hexagon: 'hexagon',
    lean_right: 'lean-r',
};

/**
 * Set or clear one property on a node's `style` line, creating or removing the
 * line as needed.
 * @param source - Current Mermaid source.
 * @param id - Node to restyle.
 * @param property - CSS property, e.g. `fill` or `stroke-dasharray`.
 * @param value - Property value, or `null` to drop the entry.
 * @returns The updated source, or `null` when the node cannot be found.
 */
export function setNodeStyleProperty(
    source: string,
    id: CellId,
    property: string,
    value: string | null
): string | null {
    const parsed = parse(source);
    if (!findDeclaration(parsed, id)) return null;
    const name = String(id);
    const existing = parsed.styles.find(
        (line) => line.keyword === 'style' && line.id === name
    );

    if (existing) {
        const rest = withProperty(source.slice(existing.textFrom, existing.textTo), property, value);
        if (rest !== '') return splice(source, existing.textFrom, existing.textTo, ` ${rest}`);
        // Nothing left to declare, so take the whole line with it.
        const lineStart = source.lastIndexOf('\n', existing.textFrom) + 1;
        const lineEnd = source.indexOf('\n', existing.textTo);
        return splice(source, lineStart, lineEnd === -1 ? source.length : lineEnd + 1, '');
    }

    if (value === null) return source;
    const separator = source.endsWith('\n') ? '' : '\n';
    return `${source}${separator}${statementIndent(source)}style ${name} ${property}:${value}\n`;
}

/**
 * Set or clear a node's fill, via its `style` line.
 * @param source - Current Mermaid source.
 * @param id - Node to recolour.
 * @param fill - CSS colour, or `null` to drop the fill.
 * @returns The updated source, or `null` when the node cannot be found.
 */
export function setNodeFill(source: string, id: CellId, fill: string | null): string | null {
    return setNodeStyleProperty(source, id, 'fill', fill);
}

/**
 * Set or remove a node's hyperlink — the `click <id> "<url>"` statement.
 *
 * `click` lines are matched with a per-line regex rather than through the
 * Lezer grammar: `codemirror-lang-mermaid` has no node for them, so the
 * grammar sees only free text there.
 * @param source - Current Mermaid source.
 * @param id - Node to link.
 * @param url - Target URL, or `null` to remove the link.
 * @returns The updated source, or `null` when the node cannot be found.
 */
export function setNodeLink(source: string, id: CellId, url: string | null): string | null {
    const parsed = parse(source);
    if (!findDeclaration(parsed, id)) return null;
    const name = String(id);
    const line = new RegExp(`^[ \t]*click[ \t]+${escapeRegExp(name)}[ \t].*(?:\n|$)`, 'm');
    // A raw double quote would unbalance the statement; percent-encode it, as
    // any URL serializer would.
    const safeUrl = url?.replaceAll('"', '%22');

    const existing = line.exec(source);
    if (existing) {
        if (safeUrl === undefined) {
            return splice(source, existing.index, existing.index + existing[0].length, '');
        }
        // Keep an existing tooltip: only the URL between the first pair of
        // quotes changes. A replacer function, so `$` in the URL stays literal.
        // A `click` line with no quoted part (Mermaid's callback form) is
        // rewritten to the URL form wholesale.
        const replaced = /"[^"]*"/.test(existing[0])
            ? existing[0].replace(/"[^"]*"/, () => `"${safeUrl}"`)
            : `${statementIndent(source)}click ${name} "${safeUrl}"\n`;
        return splice(source, existing.index, existing.index + existing[0].length, replaced);
    }

    if (safeUrl === undefined) return source;
    const separator = source.endsWith('\n') ? '' : '\n';
    return `${source}${separator}${statementIndent(source)}click ${name} "${safeUrl}"\n`;
}

/** The lowest `stepN` id no declaration uses yet. */
function mintStepId(parsed: Parsed): string {
    const taken = new Set(parsed.declarations.map((declaration) => declaration.id));
    let counter = 1;
    while (taken.has(`step${counter}`)) counter += 1;
    return `step${counter}`;
}

/**
 * Append a new node connected from an existing one: `parent --> stepN[…]`.
 * @param source - Current Mermaid source.
 * @param parentId - Node the new step hangs off.
 * @returns The updated source, or `null` when the parent cannot be found.
 */
export function addChildNode(source: string, parentId: CellId): string | null {
    const parsed = parse(source);
    if (!findDeclaration(parsed, parentId)) return null;
    const step = mintStepId(parsed);
    const separator = source.endsWith('\n') ? '' : '\n';
    return `${source}${separator}${statementIndent(source)}${String(parentId)} --> ${step}[New step]\n`;
}

/** The `flowchart` / `graph` header line every flowchart declaration starts with. */
const FLOWCHART_HEADER = /^[ \t]*(?:flowchart|graph)\b/im;

/**
 * Append a new top-level, unconnected node — how a diagram starts from
 * scratch. Blank source gets the `flowchart TD` header along with it.
 *
 * Refuses a source that is not a flowchart at all (a pasted `sequenceDiagram`,
 * say): appending flowchart syntax there would silently corrupt the author's
 * text, and every sibling editor here declines the same way when its anchor
 * is missing.
 * @param source - Current Mermaid source, possibly empty.
 * @returns The updated source and the new node's id, or `null` when the
 *   source is not a flowchart.
 */
export function addNode(
    source: string
): { readonly source: string; readonly id: string } | null {
    if (source.trim() !== '' && !FLOWCHART_HEADER.test(source)) return null;
    const base = source.trim() === '' ? 'flowchart TD\n' : source;
    const parsed = parse(base);
    const step = mintStepId(parsed);
    const separator = base.endsWith('\n') ? '' : '\n';
    return {
        source: `${base}${separator}${statementIndent(base)}${step}[New step]\n`,
        id: step,
    };
}

/**
 * Append an edge between two existing nodes: `a --> b`.
 * @param source - Current Mermaid source.
 * @param from - Source node.
 * @param to - Target node.
 * @returns The updated source, or `null` when either node cannot be found.
 */
export function addEdge(source: string, from: CellId, to: CellId): string | null {
    const parsed = parse(source);
    if (!findDeclaration(parsed, from) || !findDeclaration(parsed, to)) return null;
    const separator = source.endsWith('\n') ? '' : '\n';
    return `${source}${separator}${statementIndent(source)}${String(from)} --> ${String(to)}\n`;
}

/**
 * Rewrite the diagram's layout direction on the `flowchart` / `graph` header
 * line. A header with no direction gets one appended; `direction` statements
 * inside subgraphs are left alone — only the header line is touched.
 * @param source - Current Mermaid source.
 * @param direction - Target direction: `TB`, `BT`, `LR` or `RL`.
 * @returns The updated source, or `null` when no header line exists.
 */
export function setDirection(source: string, direction: string): string | null {
    const header = /^([ \t]*(?:flowchart|graph))((?:[ \t]+)(?:TB|TD|BT|LR|RL))?(?=\s|$)/im.exec(source);
    if (!header) return null;
    const from = header.index + header[1].length;
    const to = from + (header[2]?.length ?? 0);
    return splice(source, from, to, ` ${direction}`);
}

/* ------------------------------------------------------------------------- *
 * Edge edits, for the controls on a selected edge.
 * ------------------------------------------------------------------------- */

/** Which edge to edit, as the parse reported it. */
export interface EdgeRef {
    /** Mermaid's edge id — the author's own when the edge carries `id@`. */
    readonly id: string;
    readonly source: string;
    readonly target: string;
    /** Position among all declared edges — what `linkStyle <n>` addresses. */
    readonly index: number;
    /** Which declaration this is among edges sharing the (source, target) pair. */
    readonly pairIndex: number;
}

/** The span of one edge's arrow token: `-->`, `-.->`, `<==>`. */
interface EdgeSpan {
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
 * the text. An id directly followed by `@` is an edge id, not a node.
 */
function edgeSpans(source: string): EdgeSpan[] {
    const nodes = parseFlowchartSpans(source);
    const ids: Array<{ id: string; from: number; to: number }> = [];
    const masked: Array<readonly [number, number]> = [];

    for (const [index, node] of nodes.entries()) {
        if (MASKED_SPANS.has(node.name)) masked.push([node.from, node.to]);
        if (node.name !== 'NodeId') continue;
        if (nodes[index - 1]?.name === 'StyleKeyword') continue;
        if (source[node.to] === '@') continue;
        ids.push({ id: source.slice(node.from, node.to), from: node.from, to: node.to });
    }

    const spans: EdgeSpan[] = [];
    for (let index = 0; index < ids.length - 1; index += 1) {
        const gapFrom = ids[index].to;
        const gapTo = ids[index + 1].from;
        if (gapTo <= gapFrom) continue;
        let gap = source.slice(gapFrom, gapTo);
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

function findEdgeSpan(source: string, edge: EdgeRef): EdgeSpan | null {
    const matches = edgeSpans(source).filter(
        (span) => span.source === edge.source && span.target === edge.target
    );
    return matches[edge.pairIndex] ?? null;
}

const START_HEADS: Record<FlowArrow, string> = {
    none: '',
    arrow_point: '<',
    arrow_circle: 'o',
    arrow_cross: 'x',
};
const END_HEADS: Record<FlowArrow, string> = {
    none: '',
    arrow_point: '>',
    arrow_circle: 'o',
    arrow_cross: 'x',
};

/** What an edge's arrow token should say, in Mermaid's own spelling. */
function composeArrow(
    stroke: FlowStroke,
    sourceArrow: FlowArrow,
    targetArrow: FlowArrow,
    minLen: number
): string {
    const start = START_HEADS[sourceArrow];
    const end = END_HEADS[targetArrow];
    // A headless dotted arrow is `-.-`; adding a head replaces nothing, so the
    // dot count alone carries the length. Line arrows spell length in dashes:
    // `-->` and `---` are both length 1.
    if (stroke === 'dotted') return `${start}-${'.'.repeat(minLen)}-${end}`;
    const dash = stroke === 'thick' ? '=' : '-';
    const width = minLen + (start === '' && end === '' ? 2 : 1);
    return start + dash.repeat(width) + end;
}

/** The line/arrow changes {@link setEdgeArrow} can apply. */
export interface EdgeArrowChange {
    readonly stroke?: FlowStroke;
    readonly sourceArrow?: FlowArrow;
    readonly targetArrow?: FlowArrow;
}

const HEAD_ARROWS: Record<string, FlowArrow> = {
    '<': 'arrow_point',
    '>': 'arrow_point',
    o: 'arrow_circle',
    x: 'arrow_cross',
};

interface ArrowParts {
    readonly stroke: FlowStroke;
    readonly sourceArrow: FlowArrow;
    readonly targetArrow: FlowArrow;
    readonly minLen: number;
}

/** Reads an arrow token back into its parts; `null` for exotic spellings. */
function decomposeArrow(token: string): ArrowParts | null {
    const match = /^([<xo])?([-=.]+)([>xo])?$/.exec(token);
    if (!match) return null;
    const [, start, line, end] = match;
    const sourceArrow: FlowArrow = start === undefined ? 'none' : HEAD_ARROWS[start];
    const targetArrow: FlowArrow = end === undefined ? 'none' : HEAD_ARROWS[end];
    const dots = (line.match(/\./g) ?? []).length;
    if (dots > 0) return { stroke: 'dotted', sourceArrow, targetArrow, minLen: dots };
    const stroke: FlowStroke = line.includes('=') ? 'thick' : 'normal';
    const headless = sourceArrow === 'none' && targetArrow === 'none';
    return {
        stroke,
        sourceArrow,
        targetArrow,
        minLen: Math.max(1, line.length - (headless ? 2 : 1)),
    };
}

/**
 * Rewrite an edge's arrow token — its line pattern and heads.
 *
 * The parts NOT being changed are read from the token as it stands in the
 * source right now, not from the caller's view of the edge: the caller's data
 * lags a parse behind after its own previous edit, and composing from it would
 * resurrect the older arrow.
 * @param source - Current Mermaid source.
 * @param edge - Which edge to rewrite.
 * @param change - The parts of the arrow to change.
 * @returns The updated source, or `null` when the edge cannot be located.
 */
export function setEdgeArrow(
    source: string,
    edge: EdgeRef,
    change: EdgeArrowChange
): string | null {
    const span = findEdgeSpan(source, edge);
    if (!span) return null;
    const current = decomposeArrow(source.slice(span.from, span.to));
    if (!current) return null;
    return splice(
        source,
        span.from,
        span.to,
        composeArrow(
            change.stroke ?? current.stroke,
            change.sourceArrow ?? current.sourceArrow,
            change.targetArrow ?? current.targetArrow,
            current.minLen
        )
    );
}

/**
 * Set or clear one property on an edge's `linkStyle` line.
 *
 * A `linkStyle` addresses edges by declaration index — that is Mermaid's own
 * contract, and it means inserting an edge above shifts the numbers, exactly
 * as it does on mermaid.live. The `interpolate` form is a separate statement
 * and is deliberately not matched here.
 * @param source - Current Mermaid source.
 * @param edgeIndex - The edge's declaration index.
 * @param property - CSS property, e.g. `stroke`.
 * @param value - Property value, or `null` to drop the entry.
 * @returns The updated source.
 */
export function setEdgeStyleProperty(
    source: string,
    edgeIndex: number,
    property: string,
    value: string | null
): string {
    const line = new RegExp(
        `^[ \t]*linkStyle[ \t]+${edgeIndex}[ \t]+(?!interpolate\\b)(\\S.*?)[ \t]*\r?$`,
        'm'
    );
    const existing = line.exec(source);
    if (existing) {
        const rest = withProperty(existing[1], property, value);
        const lineEnd = existing.index + existing[0].length;
        if (rest !== '') {
            const bodyFrom = existing.index + existing[0].indexOf(existing[1]);
            return splice(source, bodyFrom, bodyFrom + existing[1].length, rest);
        }
        return splice(
            source,
            existing.index,
            lineEnd + (source[lineEnd] === '\n' ? 1 : 0),
            ''
        );
    }
    if (value === null) return source;
    const separator = source.endsWith('\n') ? '' : '\n';
    return `${source}${separator}${statementIndent(source)}linkStyle ${edgeIndex} ${property}:${value}\n`;
}

/**
 * Set or clear an edge's `linkStyle <n> interpolate <curve>` statement.
 * @param source - Current Mermaid source.
 * @param edgeIndex - The edge's declaration index.
 * @param curve - A d3 curve name (`basis`, `linear`, …), or `null` to drop it.
 * @returns The updated source.
 */
export function setEdgeInterpolate(
    source: string,
    edgeIndex: number,
    curve: string | null
): string {
    const line = new RegExp(
        `^[ \t]*linkStyle[ \t]+${edgeIndex}[ \t]+interpolate[ \t]+[\\w-]+[ \t]*\r?$`,
        'm'
    );
    const existing = line.exec(source);
    if (existing) {
        const lineEnd = existing.index + existing[0].length;
        if (curve === null) {
            return splice(
                source,
                existing.index,
                lineEnd + (source[lineEnd] === '\n' ? 1 : 0),
                ''
            );
        }
        return splice(
            source,
            existing.index,
            lineEnd,
            existing[0].replace(/interpolate[ \t]+[\w-]+/, `interpolate ${curve}`)
        );
    }
    if (curve === null) return source;
    const separator = source.endsWith('\n') ? '' : '\n';
    return `${source}${separator}${statementIndent(source)}linkStyle ${edgeIndex} interpolate ${curve}\n`;
}

/** Removes one `key: value` entry from a `@{ … }` block body. */
function withoutMetaEntry(body: string, key: string): string {
    return body
        .replace(new RegExp(`(^|,)\\s*${key}\\s*:\\s*("[^"]*"|[^,}]*)`), '$1')
        .replace(/^\s*,/, '')
        .replace(/,\s*$/, '')
        .replace(/,\s*,/, ',');
}

/**
 * Whether the source already declares this edge id — an `id@` arrow prefix or
 * an `id@{ … }` config block.
 */
function hasEdgeId(source: string, id: string): boolean {
    return new RegExp(`(?:^|[^\\w"-])${escapeRegExp(id)}@(?=[-=.<xo{])`).test(source);
}

/** A short edge id (`e1`, `e2`, …) not used by any node or edge yet. */
function mintEdgeId(source: string): string {
    const taken = new Set(parse(source).declarations.map((declaration) => declaration.id));
    for (const match of source.matchAll(/(\w+)@(?=[-=.<xo{])/g)) taken.add(match[1]);
    let counter = 1;
    while (taken.has(`e${counter}`) || hasEdgeId(source, `e${counter}`)) counter += 1;
    return `e${counter}`;
}

/**
 * Turn the marching-dash animation on or off for one edge.
 *
 * Animation is v11 syntax: the edge needs an id (`a e1@--> b`) and a config
 * block (`e1@{ animate: true }`). Turning it on writes both; turning it off
 * removes the `animate` entry again, and the whole block when nothing else is
 * left in it.
 * @param source - Current Mermaid source.
 * @param edge - Which edge to animate.
 * @param animate - Whether the marching dashes should run.
 * @returns The updated source, or `null` when the edge cannot be located.
 */
export function setEdgeAnimation(
    source: string,
    edge: EdgeRef,
    animate: boolean
): string | null {
    const hasId = hasEdgeId(source, edge.id);

    if (!animate) {
        if (!hasId) return source;
        const meta = findMetaBlock(source, edge.id);
        if (!meta) return source;
        const body = withoutMetaEntry(meta.body, 'animate');
        if (body.trim() !== '') return splice(source, meta.bodyFrom, meta.bodyTo, body);
        // Nothing left in the block: drop its whole line when it stands alone.
        const blockFrom = source.lastIndexOf(edge.id, meta.bodyFrom);
        const lineStart = source.lastIndexOf('\n', blockFrom) + 1;
        const lineEnd = source.indexOf('\n', meta.bodyTo);
        const line = source.slice(lineStart, lineEnd === -1 ? source.length : lineEnd);
        if (new RegExp(`^[ \t]*${escapeRegExp(edge.id)}@\\{[^}]*\\}[ \t]*\r?$`).test(line)) {
            return splice(source, lineStart, lineEnd === -1 ? source.length : lineEnd + 1, '');
        }
        return splice(source, meta.bodyFrom, meta.bodyTo, ' animate: false ');
    }

    let next = source;
    let id = edge.id;
    if (!hasId) {
        const span = findEdgeSpan(source, edge);
        if (!span) return null;
        id = mintEdgeId(source);
        next = splice(source, span.from, span.from, `${id}@`);
    }
    const meta = findMetaBlock(next, id);
    if (meta) {
        return splice(next, meta.bodyFrom, meta.bodyTo, withMetaEntry(meta.body, 'animate', 'true'));
    }
    const separator = next.endsWith('\n') ? '' : '\n';
    return `${next}${separator}${statementIndent(next)}${id}@{ animate: true }\n`;
}

/**
 * Set or remove a node's image — the `id@{ img: "…" }` block entry. Mermaid
 * renders any node with an `img` as an image card, label underneath.
 * @param source - Current Mermaid source.
 * @param id - Node to illustrate.
 * @param url - Image URL, or `null` to remove the image.
 * @returns The updated source, or `null` when the node cannot be found.
 */
export function setNodeImage(source: string, id: CellId, url: string | null): string | null {
    const meta = findMetaBlock(source, id);
    const safeUrl = url?.replaceAll('"', '%22');

    if (meta) {
        const body = safeUrl === undefined
            ? withoutMetaEntry(meta.body, 'img')
            : withMetaEntry(meta.body, 'img', `"${safeUrl}"`);
        // A node block always keeps at least its label, so no line removal here.
        return splice(source, meta.bodyFrom, meta.bodyTo, body.trim() === '' ? ' ' : body);
    }

    if (safeUrl === undefined) return source;
    const parsed = parse(source);
    const declaration = findDeclaration(parsed, id);
    if (!declaration) return null;
    const label = declaration.labelFrom !== undefined && declaration.labelTo !== undefined
        ? source.slice(declaration.labelFrom, declaration.labelTo)
        : String(id);
    const block = `@{ img: "${safeUrl}", label: "${unquoteLabel(label).replaceAll('"', '\'')}" }`;
    if (declaration.shapeFrom !== undefined && declaration.shapeTo !== undefined) {
        return splice(source, declaration.shapeFrom, declaration.shapeTo, block);
    }
    return splice(source, declaration.idTo, declaration.idTo, block);
}
