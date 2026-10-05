import type { Kind } from './types';

/**
 * The identity system: eight department "seats" — also the board's hard
 * participant cap. A collaborator's seat drives the accent of every card
 * they own, their cursor, their frame and their row in the team panel.
 * Chrome never borrows these hues.
 *
 * Each seat carries a color per theme, exposed as CSS variables
 * (`--seat-0` … `--seat-7`) in `index.css`. Code refers to seats by index
 * and lets CSS resolve the hue, so theme switches never touch the store.
 */

export const SEAT_COUNT = 8;

/** The departments around the table, in seat order. */
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

/** CSS variable reference for a seat's color. */
export function seatColor(seat: number): string {
    return `var(--seat-${((seat % SEAT_COUNT) + SEAT_COUNT) % SEAT_COUNT})`;
}

/** Default titles for freshly added cards, per kind. */
export const KIND_NAME_POOLS: Record<Kind, readonly string[]> = {
    trigger: ['New request comes in', 'Record created', 'Form submitted', 'Deal stage changes'],
    step: [
        'Enrich the record',
        'Assign an owner',
        'Draft the reply',
        'Update the CRM',
        'Schedule the call',
        'Prepare the handover',
        'Send the summary',
    ],
    approval: ['Manager sign-off', 'Legal review', 'Budget approval', 'Quality gate'],
    note: ['Working notes', 'Edge cases', 'Open questions'],
};

/** A sensible default title for the n-th card of a kind added to the board. */
export function defaultCardTitle(kind: Kind, ordinal: number): string {
    const pool = KIND_NAME_POOLS[kind];
    const base = pool[ordinal % pool.length];
    const round = Math.floor(ordinal / pool.length);
    return round === 0 ? base : `${base} ${round + 1}`;
}
