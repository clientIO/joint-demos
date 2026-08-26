import { linkAttributes } from '@joint/react-plus';
import type { dia } from '@joint/plus';

/** Added while the router still owes the link a route; styled in `index.css`. */
export const AWAITING_CLASS = 'awaiting-update';

/**
 * Marks a link as waiting for its route, or clears the mark.
 *
 * The pending look lives on the model rather than on a mounted view, which is
 * what makes it work under virtual rendering: a link scrolled off-screen has no
 * view to hold a highlighter, and would come back without one. Its attributes
 * come with it whenever it is mounted again.
 *
 * The toggle goes through the same machinery the records in `cells.ts` use:
 * the link's stored `style` record — where every link declares this class as
 * its initial `className` — is updated and expanded with `linkAttributes()`,
 * so no SVG attribute path is ever written by hand and the rest of the style
 * (stroke, markers) is preserved.
 *
 * Only `style`/`attrs` are set. The link's ends and vertices stay untouched —
 * they belong to the router service, and writing them back from a record both
 * discards the service's computed anchors and triggers it to re-route.
 */
export function setLinkAwaiting(link: dia.Link, awaiting: boolean): void {
    const style = { ...link.get('style'), className: awaiting ? AWAITING_CLASS : '' };
    link.set(linkAttributes({ style }));
}
