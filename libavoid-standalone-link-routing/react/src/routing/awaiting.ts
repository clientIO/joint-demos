import { linkAttributes } from '@joint/react-plus';
import type { dia } from '@joint/plus';
import { DARK_COLOR } from '@/theme';

/** Added while the router still owes the link a route; styled in `index.css`. */
export const AWAITING_CLASS = 'awaiting-update';

/**
 * The one style every link in this demo draws with; `cells.ts` seeds each link
 * record with it. No initial awaiting class needed: the paper stays frozen
 * until the router service is running, and `start()` fires `link:routing` for
 * every link — applying the awaiting look — before the first paint.
 */
export const LINK_STYLE = {
    color: DARK_COLOR,
    width: 1.5,
    targetMarker: 'arrow',
} as const;

/*
 * The two looks a link toggles between, expanded once through
 * `linkAttributes()` — the same machinery that expands the records in
 * `cells.ts` — and applied as-is. Only `style`/`attrs` are produced. The
 * link's ends and vertices stay untouched: they belong to the router service,
 * and writing them back would both discard its computed anchors and trigger
 * it to re-route.
 */
const AWAITING_ATTRIBUTES = linkAttributes({ style: { ...LINK_STYLE, className: AWAITING_CLASS } });
const STABLE_ATTRIBUTES = linkAttributes({ style: LINK_STYLE });

/**
 * Marks a link as waiting for its route, or clears the mark.
 *
 * The pending look lives on the model rather than on a mounted view, which is
 * what makes it work under virtual rendering: a link scrolled off-screen has no
 * view to hold a highlighter, and would come back without one. Its attributes
 * come with it whenever it is mounted again.
 */
export function setLinkAwaiting(link: dia.Link, awaiting: boolean): void {
    link.set(awaiting ? AWAITING_ATTRIBUTES : STABLE_ATTRIBUTES);
}
