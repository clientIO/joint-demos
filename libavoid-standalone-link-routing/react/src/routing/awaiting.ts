import { linkStyleLine } from '@joint/react-plus';
import type { dia } from '@joint/plus';

/** Added while the router still owes the link a route; styled in `index.css`. */
export const AWAITING_CLASS = 'awaiting-update';

/*
 * The full `class` values for the link's visible line, derived through
 * `linkStyleLine` — the same preset that expands the records' `style.className`
 * — so the library's own line class never has to be repeated here. Writing the
 * `class` attribute replaces it wholesale, which is why the toggle needs both
 * complete strings.
 */
const AWAITING_LINE_CLASS = linkStyleLine({ className: AWAITING_CLASS }).class as string;
const DEFAULT_LINE_CLASS = linkStyleLine().class as string;

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
 *
 * Nothing else is touched here: the service itself keeps a pending link
 * presentable, applying an interim `rightAngle` route while Libavoid is still
 * computing the real one.
 *
 * Deliberately a raw model write, NOT the GraphApi's `setCell`: `setCell` maps
 * the link's whole merged record back onto the model, so the record's plain
 * `{ id, port }` ends overwrite the anchors the router service computes and
 * fire `change:source`/`change:target` without the service's change flag. The
 * service then re-routes mid-sync, and the resulting `setConnector` calls can
 * reference shapes the avoid engine no longer holds — crashing the wasm module
 * (`ConnEnd` assertion). A single-path `attr()` write triggers none of that.
 */
export function setLinkAwaiting(link: dia.Link, awaiting: boolean): void {
    link.prop('attrs/line/class', awaiting ? AWAITING_LINE_CLASS : DEFAULT_LINE_CLASS);
}
