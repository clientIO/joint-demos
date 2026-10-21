import { useSyncExternalStore } from 'react';

/**
 * The boards lobby: create a board or join one from the list, with a hard
 * lifetime rule — a board nobody has touched for {@link BOARD_TTL_MS} is
 * dead and gets removed from the registry.
 *
 * The registry lives in `localStorage`, which both transports can rely on:
 * the local (BroadcastChannel) rooms only ever span this browser anyway, and
 * under Liveblocks the registry still lists every board this browser opened
 * (a production deployment would move it into a Liveblocks directory room or
 * the REST API — deliberately out of scope for a demo without a secret key).
 *
 * Cross-tab reactivity comes for free: `storage` events fire in every other
 * tab on registry writes.
 */

export interface BoardMeta {
  readonly id: string;
  readonly name: string;
  readonly createdAt: number;
  readonly lastActiveAt: number;
}

const REGISTRY_KEY = 'journey-board:boards';

/** A board untouched this long is dead and disappears from the lobby. */
export const BOARD_TTL_MS = 30 * 60 * 1000;

function readRegistry(): Record<string, BoardMeta> {
    try {
        const raw = localStorage.getItem(REGISTRY_KEY);
        if (!raw) return {};
        return JSON.parse(raw) as Record<string, BoardMeta>;
    } catch {
        return {};
    }
}

function persistRegistry(registry: Record<string, BoardMeta>): void {
    try {
        localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
    } catch {
    // Lobby persistence is best-effort.
    }
}

function writeRegistry(registry: Record<string, BoardMeta>): void {
    persistRegistry(registry);
    notify();
}

/** Drops dead boards — their stored documents included — and returns the
 * live ones, most recently active first. */
function pruneAndList(): BoardMeta[] {
    const registry = readRegistry();
    const now = Date.now();
    let changed = false;
    for (const [id, board] of Object.entries(registry)) {
        if (now - board.lastActiveAt > BOARD_TTL_MS) {
            delete registry[id];
            changed = true;
            try {
                localStorage.removeItem(`journey-board:doc:${id}`);
            } catch {
                // The registry entry is gone either way.
            }
        }
    }
    // Persist only: the callers are the snapshot readers themselves, and a
    // notify from here would re-enter `refresh` (and, at module init, hit the
    // snapshot bindings before they exist).
    if (changed) persistRegistry(registry);
    return Object.values(registry).sort((a, b) => b.lastActiveAt - a.lastActiveAt);
}

export function createBoard(name: string): BoardMeta {
    const board: BoardMeta = {
        id: `b-${Math.random().toString(36).slice(2, 10)}`,
        name: name.trim() === '' ? 'Untitled journey' : name.trim(),
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
    };
    const registry = readRegistry();
    registry[board.id] = board;
    writeRegistry(registry);
    return board;
}

/**
 * Looks a board up (deep links); registers unknown ids so they stay listed.
 * An invite link carries the board's name, so the newcomer's lobby shows it
 * before the room has even answered; a bare id is listed as itself until
 * the shared document names it (see {@link renameBoard}).
 */
export function ensureBoard(id: string, name?: string): BoardMeta {
    const registry = readRegistry();
    const existing = registry[id];
    if (existing && (name === undefined || existing.name !== existing.id)) return existing;
    const board: BoardMeta = {
        ...(existing ?? { id, createdAt: Date.now(), lastActiveAt: Date.now() }),
        name: name ?? id,
    };
    registry[id] = board;
    writeRegistry(registry);
    return board;
}

/** The room told us the board's name: list it by that from now on. */
export function renameBoard(id: string, name: string): void {
    const registry = readRegistry();
    const board = registry[id];
    if (!board || board.name === name || name.trim() === '') return;
    registry[id] = { ...board, name };
    writeRegistry(registry);
}

/** The lobby's name for a board, its id when it has none. */
export function boardName(id: string): string {
    return readRegistry()[id]?.name ?? id;
}

/** Heartbeat: marks the board alive. Called while a session is open in it.
 * Upserts: a frozen tab can thaw AFTER the prune removed its board — the
 * beat then re-registers it instead of leaving an unlisted orphan. */
export function touchBoard(id: string): void {
    const registry = readRegistry();
    const board = registry[id] ?? {
        id,
        name: id,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
    };
    registry[id] = { ...board, lastActiveAt: Date.now() };
    writeRegistry(registry);
}

// ── reactive listing ──────────────────────────────────────────────────────

const listeners = new Set<() => void>();
let snapshot: BoardMeta[] = pruneAndList();
let snapshotKey = JSON.stringify(snapshot);

function refresh(): void {
    const next = pruneAndList();
    const key = JSON.stringify(next);
    if (key === snapshotKey) return;
    snapshot = next;
    snapshotKey = key;
    for (const listener of listeners) listener();
}

function notify(): void {
    refresh();
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    const onStorage = (event: StorageEvent) => {
        if (event.key === REGISTRY_KEY) refresh();
    };
    window.addEventListener('storage', onStorage);
    // Periodic re-prune so dead boards fall off the open lobby too.
    const timer = setInterval(refresh, 30_000);
    return () => {
        listeners.delete(listener);
        window.removeEventListener('storage', onStorage);
        clearInterval(timer);
    };
}

/** Live board list for the lobby, dead boards pruned. */
export function useBoards(): readonly BoardMeta[] {
    return useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
}
