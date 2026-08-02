import type { CellId } from '@joint/react-plus';
import { parseFlowchartSpans } from './flowchart-tree';

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
        declarations.push({
            id,
            idFrom: node.from,
            idTo: node.to,
            shapeFrom: next.from,
            shapeTo: next.to,
            ...(hasLabel ? { labelFrom: label.from, labelTo: label.to } : {}),
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

/**
 * Swap the delimiters around a node's label, which is how Mermaid spells shape.
 * @param source - Current Mermaid source.
 * @param id - Node to reshape.
 * @param shape - Target shape.
 * @returns The updated source, or `null` when the node cannot be found.
 */
export function setNodeShape(source: string, id: CellId, shape: EditableShape): string | null {
    const parsed = parse(source);
    const declaration = findDeclaration(parsed, id);
    if (!declaration) return null;
    const [open, close] = SHAPE_SYNTAX[shape];
    const label = declaration.labelFrom !== undefined && declaration.labelTo !== undefined
        ? source.slice(declaration.labelFrom, declaration.labelTo)
        : quoteLabel(String(id));

    if (declaration.shapeFrom !== undefined && declaration.shapeTo !== undefined) {
        return splice(source, declaration.shapeFrom, declaration.shapeTo, `${open}${label}${close}`);
    }
    return splice(source, declaration.idTo, declaration.idTo, `${open}${label}${close}`);
}

/** Rewrites the `fill` entry of a declaration list, keeping the others. */
function withFill(declarations: string, fill: string | null): string {
    const kept = declarations
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry !== '' && !/^fill\s*:/i.test(entry));
    const next = fill === null ? kept : [`fill:${fill}`, ...kept];
    return next.join(',');
}

/**
 * Set or clear a node's fill, via its `style` line.
 * @param source - Current Mermaid source.
 * @param id - Node to recolour.
 * @param fill - CSS colour, or `null` to drop the fill.
 * @returns The updated source, or `null` when the node cannot be found.
 */
export function setNodeFill(source: string, id: CellId, fill: string | null): string | null {
    const parsed = parse(source);
    if (!findDeclaration(parsed, id)) return null;
    const name = String(id);
    const existing = parsed.styles.find(
        (line) => line.keyword === 'style' && line.id === name
    );

    if (existing) {
        const rest = withFill(source.slice(existing.textFrom, existing.textTo), fill);
        if (rest !== '') return splice(source, existing.textFrom, existing.textTo, ` ${rest}`);
        // Nothing left to declare, so take the whole line with it.
        const lineStart = source.lastIndexOf('\n', existing.textFrom) + 1;
        const lineEnd = source.indexOf('\n', existing.textTo);
        return splice(source, lineStart, lineEnd === -1 ? source.length : lineEnd + 1, '');
    }

    if (fill === null) return source;
    const separator = source.endsWith('\n') ? '' : '\n';
    // Match the indentation the author is already using for their statements.
    const indent = /^([ \t]+)\S/m.exec(source.slice(source.indexOf('\n') + 1))?.[1] ?? '    ';
    return `${source}${separator}${indent}style ${name} fill:${fill}\n`;
}
