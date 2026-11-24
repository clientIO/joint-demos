/**
 * Browser-side bits of identity: which board the URL opens, and the name and seat
 * this person joined with. All reads tolerate blocked storage and simply fall back.
 */

import { DEPARTMENTS } from './model';

const PROFILE_KEY = 'playbook:profile';
const LAST_NAME_KEY = 'playbook:name';

/** Longest display name; the join field enforces it. */
export const NAME_MAX_LENGTH = 24;

/** The name and department seat someone joined a board with. */
export interface Profile {
    readonly name: string;
    readonly seat: number;
}

/** Board ids we accept from a URL: short, and safe in a room name. */
const BOARD_ID_PATTERN = /^[a-z0-9-]{1,32}$/i;

/** A short random id for a new board. */
function newBoardId(): string {
    return Math.random().toString(36).slice(2, 10);
}

/**
 * The board this page shows, from `?board=`. Without a valid one, a new board id is
 * minted and written to the URL, so the address bar is already the invite link.
 */
export function boardIdFromUrl(): string {
    const url = new URL(window.location.href);
    const existing = url.searchParams.get('board');
    // Anything else (empty, too long, odd characters) gets a fresh board instead.
    if (existing !== null && BOARD_ID_PATTERN.test(existing)) return existing;
    const created = newBoardId();
    url.searchParams.set('board', created);
    window.history.replaceState(null, '', url);
    return created;
}

/** Navigates to a fresh, empty-of-people board with the starter playbook. */
export function openNewBoard(): void {
    const url = new URL(window.location.href);
    url.searchParams.set('board', newBoardId());
    window.location.assign(url);
}

/**
 * The profile this tab joined with. Session storage on purpose: every tab is its own
 * person, so a second tab of the same browser is a second collaborator, and a
 * reload keeps you at the table without asking again.
 */
export function readProfile(): Profile | null {
    try {
        const raw = sessionStorage.getItem(PROFILE_KEY);
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed !== 'object' || parsed === null) return null;
        if (!('name' in parsed) || !('seat' in parsed)) return null;
        const { name, seat } = parsed;
        const isValidSeat = typeof seat === 'number' && Number.isInteger(seat) && seat >= 0 && seat < DEPARTMENTS.length;
        return typeof name === 'string' && isValidSeat ? { name: name.slice(0, NAME_MAX_LENGTH), seat } : null;
    } catch {
        return null;
    }
}

/** Remembers the profile for this tab, and the name for the next board. */
export function saveProfile(profile: Profile): void {
    try {
        sessionStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
        localStorage.setItem(LAST_NAME_KEY, profile.name);
    } catch {
        // Storage is blocked: the join dialog simply asks again after a reload.
    }
}

/** The name used on an earlier board, offered again so joining is one click. */
export function lastUsedName(): string {
    try {
        return (localStorage.getItem(LAST_NAME_KEY) ?? '').slice(0, NAME_MAX_LENGTH);
    } catch {
        return '';
    }
}
