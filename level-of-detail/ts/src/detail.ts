/**
 * The three ways an element can be drawn, and the zoom levels they belong to.
 *
 * The same policy as the React version of this demo, in one file so that the
 * thresholds and the markup that honours them cannot drift apart.
 */
export type DetailLevel = 'high' | 'medium' | 'low';

/**
 * Where one level gives way to the next, in paper scale.
 *
 * Chosen by what is still legible rather than by round numbers: below 60% the
 * 12px meta line of the card is a grey smudge, and below 25% the element's own
 * name is three pixels tall - at that point a label is noise, and the only
 * thing an element can usefully say is where it is and what colour it is.
 */
export const DETAIL_THRESHOLD = {
    high: 0.6,
    medium: 0.25
} as const;

/** The level a given paper scale calls for. */
export function getDetailLevel(scale: number): DetailLevel {
    if (scale >= DETAIL_THRESHOLD.high) return 'high';
    if (scale >= DETAIL_THRESHOLD.medium) return 'medium';
    return 'low';
}

/** What the picker is set to: follow the zoom, or pin one level. */
export type DetailMode = 'auto' | DetailLevel;

export const DETAIL_LABEL: Record<DetailLevel, string> = {
    high: 'Card',
    medium: 'Chip',
    low: 'Block'
};

export const DETAIL_MODE_LABEL: Record<DetailMode, string> = {
    auto: `Auto - card ≥ ${DETAIL_THRESHOLD.high * 100}%, chip ≥ ${DETAIL_THRESHOLD.medium * 100}%`,
    high: 'Pin to card',
    medium: 'Pin to chip',
    low: 'Pin to block'
};

/*
 * The picker's current mode.
 *
 * Module state, read by every `ServiceView` when it renders. It is the plain
 * equivalent of the React version's context: the views need one shared value
 * that is not on any model, and a module binding is the smallest thing that
 * does that. `app.ts` is the only writer.
 */
let mode: DetailMode = 'auto';

export function getDetailMode(): DetailMode {
    return mode;
}

export function setDetailMode(next: DetailMode): void {
    mode = next;
}

/**
 * The level to draw at a given paper scale, honouring a pinned mode.
 *
 * This is what the views call - never `getDetailLevel()` directly - so that
 * pinning a level in the toolbar reaches all of them.
 */
export function getActiveLevel(scale: number): DetailLevel {
    return mode === 'auto' ? getDetailLevel(scale) : mode;
}
