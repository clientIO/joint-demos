import type { dia, mvc } from '@joint/plus';

/**
 * The option that tells this app's own graph listener the write came from the
 * router and needs no round trip back to the worker.
 *
 * `unset` types its options as `Silenceable`, but JointJS passes the whole
 * object through to the `change` event, which is where this is read.
 */
const FROM_WORKER = { fromWorker: true } as unknown as mvc.Silenceable;

/**
 * The class `@joint/react` puts on every link's visible line. Writing the
 * `class` attribute replaces it wholesale, so it has to be repeated here.
 */
const LINE_CLASS = 'jj-link-line';

/** Added while the worker still owes the link a route; styled in `index.css`. */
export const AWAITING_CLASS = 'awaiting-update';

/**
 * Marks a link as waiting for its route, or clears the mark.
 *
 * The pending look lives on the model rather than on a mounted view, which is
 * what makes it work under virtual rendering: a link scrolled off-screen has no
 * view to hold a highlighter, and would come back without one. Its `attrs` come
 * with it whenever it is mounted again.
 *
 * The initial value is declared on the link records in `cells.ts` — every
 * link starts out awaiting — via the `style.className` shorthand, which expands
 * to exactly the class written here.
 */
export function setLinkAwaiting(link: dia.Link, awaiting: boolean): void {
    link.attr('line/class', awaiting ? `${LINE_CLASS} ${AWAITING_CLASS}` : LINE_CLASS, {
        fromWorker: true,
    });
    if (!awaiting) return;
    /*
     * Hand the link back to the paper's own orthogonal routing for the wait.
     *
     * A routed link carries `router: 'normal'`, which draws it straight through
     * the vertices Libavoid gave it. Those vertices are exactly what is about to
     * be replaced, so leaving that router on would draw the link as a set of
     * diagonals cutting across the diagram until the reply lands. Unsetting it
     * keeps the pending link orthogonal — the same shape it will come back as.
     */
    link.unset('router', FROM_WORKER);
    /*
     * And drop the route itself, because the paper's router reads the vertices
     * it is given. They describe a route Libavoid computed for the diagram as it
     * was — mid-drag, for a node that has since moved — so routing through them
     * would bend the pending link around nothing. A link with no route has no
     * vertices; the reply brings both back together.
     */
    link.set('vertices', [], FROM_WORKER);
}
