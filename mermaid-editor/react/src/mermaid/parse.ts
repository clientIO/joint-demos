import type { Mermaid } from 'mermaid';
import type { FlowArrow, FlowDirection, FlowEdge, FlowGraph, FlowStroke } from './types';

/**
 * Parsing Mermaid flowchart source into a plain {@link FlowGraph}.
 *
 * Mermaid's Langium package (`@mermaid-js/parser`) does not cover flowcharts —
 * they are still handled by the jison grammar bundled inside `mermaid` itself.
 * The entry point is `mermaidAPI.getDiagramFromText()`, which runs the real
 * parser and hands back the populated diagram database.
 *
 * From that database we use `getData()` rather than the lower-level
 * `getVertices()`/`getEdges()`: it has already normalized vertex syntax into
 * stable shape ids (`A(x)` → `roundedRect`) and split `<-->` into per-end arrow
 * types, which is exactly the level of detail we need.
 *
 * Mermaid must run in a browser — its sanitizer depends on a real DOM.
 */

/** Mermaid diagram type ids that this demo can render. */
const SUPPORTED_TYPES = new Set(['flowchart', 'flowchart-v2']);

/** Structural view of the parts of Mermaid's flowchart DB that we read. */
interface FlowDbLike {
    getDirection(): string | undefined;
    getData(): {
        nodes: Array<{
            id: string;
            label?: string;
            shape?: string;
            isGroup?: boolean;
            cssStyles?: string[];
            cssCompiledStyles?: string[];
        }>;
        edges: Array<{
            id: string;
            start?: string;
            end?: string;
            label?: string;
            arrowTypeStart?: string;
            arrowTypeEnd?: string;
            pattern?: string;
            minlen?: number;
        }>;
    };
}

/** Thrown for anything the demo cannot turn into a diagram. */
export class MermaidParseError extends Error {}

let mermaidReady: Promise<Mermaid> | undefined;

/**
 * Load and configure Mermaid once, lazily. Keeping the import dynamic keeps
 * roughly two megabytes of parser and renderer out of the entry chunk.
 */
function loadMermaid() {
    mermaidReady ??= import('mermaid').then(({ default: mermaid }) => {
        mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' });
        return mermaid;
    });
    return mermaidReady;
}

function toDirection(raw: string | undefined): FlowDirection {
    switch (raw) {
        // `TD` ("top down") is Mermaid's alias for `TB`.
        case 'TD':
        case 'TB':
            return 'TB';
        case 'BT':
            return 'BT';
        case 'LR':
            return 'LR';
        case 'RL':
            return 'RL';
        default:
            return 'TB';
    }
}

function toArrow(raw: string | undefined): FlowArrow {
    switch (raw) {
        case 'arrow_point':
        case 'arrow_circle':
        case 'arrow_cross':
            return raw;
        default:
            return 'none';
    }
}

function toStroke(raw: string | undefined): FlowStroke {
    switch (raw) {
        case 'thick':
        case 'dotted':
        case 'invisible':
            return raw;
        default:
            return 'normal';
    }
}

/** Mermaid errors are sometimes plain strings or `{ str }` objects. */
function toMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object' && 'str' in error) {
        return String((error as { str: unknown }).str);
    }
    return 'Unable to parse the diagram.';
}

/**
 * Parse Mermaid flowchart source.
 * @param text - Mermaid source, e.g. `flowchart TD\n A --> B`.
 * @returns The normalized graph.
 * @throws {MermaidParseError} On a syntax error, an empty diagram, or a diagram
 *   type other than `flowchart` / `graph`.
 */
export async function parseFlowchart(text: string): Promise<FlowGraph> {
    if (text.trim() === '') {
        throw new MermaidParseError('Nothing to render — write a `flowchart` diagram.');
    }

    const mermaid = await loadMermaid();

    let diagram;
    try {
        diagram = await mermaid.mermaidAPI.getDiagramFromText(text);
    } catch (error) {
        throw new MermaidParseError(toMessage(error));
    }

    if (!SUPPORTED_TYPES.has(diagram.type)) {
        throw new MermaidParseError(
            `This demo renders "flowchart" diagrams only, but got "${diagram.type}".`
        );
    }

    const db = diagram.db as unknown as FlowDbLike;
    const { nodes, edges } = db.getData();

    // Subgraphs come back as extra nodes flagged `isGroup`, with their members
    // pointing at them via `parentId`. This demo renders a flat graph, so the
    // group nodes are dropped and the membership is ignored.
    const groups = nodes.filter((node) => node.isGroup);
    const flowNodes = nodes
        .filter((node) => !node.isGroup)
        .map((node) => ({
            id: node.id,
            label: node.label?.trim() || node.id,
            shape: node.shape ?? 'squareRect',
            classStyles: node.cssCompiledStyles ?? [],
            styles: node.cssStyles ?? [],
        }));

    const known = new Set(flowNodes.map((node) => node.id));
    const flowEdges: FlowEdge[] = [];

    for (const edge of edges) {
        const { start, end } = edge;
        // An edge into or out of a subgraph has no node to attach to once the
        // group is gone; skipping it beats rendering a dangling link.
        if (!start || !end || !known.has(start) || !known.has(end)) continue;

        const stroke = toStroke(edge.pattern);
        if (stroke === 'invisible') continue;

        flowEdges.push({
            id: edge.id,
            source: start,
            target: end,
            label: edge.label?.trim() ?? '',
            sourceArrow: toArrow(edge.arrowTypeStart),
            targetArrow: toArrow(edge.arrowTypeEnd),
            stroke,
            minLen: edge.minlen && edge.minlen > 0 ? edge.minlen : 1,
        });
    }

    if (flowNodes.length === 0) {
        throw new MermaidParseError('The diagram is empty — add at least one node.');
    }

    return {
        direction: toDirection(db.getDirection()),
        nodes: flowNodes,
        edges: flowEdges,
        droppedSubgraphs: groups.length,
    };
}
