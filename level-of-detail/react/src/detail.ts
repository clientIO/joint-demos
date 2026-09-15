/**
 * The three ways a node can be drawn, and the zoom levels they belong to.
 *
 * This is the whole level-of-detail policy, kept in one file so that the
 * thresholds and the components that honour them cannot drift apart.
 */
export type DetailLevel = 'high' | 'medium' | 'low';

/**
 * Where one level gives way to the next, in paper scale.
 *
 * Chosen by what is still legible rather than by round numbers: below 60% the
 * 12px meta line of the card is a grey smudge, and below 25% the node's own
 * title is three pixels tall — at that point a label is noise, and the only
 * thing a node can usefully say is where it is and what colour it is.
 */
export const DETAIL_THRESHOLD = {
    high: 0.6,
    medium: 0.25,
} as const;

/**
 * The selector every node runs against the scroller viewport.
 *
 * It returns one of three strings, and that is what makes this cheap: the
 * viewport store notifies on every wheel tick and every pan frame, but
 * `usePaperScrollerViewport` compares the selected value with `Object.is` and
 * bails out when it is unchanged. So a node re-renders when it *crosses* a
 * threshold, not while it is zooming between them. Selecting the raw `zoom`
 * number instead would re-render every mounted node on every frame of a pinch.
 *
 * Declared at module level, so every node shares one stable function identity.
 */
export function selectDetailLevel({ zoom }: { readonly zoom: number }): DetailLevel {
    if (zoom >= DETAIL_THRESHOLD.high) return 'high';
    if (zoom >= DETAIL_THRESHOLD.medium) return 'medium';
    return 'low';
}

/** What the toolbar's picker is set to: follow the zoom, or pin one level. */
export type DetailMode = 'auto' | DetailLevel;

export const DETAIL_LABEL: Record<DetailLevel, string> = {
    high: 'Card',
    medium: 'Chip',
    low: 'Block',
};
