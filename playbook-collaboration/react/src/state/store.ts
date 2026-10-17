import { createClient } from '@liveblocks/client';
import { liveblocks } from '@liveblocks/zustand';
import type { WithLiveblocks } from '@liveblocks/zustand';
import { create } from 'zustand';
import { defaultCardTitle, DEPARTMENTS, SEAT_COUNT } from '@/model/palette';
import type {
    CardDraft,
    CardNode,
    FeedRow,
    Flow,
    FlowDraft,
    FlowId,
    Kind,
    Member,
    NodeId,
    PortSide,
    Presence,
    SeatId,
} from '@/model/types';
import { KIND_LABELS } from '@/model/types';
import { myMemberId } from './identity';
import { boardName } from './lobby';

/**
 * One zustand store for everything; the Liveblocks middleware mirrors the
 * mapped slices into the room.
 *
 * - `nodes`, `flows`, `members`, `feed`, `title` → room storage (the shared
 *   playbook document).
 * - `me` → presence (the live "who is doing what" stream).
 *
 * Without a `VITE_LIVEBLOCKS_PUBLIC_KEY` the same store syncs across this
 * browser's tabs through a BroadcastChannel adapter (`local-room.ts`) — the
 * middleware stays attached but its room is simply never entered.
 */

export const LIVEBLOCKS_KEY: string | undefined = import.meta.env.VITE_LIVEBLOCKS_PUBLIC_KEY as
  | string
  | undefined;

/** Which transport carries a board: Liveblocks (key set) or local tabs. */
export const SYNC_MODE: 'liveblocks' | 'local' = LIVEBLOCKS_KEY ? 'liveblocks' : 'local';

const client = createClient({
    // The placeholder is never used: without a real key no room is entered.
    publicApiKey: LIVEBLOCKS_KEY ?? 'pk_dev_local-room-placeholder',
});

const IDLE_PRESENCE: Presence = {
    seat: -1,
    person: '',
    department: '',
    cursor: null,
    doing: 'idle',
    moving: null,
    resizing: null,
    focus: null,
    drawing: null,
    placing: null,
};

/** Rows kept on the activity feed. */
const FEED_LIMIT = 30;

/** Card geometry lives with the store so placement matches rendering. */
export const CARD_WIDTH = 252;
export const CARD_HEIGHT = 96;

/** Halo-resize bounds: content stays legible, cards stay card-sized. A card
 * never goes narrower than its default width, so a title that fits on the
 * default card keeps fitting; longer ones are cut with an ellipsis. */
export const CARD_MIN_WIDTH = CARD_WIDTH;
export const CARD_MIN_HEIGHT = 96;
export const CARD_MAX_WIDTH = 560;
export const CARD_MAX_HEIGHT = 320;

/** A card size held inside the bounds above, in whole pixels. */
export function clampCardSize(w: number, h: number): { w: number; h: number } {
    return {
        w: Math.round(Math.min(Math.max(w, CARD_MIN_WIDTH), CARD_MAX_WIDTH)),
        h: Math.round(Math.min(Math.max(h, CARD_MIN_HEIGHT), CARD_MAX_HEIGHT)),
    };
}

/** Vertical gap when stacking a quick-added card below the board. */
const STACK_GAP = 36;

export interface AppState {
  // ── shared document (storage-mapped) ──────────────────────────────────
  nodes: Record<NodeId, CardNode>;
  flows: Record<FlowId, Flow>;
  members: Record<SeatId, Member>;
  feed: FeedRow[];
  /** The board's name, so everyone sees it and not just whoever created it. */
  title: string;

  // ── my live state (presence-mapped) ───────────────────────────────────
  me: Presence;

  // ── local-only ────────────────────────────────────────────────────────
  myId: SeatId;
  joined: boolean;
  /** The open board, `null` while in the lobby. */
  board: string | null;
  /** First endpoint of an in-progress connect gesture. */
  pendingSource: NodeId | null;
  /** Card the inspector shows. */
  selected: NodeId | null;
  /** Flow THIS tab has selected on the board (not synced). */
  selectedFlow: FlowId | null;
  /** Card THIS tab is renaming in place (not synced). */
  editing: NodeId | null;
  /** Peers in the BroadcastChannel room (unused under Liveblocks). */
  localOthers: Record<SeatId, { presence: Presence; lastSeen: number }>;

  // ── actions ───────────────────────────────────────────────────────────
  setBoard: (board: string | null) => void;
  setTitle: (title: string) => void;
  /** Claims a seat; `false` when all {@link SEAT_COUNT} seats are taken. */
  join: (person: string) => boolean;
  addCard: (kind: Kind, x: number, y: number) => void;
  /** Adds a card below the board's lowest card. */
  quickAdd: (kind: Kind) => void;
  connectOrSelect: (nodeId: NodeId) => void;
  /** Opens a card in the inspector without arming a connection. */
  selectCard: (nodeId: NodeId) => void;
  /** Selects a flow on the board; the card selection and any connect gesture end. */
  selectFlow: (flowId: FlowId) => void;
  clearGesture: () => void;
  moveNode: (nodeId: NodeId, x: number, y: number) => void;
  /** Ends a drag: rounds the position and rests the presence. */
  settleNode: (nodeId: NodeId) => void;
  /** Applies a resize, clamped to the card bounds. A handle on the top or
   * left edge moves the card as it grows, so the position travels too. */
  resizeNode: (nodeId: NodeId, x: number, y: number, w: number, h: number) => void;
  /** The card I am resizing right now, `null` once the handle is released. */
  setResizing: (resizing: NodeId | null) => void;
  /** The card my hands are on in the inspector, `null` once its fields blur;
   * colleagues see my frame on it and "editing a card" by my cursor. */
  setEditingHands: (nodeId: NodeId | null) => void;
  /**
   * Adds a flow between two cards; duplicates and self-loops no-op. The port
   * sides are recorded when the flow was drawn from the connect dots, so the
   * link attaches exactly where it was aimed.
   */
  addFlow: (from: NodeId, to: NodeId, fromPort?: PortSide, toPort?: PortSide) => void;
  renameCard: (nodeId: NodeId, title: string) => void;
  beginRename: (nodeId: NodeId) => void;
  endRename: () => void;
  setSubtitle: (nodeId: NodeId, subtitle: string) => void;
  setKind: (nodeId: NodeId, kind: Kind) => void;
  /** Re-seats me when a concurrent join claimed the same seat (LWW race). */
  resolveSeatClash: (remote: Member) => void;
  removeCard: (nodeId: NodeId) => void;
  removeFlow: (flowId: FlowId) => void;
  setCursor: (cursor: Presence['cursor']) => void;
  setDoing: (doing: Presence['doing']) => void;
  /** The flow I am dragging out of a port, `null` once it lands or is dropped. */
  setDrawing: (drawing: FlowDraft | null) => void;
  /** The card I am dragging in from the rail, `null` once it lands or is dropped. */
  setPlacing: (placing: CardDraft | null) => void;
  postFeed: (seat: number, text: string) => void;
  /** Applied by the local-room adapter for remote entity patches. */
  applyRemote: (patch: Partial<AppState>) => void;
}

let feedCounter = 0;

function feedRowOf(seat: number, text: string): FeedRow {
    feedCounter += 1;
    // Time entropy: the counter resets on reload while old rows survive in the
    // persisted document — a bare counter would collide with them.
    return {
        id: `${myMemberId()}-${Date.now().toString(36)}-${feedCounter}`,
        at: Date.now(),
        seat,
        text,
    };
}

function appendFeed(rows: readonly FeedRow[], row: FeedRow): FeedRow[] {
    return [...rows, row].slice(-FEED_LIMIT);
}

/** Lowest seat index not taken by an existing member. */
function freeSeat(members: Record<SeatId, Member>): number | null {
    const taken = new Set(Object.values(members).map((member) => member.seat));
    for (let seat = 0; seat < SEAT_COUNT; seat += 1) {
        if (!taken.has(seat)) return seat;
    }
    return null;
}

function departmentOf(seat: number): string {
    return DEPARTMENTS[((seat % SEAT_COUNT) + SEAT_COUNT) % SEAT_COUNT];
}

/** Presence with `focus` mirroring the local inspector selection. */
function withFocus(me: Presence, focus: NodeId | null): Presence {
    return me.focus === focus ? me : { ...me, focus };
}


/**
 * The starter playbook the first member finds on a fresh board — a small,
 * recognisable inbound-lead process that shows every card kind and invites
 * editing instead of an empty void.
 */
function seedPlaybook(owner: SeatId): {
  nodes: Record<NodeId, CardNode>;
  flows: Record<FlowId, Flow>;
} {
    const cards: Array<Omit<CardNode, 'owner'>> = [
        {
            id: 'n-seed-trigger',
            kind: 'trigger',
            title: 'New inbound lead',
            subtitle: 'Website form on the pricing page',
            x: 40,
            y: -20,
        },
        {
            id: 'n-seed-enrich',
            kind: 'step',
            title: 'Enrich the record',
            subtitle: 'Company size, funding and tooling',
            x: 40,
            y: 170,
        },
        {
            id: 'n-seed-qualify',
            kind: 'approval',
            title: 'Qualify the lead',
            subtitle: 'AE confirms fit within 24 hours',
            x: 40,
            y: 360,
        },
        {
            id: 'n-seed-book',
            kind: 'step',
            title: 'Book the call',
            subtitle: 'Route to the owning AE’s calendar',
            x: 420,
            y: 360,
        },
        {
            id: 'n-seed-note',
            kind: 'note',
            title: 'Working notes',
            subtitle: 'Double-click anywhere to add a step',
            x: 420,
            y: 120,
        },
    ];
    const nodes: Record<NodeId, CardNode> = {};
    for (const card of cards) nodes[card.id] = { ...card, owner };
    const pairs: Array<[NodeId, NodeId]> = [
        ['n-seed-trigger', 'n-seed-enrich'],
        ['n-seed-enrich', 'n-seed-qualify'],
        ['n-seed-qualify', 'n-seed-book'],
    ];
    const flows: Record<FlowId, Flow> = {};
    pairs.forEach(([from, to], index) => {
        const id = `f-seed-${index + 1}`;
        flows[id] = { id, from, to, addedBy: owner };
    });
    return { nodes, flows };
}

export const useStore = create<WithLiveblocks<AppState>>()(
    liveblocks(
        (set, get) => ({
            nodes: {},
            flows: {},
            members: {},
            feed: [],
            title: '',
            me: IDLE_PRESENCE,
            myId: myMemberId(),
            joined: false,
            board: null,
            pendingSource: null,
            selected: null,
            selectedFlow: null,
            editing: null,
            localOthers: {},

            setBoard: (board) => {
                // Same board → no-op. Guards the StrictMode-doubled deep-link effect,
                // which would otherwise wipe a freshly hydrated document.
                if (board === get().board) return;
                // Leave the room BEFORE the slices are cleared. The middleware
                // mirrors every storage-mapped write into the room while it is
                // entered, so clearing first wiped the shared document for everyone
                // still on the board. Leaving twice is safe (the connection effect
                // leaves again on cleanup).
                if (SYNC_MODE === 'liveblocks') get().liveblocks.leaveRoom();
                // A board switch starts from a clean document; the room (or the
                // local peers' hydration) then fills it back in.
                set({
                    board,
                    joined: false,
                    nodes: {},
                    flows: {},
                    members: {},
                    feed: [],
                    title: '',
                    pendingSource: null,
                    selected: null,
                    editing: null,
                    localOthers: {},
                    me: IDLE_PRESENCE,
                });
            },

            setTitle: (title) => {
                if (title === get().title) return;
                set({ title });
            },

            join: (person) => {
                const { myId, members, nodes, feed, localOthers, liveblocks, board, title } = get();
                const existing = members[myId];
                let seat = existing?.seat ?? freeSeat(members);
                const nextMembers = { ...members };
                if (seat === null) {
                    // Every seat is on the books — but tabs close without unregistering
                    // their member. Reclaim the seat of a member nobody is live for.
                    const liveSeats = new Set<number>();
                    for (const peer of Object.values(localOthers)) liveSeats.add(peer.presence.seat);
                    for (const other of liveblocks.others) {
                        const presence = (other.presence as { me?: Presence }).me;
                        if (presence) liveSeats.add(presence.seat);
                    }
                    const ghost = Object.values(members)
                        .filter((member) => member.id !== myId && !liveSeats.has(member.seat))
                        .sort((a, b) => a.seat - b.seat)[0];
                    if (!ghost) return false;
                    seat = ghost.seat;
                    delete nextMembers[ghost.id];
                }
                const department = departmentOf(seat);
                // The first member on an empty board gets the starter playbook.
                const shouldSeed = !existing && Object.keys(members).length === 0
          && Object.keys(nodes).length === 0;
                const seeded = shouldSeed ? seedPlaybook(myId) : null;
                set({
                    joined: true,
                    members: { ...nextMembers, [myId]: { id: myId, seat, person }},
                    me: { ...IDLE_PRESENCE, seat, person, department },
                    ...(seeded ? { nodes: seeded.nodes, flows: seeded.flows } : {}),
                    // An unnamed document takes the name this browser's lobby has for
                    // the board: the creator's tab is the one that knows it.
                    ...(title === '' && board !== null ? { title: boardName(board) } : {}),
                    feed: existing
                        ? feed
                        : appendFeed(feed, feedRowOf(seat, `${person} joined for ${department}`)),
                });
                return true;
            },

            resolveSeatClash: (remote) => {
                const { myId, members, me, joined } = get();
                const mine = members[myId];
                if (!joined || !mine || remote.id === myId || remote.seat !== mine.seat) return;
                // Deterministic loser: the higher member id moves to a free seat.
                if (myId < remote.id) return;
                const taken = new Set(
                    Object.values(members)
                        .filter((member) => member.id !== myId)
                        .map((member) => member.seat)
                );
                let seat: number | null = null;
                for (let candidate = 0; candidate < SEAT_COUNT; candidate += 1) {
                    if (!taken.has(candidate)) {
                        seat = candidate;
                        break;
                    }
                }
                if (seat === null) return;
                const department = departmentOf(seat);
                set({
                    members: { ...members, [myId]: { ...mine, seat }},
                    me: { ...me, seat, department },
                });
            },

            addCard: (kind, x, y) => {
                const { nodes, members, myId, feed, me } = get();
                const member = members[myId];
                if (!member) return;
                const ordinal = Object.values(nodes).filter((node) => node.kind === kind).length;
                const id: NodeId = `n-${myId}-${Date.now().toString(36)}`;
                const card: CardNode = {
                    id,
                    kind,
                    title: defaultCardTitle(kind, ordinal),
                    subtitle: 'Double-click to rename · edit in the panel',
                    x: Math.round(x),
                    y: Math.round(y),
                    owner: myId,
                };
                set({
                    nodes: { ...nodes, [id]: card },
                    selected: id,
                    pendingSource: null,
                    // Placing a card is mapping, not editing: no hands on it.
                    me: me.doing === 'mapping' ? me : { ...me, doing: 'mapping' },
                    feed: appendFeed(
                        feed,
                        feedRowOf(
                            member.seat,
                            `${departmentOf(member.seat)} added the ${KIND_LABELS[kind].toLowerCase()} “${card.title}”`
                        )
                    ),
                });
            },

            quickAdd: (kind) => {
                const { nodes } = get();
                const cards = Object.values(nodes);
                const x = cards.length === 0 ? 40 : Math.min(...cards.map((node) => node.x));
                const y = cards.length === 0
                    ? 0
                    : Math.max(...cards.map((node) => node.y)) + CARD_HEIGHT + STACK_GAP;
                get().addCard(kind, x, y);
            },

            addFlow: (fromId, toId, fromPort, toPort) => {
                const { nodes, flows, members, myId, feed, me } = get();
                const member = members[myId];
                const from = nodes[fromId];
                const to = nodes[toId];
                if (!member || !from || !to || fromId === toId) return;
                // A note annotates the board; it is not a step in the process.
                if (from.kind === 'note' || to.kind === 'note') return;
                const exists = Object.values(flows).some(
                    (flow) => flow.from === fromId && flow.to === toId
                );
                if (exists) return;
                const id: FlowId = `f-${myId}-${Date.now().toString(36)}`;
                set({
                    flows: {
                        ...flows,
                        [id]: {
                            id,
                            from: from.id,
                            to: to.id,
                            addedBy: myId,
                            ...(fromPort === undefined ? {} : { fromPort }),
                            ...(toPort === undefined ? {} : { toPort }),
                        },
                    },
                    me: me.doing === 'mapping' ? me : { ...me, doing: 'mapping' },
                    feed: appendFeed(
                        feed,
                        feedRowOf(
                            member.seat,
                            `${departmentOf(member.seat)} connected “${from.title}” → “${to.title}”`
                        )
                    ),
                });
            },

            selectCard: (nodeId) => {
                // A look is not an edit: nothing about me changes for the room.
                set({ selected: nodeId, selectedFlow: null, pendingSource: null });
            },

            connectOrSelect: (nodeId) => {
                const { pendingSource, selected, nodes, flows, members, myId } = get();
                const member = members[myId];
                if (!member) return;
                // Deliberate two-step connect: a plain click only SELECTS; clicking
                // the already-selected card arms the connection; the next card
                // completes it. Inspecting cards one after another never draws flows.
                if (pendingSource === null || !nodes[pendingSource]) {
                    // A note has nothing to connect, so a second click never arms it.
                    if (selected === nodeId && nodes[nodeId]?.kind !== 'note') {
                        set({ pendingSource: nodeId });
                        return;
                    }
                    get().selectCard(nodeId);
                    return;
                }
                if (pendingSource === nodeId) return;
                const exists = Object.values(flows).some(
                    (flow) => flow.from === pendingSource && flow.to === nodeId
                );
                if (!exists) get().addFlow(pendingSource, nodeId);
                set({ pendingSource: null, selected: nodeId, selectedFlow: null });
            },

            selectFlow: (flowId) => {
                if (!get().flows[flowId]) return;
                set({ selectedFlow: flowId, selected: null, pendingSource: null });
            },

            clearGesture: () => {
                const { pendingSource, selected, selectedFlow } = get();
                if (pendingSource === null && selected === null && selectedFlow === null) return;
                set({ pendingSource: null, selected: null, selectedFlow: null });
            },

            moveNode: (nodeId, x, y) => {
                const { nodes, me } = get();
                const node = nodes[nodeId];
                if (!node) return;
                // A motionless "move" (every plain click ends with a pointerup) must
                // not commit, broadcast, or flick the presence verb.
                if (node.x === x && node.y === y) return;
                // VERBATIM — no clamp, no round. The controlled cells echo this back
                // into the graph on every commit; any correction here fights the
                // pointer and makes the card jump. Rounding happens on release.
                set({
                    nodes: { ...nodes, [nodeId]: { ...node, x, y }},
                    me: { ...me, doing: 'moving', moving: nodeId },
                });
            },

            settleNode: (nodeId) => {
                const { nodes, me } = get();
                const node = nodes[nodeId];
                const restingMe = me.doing === 'moving'
                    ? { ...me, doing: 'idle' as const, moving: null }
                    : me;
                if (!node) {
                    set({ me: restingMe });
                    return;
                }
                const nextX = Math.round(node.x);
                const nextY = Math.round(node.y);
                const isUnmoved = node.x === nextX && node.y === nextY;
                set({
                    ...(isUnmoved ? {} : { nodes: { ...nodes, [nodeId]: { ...node, x: nextX, y: nextY }}}),
                    me: restingMe,
                });
            },

            resizeNode: (nodeId, x, y, w, h) => {
                const { nodes } = get();
                const node = nodes[nodeId];
                if (!node) return;
                const { w: nextW, h: nextH } = clampCardSize(w, h);
                const nextX = Math.round(x);
                const nextY = Math.round(y);
                if (node.x === nextX && node.y === nextY && node.w === nextW && node.h === nextH) return;
                set({ nodes: { ...nodes, [nodeId]: { ...node, x: nextX, y: nextY, w: nextW, h: nextH }}});
            },

            setResizing: (resizing) => {
                const { me } = get();
                if (me.resizing === resizing) return;
                const doing = resizing !== null ? 'resizing' : me.doing === 'resizing' ? 'idle' : me.doing;
                set({ me: { ...me, resizing, doing }});
            },

            setEditingHands: (nodeId) => {
                const { me } = get();
                if (me.focus === nodeId) return;
                const doing = nodeId !== null ? 'editing' : me.doing === 'editing' ? 'idle' : me.doing;
                set({ me: { ...me, focus: nodeId, doing }});
            },

            beginRename: (nodeId) => {
                const { nodes, me } = get();
                if (!nodes[nodeId]) return;
                // Renaming in place is a live edit: the room sees my frame on the
                // card for as long as the field is open.
                set({ editing: nodeId, pendingSource: null, me: withFocus({ ...me, doing: 'editing' }, nodeId) });
            },

            endRename: () => {
                const { editing, me } = get();
                if (editing === null) return;
                set({
                    editing: null,
                    me: withFocus(me.doing === 'editing' ? { ...me, doing: 'idle' } : me, null),
                });
            },

            renameCard: (nodeId, title) => {
                const { nodes, members, myId, feed } = get();
                const node = nodes[nodeId];
                const trimmed = title.trim();
                if (!node || trimmed === '' || trimmed === node.title) return;
                const seat = members[myId]?.seat ?? 0;
                set({
                    nodes: { ...nodes, [nodeId]: { ...node, title: trimmed }},
                    feed: appendFeed(feed, feedRowOf(seat, `“${node.title}” renamed to “${trimmed}”`)),
                });
            },

            setSubtitle: (nodeId, subtitle) => {
                const { nodes } = get();
                const node = nodes[nodeId];
                const trimmed = subtitle.trim();
                if (!node || trimmed === node.subtitle) return;
                set({ nodes: { ...nodes, [nodeId]: { ...node, subtitle: trimmed }}});
            },

            setKind: (nodeId, kind) => {
                const { nodes } = get();
                const node = nodes[nodeId];
                if (!node || node.kind === kind) return;
                set({ nodes: { ...nodes, [nodeId]: { ...node, kind }}});
            },

            removeCard: (nodeId) => {
                const { nodes, flows, members, myId, feed, selected, pendingSource, me } = get();
                const node = nodes[nodeId];
                // Only the owning department removes its cards.
                if (!node || node.owner !== myId) return;
                const nextNodes = { ...nodes };
                delete nextNodes[nodeId];
                const nextFlows = Object.fromEntries(
                    Object.entries(flows).filter(
                        ([, flow]) => flow.from !== nodeId && flow.to !== nodeId
                    )
                );
                const seat = members[myId]?.seat ?? 0;
                const nextSelected = selected === nodeId ? null : selected;
                set({
                    nodes: nextNodes,
                    flows: nextFlows,
                    selected: nextSelected,
                    pendingSource: pendingSource === nodeId ? null : pendingSource,
                    me,
                    feed: appendFeed(feed, feedRowOf(seat, `${departmentOf(seat)} removed “${node.title}”`)),
                });
            },

            removeFlow: (flowId) => {
                const { flows, nodes, members, myId, feed, selectedFlow } = get();
                const flow = flows[flowId];
                if (!flow) return;
                const nextFlows = { ...flows };
                delete nextFlows[flowId];
                const seat = members[myId]?.seat ?? 0;
                const fromTitle = nodes[flow.from]?.title ?? '…';
                const toTitle = nodes[flow.to]?.title ?? '…';
                set({
                    flows: nextFlows,
                    selectedFlow: selectedFlow === flowId ? null : selectedFlow,
                    feed: appendFeed(
                        feed,
                        feedRowOf(seat, `${departmentOf(seat)} removed “${fromTitle}” → “${toTitle}”`)
                    ),
                });
            },

            setCursor: (cursor) => {
                const { me } = get();
                set({ me: { ...me, cursor }});
            },

            setDoing: (doing) => {
                const { me } = get();
                if (me.doing === doing) return;
                set({ me: { ...me, doing }});
            },

            setDrawing: (drawing) => {
                const { me } = get();
                if (me.drawing === drawing) return;
                set({ me: { ...me, drawing }});
            },

            setPlacing: (placing) => {
                const { me } = get();
                if (me.placing === placing) return;
                set({ me: { ...me, placing }});
            },

            postFeed: (seat, text) => {
                const { feed } = get();
                set({ feed: appendFeed(feed, feedRowOf(seat, text)) });
            },

            applyRemote: (patch) => {
                set(patch);
            },
        }),
        {
            client,
            presenceMapping: { me: true },
            storageMapping: { nodes: true, flows: true, members: true, feed: true, title: true },
        }
    )
);

/**
 * Two people joining a fresh board at the same moment both see every seat
 * free and claim the same one. Whichever transport delivers the other
 * member's record, the deterministic loser re-seats itself. Deferred a
 * microtask so the local adapter has finished applying the remote patch and
 * broadcasts the re-seat as a change of this tab's own.
 */
useStore.subscribe((state, previous) => {
    if (state.members === previous.members) return;
    queueMicrotask(() => {
        const current = useStore.getState();
        for (const member of Object.values(current.members)) current.resolveSeatClash(member);
    });
});
