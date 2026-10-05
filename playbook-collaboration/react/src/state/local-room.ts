import type { CardNode, FeedRow, Flow, Member, Presence } from '@/model/types';
import type { AppState } from './store';
import { useStore } from './store';

/**
 * The zero-setup room: syncs the same store slices Liveblocks would, but
 * across this browser's tabs over a BroadcastChannel. Open the board in a
 * second tab and it is already multiplayer — no key, no account, no server.
 *
 * Protocol (all messages carry the sender's member id):
 * - `hello`   — a tab joined; peers answer with `state` + `presence`.
 * - `state`   — full document snapshot, used to hydrate late joiners.
 * - `entity`  — one node/flow/member changed or was removed.
 * - `doc`     — a whole small slice changed (`feed`).
 * - `presence`— the sender's live presence (also the heartbeat).
 * - `bye`     — the sender's tab closed.
 *
 * Conflict model is last-write-wins per entity — honest enough for a demo
 * room; the Liveblocks transport is the production-grade path.
 */

interface EntityMessage {
  readonly type: 'entity';
  readonly kind: 'node' | 'flow' | 'member';
  readonly id: string;
  readonly value: CardNode | Flow | Member | null;
}

interface DocMessage {
  readonly type: 'doc';
  readonly feed?: readonly FeedRow[];
  readonly title?: string;
}

interface StateMessage {
  readonly type: 'state';
  readonly nodes: Record<string, CardNode>;
  readonly flows: Record<string, Flow>;
  readonly members: Record<string, Member>;
  readonly feed: readonly FeedRow[];
  readonly title: string;
}

interface PresenceMessage {
  readonly type: 'presence';
  readonly presence: Presence;
}

interface SignalMessage {
  readonly type: 'hello' | 'bye';
}

type OutMessage = EntityMessage | DocMessage | StateMessage | PresenceMessage | SignalMessage;

type RoomMessage = OutMessage & { readonly from: string };

const PRESENCE_THROTTLE_MS = 40;
const HEARTBEAT_MS = 2500;
const PEER_TIMEOUT_MS = 7000;

/** Union of two feed lists by id, in time order, capped like the store. */
function mergeFeed(a: readonly FeedRow[], b: readonly FeedRow[]): FeedRow[] {
    const byId = new Map<string, FeedRow>();
    for (const row of [...a, ...b]) byId.set(row.id, row);
    return [...byId.values()].sort((x, y) => x.at - y.at).slice(-30);
}

/** Reference-diffs a record slice and emits one message per changed entity. */
function diffEntities<Value extends CardNode | Flow | Member>(
    kind: EntityMessage['kind'],
    previous: Record<string, Value>,
    current: Record<string, Value>,
    post: (message: EntityMessage) => void
): void {
    for (const [id, value] of Object.entries(current)) {
        if (previous[id] !== value) post({ type: 'entity', kind, id, value });
    }
    for (const id of Object.keys(previous)) {
        if (!(id in current)) post({ type: 'entity', kind, id, value: null });
    }
}

function applyEntity(
    slice: Record<string, CardNode | Flow | Member>,
    message: EntityMessage
): Record<string, CardNode | Flow | Member> {
    const next = { ...slice };
    if (message.value === null) delete next[message.id];
    else next[message.id] = message.value;
    return next;
}

/** Where a local board's document survives refreshes and quiet hours. */
export function localDocKey(board: string): string {
    return `journey-board:doc:${board}`;
}

interface StoredDoc {
  readonly nodes: Record<string, CardNode>;
  readonly flows: Record<string, Flow>;
  readonly members: Record<string, Member>;
  readonly feed: readonly FeedRow[];
  readonly title?: string;
}

const PERSIST_THROTTLE_MS = 600;

/**
 * Connects the store to the local room for one board. Returns a cleanup
 * function. No-op transport when BroadcastChannel is unavailable.
 *
 * The document is also persisted to `localStorage`, so a local board
 * survives refreshes and re-opens from the lobby; pruning a dead board
 * deletes its stored document for good.
 */
export function connectLocalRoom(board: string): () => void {
    if (typeof BroadcastChannel === 'undefined') return () => {};
    const channel = new BroadcastChannel(`journey-board:${board}`);
    const me = useStore.getState().myId;
    let applyingRemote = false;
    let lastPresencePost = 0;
    let presenceTimer: ReturnType<typeof setTimeout> | undefined;
    let persistTimer: ReturnType<typeof setTimeout> | undefined;

    // Hydrate from disk first; live peers then top this up via `state`.
    try {
        const raw = localStorage.getItem(localDocKey(board));
        if (raw) {
            const stored = JSON.parse(raw) as StoredDoc;
            // Documents persisted by older builds carry a different card shape;
            // drop anything without a title rather than crash the renderer.
            const nodes = Object.fromEntries(
                Object.entries(stored.nodes ?? {}).filter(
                    ([, node]) => typeof (node as CardNode).title === 'string'
                )
            );
            applyingRemote = true;
            useStore.getState().applyRemote({
                nodes,
                flows: stored.flows ?? {},
                members: stored.members ?? {},
                feed: [...(stored.feed ?? [])],
                ...(stored.title ? { title: stored.title } : {}),
            });
            applyingRemote = false;
        }
    } catch {
    // A corrupt or blocked store just means an empty board.
    }

    const persist = () => {
        persistTimer = undefined;
        const state = useStore.getState();
        // Never write another board's (or the lobby's cleared) state over this
        // board's document — `setBoard` empties the slices synchronously while
        // this adapter is still attached.
        if (state.board !== board) return;
        try {
            localStorage.setItem(
                localDocKey(board),
                JSON.stringify({
                    nodes: state.nodes,
                    flows: state.flows,
                    members: state.members,
                    feed: state.feed,
                    title: state.title,
                } satisfies StoredDoc)
            );
        } catch {
            // Persistence is best-effort.
        }
    };
    const schedulePersist = () => {
        persistTimer ??= setTimeout(persist, PERSIST_THROTTLE_MS);
    };

    const post = (message: OutMessage) => {
        channel.postMessage({ ...message, from: me });
    };

    const postPresence = () => {
        lastPresencePost = Date.now();
        post({ type: 'presence', presence: useStore.getState().me });
    };

    const onMessage = (event: MessageEvent<RoomMessage>) => {
        const message = event.data;
        if (!message || message.from === me) return;
        const state = useStore.getState();
        applyingRemote = true;
        try {
            switch (message.type) {
                case 'hello': {
                    // Hydrate the newcomer and let them see us immediately.
                    post({
                        type: 'state',
                        nodes: state.nodes,
                        flows: state.flows,
                        members: state.members,
                        feed: state.feed,
                        title: state.title,
                    });
                    postPresence();
                    break;
                }
                case 'state': {
                    // Remote-wins: a live peer is always fresher than this tab's disk
                    // hydrate (which lags by the persist throttle and would otherwise
                    // resurrect entities the peer just deleted or renamed).
                    state.applyRemote({
                        nodes: { ...state.nodes, ...message.nodes },
                        flows: { ...state.flows, ...message.flows },
                        members: { ...state.members, ...message.members },
                        feed: mergeFeed(state.feed, message.feed),
                        ...(message.title ? { title: message.title } : {}),
                    });
                    break;
                }
                case 'entity': {
                    if (message.kind === 'node') {
                        state.applyRemote({
                            nodes: applyEntity(state.nodes, message) as Record<string, CardNode>,
                        });
                    } else if (message.kind === 'flow') {
                        state.applyRemote({
                            flows: applyEntity(state.flows, message) as Record<string, Flow>,
                        });
                    } else {
                        state.applyRemote({
                            members: applyEntity(state.members, message) as Record<string, Member>,
                        });
                    }
                    break;
                }
                case 'doc': {
                    if (message.feed) {
                        state.applyRemote({ feed: mergeFeed(state.feed, message.feed) });
                    }
                    if (message.title !== undefined) state.applyRemote({ title: message.title });
                    break;
                }
                case 'presence': {
                    state.applyRemote({
                        localOthers: {
                            ...state.localOthers,
                            [message.from]: { presence: message.presence, lastSeen: Date.now() },
                        },
                    });
                    break;
                }
                case 'bye': {
                    const localOthers = { ...state.localOthers };
                    delete localOthers[message.from];
                    state.applyRemote({ localOthers });
                    break;
                }
            }
        } finally {
            applyingRemote = false;
        }
    };
    channel.addEventListener('message', onMessage);

    // Outbound: reference-diff the synced slices on every store commit.
    let previous: Pick<AppState, 'nodes' | 'flows' | 'members' | 'feed' | 'title' | 'me'> =
    useStore.getState();
    const unsubscribe = useStore.subscribe((state) => {
    // `setBoard` wipes the doc slices synchronously before React tears this
    // adapter down; without this guard the wipe would broadcast entity
    // deletions to every peer of the board being LEFT and then persist the
    // emptied document over theirs.
        if (state.board !== board) {
            previous = state;
            return;
        }
        const docChanged =
      state.nodes !== previous.nodes ||
      state.flows !== previous.flows ||
      state.members !== previous.members ||
      state.feed !== previous.feed ||
      state.title !== previous.title;
        if (docChanged) schedulePersist();
        if (applyingRemote) {
            previous = state;
            return;
        }
        if (state.nodes !== previous.nodes) diffEntities('node', previous.nodes, state.nodes, post);
        if (state.flows !== previous.flows) diffEntities('flow', previous.flows, state.flows, post);
        if (state.members !== previous.members) {
            diffEntities('member', previous.members, state.members, post);
        }
        if (state.feed !== previous.feed) post({ type: 'doc', feed: state.feed });
        if (state.title !== previous.title) post({ type: 'doc', title: state.title });
        if (state.me !== previous.me) {
            // The cursor stream is hot; keep it under one post per frame.
            const since = Date.now() - lastPresencePost;
            if (since >= PRESENCE_THROTTLE_MS) postPresence();
            else if (presenceTimer === undefined) {
                presenceTimer = setTimeout(() => {
                    presenceTimer = undefined;
                    postPresence();
                }, PRESENCE_THROTTLE_MS - since);
            }
        }
        previous = state;
    });

    // Heartbeat + stale-peer sweep.
    const heartbeat = setInterval(postPresence, HEARTBEAT_MS);
    const sweep = setInterval(() => {
        const state = useStore.getState();
        const now = Date.now();
        const alive = Object.entries(state.localOthers).filter(
            ([, peer]) => now - peer.lastSeen < PEER_TIMEOUT_MS
        );
        if (alive.length === Object.keys(state.localOthers).length) return;
        state.applyRemote({ localOthers: Object.fromEntries(alive) });
    }, HEARTBEAT_MS);

    const onUnload = () => post({ type: 'bye' });
    window.addEventListener('beforeunload', onUnload);

    post({ type: 'hello' });
    postPresence();

    return () => {
        post({ type: 'bye' });
        window.removeEventListener('beforeunload', onUnload);
        clearInterval(heartbeat);
        clearInterval(sweep);
        if (presenceTimer !== undefined) clearTimeout(presenceTimer);
        if (persistTimer !== undefined) clearTimeout(persistTimer);
        persist();
        unsubscribe();
        channel.removeEventListener('message', onMessage);
        channel.close();
    };
}
