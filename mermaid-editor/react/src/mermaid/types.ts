/**
 * The slice of Mermaid's parsed flowchart that this demo cares about.
 *
 * Mermaid's own `getData()` result carries a lot of renderer-specific baggage
 * (CSS class bookkeeping, icon assets, curve hints). We narrow it to a small,
 * serializable shape here so the rest of the app never has to know about
 * Mermaid's internals.
 */

/** Layout direction declared by `flowchart TD` / `flowchart LR` / … */
export type FlowDirection = 'TB' | 'BT' | 'LR' | 'RL';

/**
 * Mermaid shape identifier, as normalized by `FlowDB.getTypeFromVertex()`.
 * Kept as a plain `string` because Mermaid keeps adding shapes via the
 * `A@{ shape: … }` syntax; unknown ids fall back to a rectangle.
 */
export type FlowShape = string;

export interface FlowNode {
    readonly id: string;
    readonly label: string;
    readonly shape: FlowShape;
    /**
     * CSS declarations (`"fill:#ddffee"`) the node gets from a `classDef` it
     * belongs to.
     */
    readonly classStyles: readonly string[];
    /**
     * CSS declarations from the node's own `style` line. Kept apart from
     * {@link classStyles} because precedence between the two is per-property,
     * and because the label colour has to know which layer set the fill.
     */
    readonly styles: readonly string[];
}

/** Arrow head style at one end of an edge. */
export type FlowArrow = 'none' | 'arrow_point' | 'arrow_circle' | 'arrow_cross';

/** Line style of an edge: `-->` vs `-.->` vs `==>`. */
export type FlowStroke = 'normal' | 'thick' | 'dotted' | 'invisible';

export interface FlowEdge {
    readonly id: string;
    readonly source: string;
    readonly target: string;
    readonly label: string;
    readonly sourceArrow: FlowArrow;
    readonly targetArrow: FlowArrow;
    readonly stroke: FlowStroke;
    /** Minimum rank distance, from Mermaid's `---->` length syntax. */
    readonly minLen: number;
}

export interface FlowGraph {
    readonly direction: FlowDirection;
    readonly nodes: readonly FlowNode[];
    readonly edges: readonly FlowEdge[];
    /** Number of `subgraph` blocks that were dropped, so the UI can say so. */
    readonly droppedSubgraphs: number;
}
