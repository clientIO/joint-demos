/**
 * Per-tab identity. Deliberately `sessionStorage`, not `localStorage`: each
 * browser tab is its own collaborator, so the zero-setup local room becomes
 * multiplayer the moment a second tab opens.
 */

const KEY = 'journey-board:member';

function randomId(): string {
    return `m-${Math.random().toString(36).slice(2, 10)}`;
}

/** Stable id for this tab's collaborator, minted on first use. */
export function myMemberId(): string {
    try {
        const existing = sessionStorage.getItem(KEY);
        if (existing) return existing;
        const minted = randomId();
        sessionStorage.setItem(KEY, minted);
        return minted;
    } catch {
    // Storage can be blocked; a per-load id still works, the member just
    // re-joins after a refresh.
        return randomId();
    }
}

const NAME_KEY = 'journey-board:name';
/** Longest display name; the join field enforces it and so does the read-back. */
export const NAME_MAX_LENGTH = 24;

/** The name this person joined with last time, so no board asks twice. */
export function rememberedName(): string {
    try {
        return (localStorage.getItem(NAME_KEY) ?? '').trim().slice(0, NAME_MAX_LENGTH);
    } catch {
        return '';
    }
}

/** Keeps the name for the next board; a fallback "Guest N" is never kept. */
export function rememberName(name: string): void {
    try {
        localStorage.setItem(NAME_KEY, name);
    } catch {
    // Storage blocked: the next board asks again.
    }
}

/** Board id from the URL (`?board=…`), so links deep-link past the lobby. */
export function boardFromUrl(): string | null {
    try {
        return new URLSearchParams(window.location.search).get('board');
    } catch {
        return null;
    }
}

/** The board's name from the URL (`?name=…`), carried by invite links. */
export function boardNameFromUrl(): string | null {
    try {
        return new URLSearchParams(window.location.search).get('name');
    } catch {
        return null;
    }
}

/** The link that brings a colleague straight onto this board. */
export function inviteLink(boardId: string, name: string): string {
    const url = new URL(window.location.href);
    url.searchParams.set('board', boardId);
    if (name.trim() === '' || name === boardId) url.searchParams.delete('name');
    else url.searchParams.set('name', name);
    return url.toString();
}

/** Reflects the open board (and its name) in the URL without a navigation. */
export function writeBoardToUrl(boardId: string | null, name?: string): void {
    try {
        const url = new URL(window.location.href);
        url.searchParams.delete('name');
        if (boardId === null) url.searchParams.delete('board');
        else {
            url.searchParams.set('board', boardId);
            if (name !== undefined && name !== boardId) url.searchParams.set('name', name);
        }
        window.history.replaceState(null, '', url);
    } catch {
    // The lobby still works; the URL just won't deep-link.
    }
}
