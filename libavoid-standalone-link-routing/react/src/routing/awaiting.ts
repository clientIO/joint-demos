/**
 * Added while the router still owes the link a route; styled in `index.css`.
 *
 * The link records in `cells.ts` declare it as their initial `style.className`
 * — every link starts out unrouted — and `use-avoid-router.ts` toggles it at
 * runtime through the GraphApi's `setCell`, going through the same
 * record-to-attributes mapping (`style.className` composes with the link's own
 * `jj-link-line` class rather than replacing it).
 *
 * The pending look lives on the link record/model rather than on a mounted
 * view, which is what makes it work under virtual rendering: a link scrolled
 * off-screen has no view to hold a highlighter, and would come back without
 * one. Its attributes come with it whenever it is mounted again.
 */
export const AWAITING_CLASS = 'awaiting-update';
