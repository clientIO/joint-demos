/**
 * The paper ⇄ worker message protocol.
 *
 * Both sides are backed by a `dia.Graph`, and the graph is what owns the state:
 * the paper's graph is the diagram, the worker's is a shadow of it that the
 * router works against. So the protocol is a replay log rather than a data
 * format — plain JointJS cell JSON travels out, and the geometry the router
 * computed travels back to be set on the models it belongs to.
 */

/** A link end, as JointJS stores it. */
export interface LinkEndJSON {
    readonly id?: string | number;
    readonly port?: string | null;
    /**
     * The anchor the router computed. Opaque here: it is set back onto the
     * link verbatim, and only JointJS ever reads inside it.
     */
    readonly anchor?: unknown;
}

/**
 * A cell as `cell.toJSON()` serializes it.
 *
 * Mostly opaque — the worker hands it straight to its graph — with the few
 * fields named that the incremental `change` command replays by hand.
 */
export type CellJSON = {
    readonly id: string | number;
    readonly type: string;
    readonly position?: { readonly x: number; readonly y: number };
    readonly size?: { readonly width: number; readonly height: number };
    readonly source?: LinkEndJSON;
    readonly target?: LinkEndJSON;
    readonly [key: string]: unknown;
};

/** Sent to the worker; each command replays one graph edit onto its graph. */
export type RouterCommand =
    | { readonly command: 'reset'; readonly cells: readonly CellJSON[] }
    | { readonly command: 'add'; readonly cell: CellJSON }
    | { readonly command: 'change'; readonly cell: CellJSON }
    | { readonly command: 'remove'; readonly id: string };

/** One routed link: what the router wrote onto the worker's copy of it. */
export interface RoutedLink {
    readonly id: string;
    readonly vertices: readonly { readonly x: number; readonly y: number }[];
    readonly source: LinkEndJSON;
    readonly target: LinkEndJSON;
    /**
     * The router the link should draw with.
     *
     * `normal` when Libavoid produced a usable route — the vertices are the
     * route, so the link is drawn straight through them. `null` when it did
     * not, which hands the link back to the paper's own orthogonal router.
     */
    readonly router: { readonly name: string; readonly args?: Record<string, unknown> } | null;
}

/** Sent back from the worker. */
export type RouterResponse = {
    readonly command: 'routed';
    readonly cells: readonly RoutedLink[];
};
