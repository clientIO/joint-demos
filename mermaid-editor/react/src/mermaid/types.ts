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
    /** Id of the subgraph the node is declared inside, when any. */
    readonly parent?: string;
    /** Hyperlink from a `click <id> "<url>"` statement. */
    readonly href?: string;
    /** Tooltip from `click <id> "<url>" "<tooltip>"`. */
    readonly hrefTitle?: string;
}

/** A `subgraph … end` block, rendered as a container behind its members. */
export interface FlowGroup {
    readonly id: string;
    readonly label: string;
    /** Enclosing subgraph for nested `subgraph` blocks, when any. */
    readonly parent?: string;
}

/** Marching-dash speed of an animated edge (`e1@{ animate: true }`). */
export type FlowAnimation = 'normal' | 'fast' | 'slow';

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
    /** Present when the edge asks for the marching-dash animation. */
    readonly animation?: FlowAnimation;
}

export interface FlowGraph {
    readonly direction: FlowDirection;
    readonly nodes: readonly FlowNode[];
    readonly groups: readonly FlowGroup[];
    readonly edges: readonly FlowEdge[];
    /**
     * Edges that start or end on a subgraph itself. Dagre cannot route an edge
     * to a cluster, so these are skipped and the UI says so.
     */
    readonly droppedGroupEdges: number;
}
