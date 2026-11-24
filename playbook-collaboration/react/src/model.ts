/**
 * The playbook's domain: card kinds, department seats, card sizes and the plain
 * JSON shapes that live in the shared Liveblocks storage.
 */

/** The kinds of card a playbook is made of. */
export const KINDS = ['trigger', 'step', 'approval', 'note'] as const;

export type Kind = (typeof KINDS)[number];

/** Display names of the kinds, shared by cards, the palette and the panel. */
export const KIND_LABELS: Record<Kind, string> = {
    trigger: 'Trigger',
    step: 'Step',
    approval: 'Approval',
    note: 'Note',
};

/** The glyph each kind shows in its chip. */
export const KIND_GLYPHS: Record<Kind, string> = {
    trigger: '⚡',
    step: '⚙️',
    approval: '✓',
    note: '✎',
};

/**
 * One card of the playbook, as stored in the room. A `trigger` starts the process,
 * `step`s do the work, an `approval` gates it and a `note` annotates it.
 * `seat` is the owning department: it colors the card and decides who may remove it.
 */
export type Card = {
    kind: Kind;
    title: string;
    detail: string;
    seat: number;
    x: number;
    y: number;
    width: number;
    height: number;
};

/** A directed connection from one card's OUT dot to another card's IN dot. */
export type Flow = {
    source: string;
    target: string;
};

/** One row of the activity feed. */
export type FeedRow = {
    id: string;
    at: number;
    seat: number;
    text: string;
};

/** Narrows any string (a form value, for one) to a card kind. */
export function isKind(value: string): value is Kind {
    return KINDS.some((kind) => kind === value);
}

/**
 * The departments around the table, in seat order. A person's seat is an index
 * into this list; the matching color is the CSS variable `--seat-<index>`.
 */
export const DEPARTMENTS = [
    'Marketing',
    'Sales',
    'Product',
    'Support',
    'Success',
    'Finance',
    'Operations',
    'Legal',
] as const;

/**
 * Any value as a valid seat index. Storage and presence come from other browsers,
 * so a bad seat (negative, fractional, not a number) must never crash a render.
 */
export function normalizeSeat(seat: unknown): number {
    if (typeof seat !== 'number' || !Number.isFinite(seat)) return 0;
    const count = DEPARTMENTS.length;
    return ((Math.trunc(seat) % count) + count) % count;
}

/** The department name of a seat. */
export function departmentOf(seat: number): string {
    return DEPARTMENTS[normalizeSeat(seat)];
}

/** The CSS color of a seat; CSS resolves it, so a theme switch needs no re-render. */
export function seatColor(seat: number): string {
    return `var(--seat-${normalizeSeat(seat)})`;
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Whether a stored card has the shape the app draws. The public key lets any
 * browser write to a room it knows, so cards that fail this check are skipped.
 */
export function isValidCard(card: unknown): card is Card {
    if (typeof card !== 'object' || card === null) return false;
    if (!('kind' in card) || typeof card.kind !== 'string' || !isKind(card.kind)) return false;
    if (!('title' in card) || typeof card.title !== 'string') return false;
    if (!('detail' in card) || typeof card.detail !== 'string') return false;
    if (!('seat' in card) || !isFiniteNumber(card.seat)) return false;
    return 'x' in card && isFiniteNumber(card.x) && 'y' in card && isFiniteNumber(card.y)
        && 'width' in card && isFiniteNumber(card.width) && card.width > 0
        && 'height' in card && isFiniteNumber(card.height) && card.height > 0;
}

/** Whether a stored flow has two string ends. */
export function isValidFlow(flow: unknown): flow is Flow {
    return typeof flow === 'object' && flow !== null
        && 'source' in flow && typeof flow.source === 'string'
        && 'target' in flow && typeof flow.target === 'string';
}

/** Whether a feed row can be shown (its time must make a valid date). */
export function isValidFeedRow(row: unknown): row is FeedRow {
    return typeof row === 'object' && row !== null
        && 'id' in row && typeof row.id === 'string'
        && 'text' in row && typeof row.text === 'string'
        && 'seat' in row && isFiniteNumber(row.seat)
        && 'at' in row && isFiniteNumber(row.at) && Math.abs(row.at) < 8.64e15;
}

/** Keeps only the valid entries of a stored record (cards or flows). */
export function pickValid<Value>(
    record: Readonly<Record<string, Value>>,
    isValid: (value: unknown) => value is Value
): Record<string, Value> {
    const valid: Record<string, Value> = {};
    for (const [id, value] of Object.entries(record)) {
        if (isValid(value)) valid[id] = value;
    }
    return valid;
}

export const CARD_WIDTH = 252;
export const CARD_HEIGHT = 96;

/** Resize limits: never narrower than the default card, so its title keeps fitting. */
export const CARD_MIN_WIDTH = CARD_WIDTH;
export const CARD_MIN_HEIGHT = CARD_HEIGHT;
export const CARD_MAX_WIDTH = 560;
export const CARD_MAX_HEIGHT = 320;

/** Default titles for new cards, so a fresh card never reads "Untitled". */
const TITLE_POOLS: Record<Kind, readonly string[]> = {
    trigger: ['New request comes in', 'Record created', 'Form submitted', 'Deal stage changes'],
    step: ['Enrich the record', 'Assign an owner', 'Draft the reply', 'Update the CRM', 'Schedule the call'],
    approval: ['Manager sign-off', 'Legal review', 'Budget approval', 'Quality gate'],
    note: ['Working notes', 'Edge cases', 'Open questions'],
};

/** A default title for the n-th card of a kind. */
export function defaultCardTitle(kind: Kind, ordinal: number): string {
    const pool = TITLE_POOLS[kind];
    const round = Math.floor(ordinal / pool.length);
    const base = pool[ordinal % pool.length];
    return round === 0 ? base : `${base} ${round + 1}`;
}
