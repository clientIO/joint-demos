/**
 * The Liveblocks contract of the demo: what the room stores (the shared playbook),
 * what each person broadcasts live (presence), and the starter playbook a new room
 * begins with. Every Liveblocks hook in the app is typed from the declarations here.
 */
import { LiveList, LiveMap, LiveObject } from '@liveblocks/client';
import type { Card, FeedRow, Flow, Kind } from './model';
import { CARD_HEIGHT, CARD_WIDTH } from './model';

/** The key from `.env.local`, as typed; it may be empty or of the wrong kind. */
export const CONFIGURED_KEY = (import.meta.env.VITE_LIVEBLOCKS_PUBLIC_KEY ?? '').trim();

/**
 * The key the app uses: only a public key (`pk_...`). A secret key pasted by
 * mistake is refused, so it is never sent from the browser.
 */
export const LIVEBLOCKS_PUBLIC_KEY = CONFIGURED_KEY.startsWith('pk_') ? CONFIGURED_KEY : '';

/** The shared document. It is the one source of truth; the diagram is drawn from it. */
export type Storage = {
    title: string;
    /** LiveObjects, so two people editing different fields of one card both win. */
    cards: LiveMap<string, LiveObject<Card>>;
    flows: LiveMap<string, Flow>;
    feed: LiveList<FeedRow>;
};

/** What someone is doing to a card right now; peers draw a frame around it. */
export type CardActivity = {
    cardId: string;
    verb: 'moving' | 'resizing' | 'editing';
};

/** A flow being dragged out of a card's OUT dot, shown to everyone while in the air. */
export type FlowDraft = {
    /** The id of the author's own graph link, so their board keeps that exact cell. */
    linkId: string;
    source: string;
    /** The loose end, in graph coordinates. */
    x: number;
    y: number;
    /** The card whose IN dot the loose end has snapped to, if any. */
    target: string | null;
};

/** A card being dragged in from the palette, shown to everyone as a ghost. */
export type CardDraft = {
    kind: Kind;
    x: number;
    y: number;
};

/** Live, per-connection state. It is never stored; it vanishes when the tab closes. */
export type Presence = {
    name: string;
    /** The department seat; -1 until the person has joined. */
    seat: number;
    /** The pointer in graph coordinates, so it lands right whatever each person's zoom. */
    cursor: { x: number; y: number } | null;
    busy: CardActivity | null;
    drawing: FlowDraft | null;
    placing: CardDraft | null;
};

declare global {
    interface Liveblocks {
        Presence: Presence;
        Storage: Storage;
    }
}

/** Presence of someone who has not joined yet. */
export const NOT_JOINED: Presence = {
    name: '',
    seat: -1,
    cursor: null,
    busy: null,
    drawing: null,
    placing: null,
};

/** Builds one card of the starter playbook. */
function starterCard(kind: Kind, seat: number, title: string, detail: string, x: number, y: number) {
    return new LiveObject<Card>({ kind, seat, title, detail, x, y, width: CARD_WIDTH, height: CARD_HEIGHT });
}

/**
 * The storage of a brand new room: a small inbound-lead playbook that shows every
 * card kind, so the first visitor edits something instead of facing an empty board.
 * Liveblocks applies it only when the room has no storage yet.
 */
export function createStarterStorage(): Storage {
    return {
        title: 'Inbound lead intake',
        cards: new LiveMap([
            ['seed-trigger', starterCard('trigger', 0, 'New inbound lead', 'Website form on the pricing page', 40, -20)],
            ['seed-enrich', starterCard('step', 1, 'Enrich the record', 'Company size, funding and tooling', 40, 170)],
            ['seed-qualify', starterCard('approval', 1, 'Qualify the lead', 'AE confirms fit within 24 hours', 40, 360)],
            ['seed-book', starterCard('step', 3, 'Book the call', 'Route to the owning AE\'s calendar', 420, 360)],
            ['seed-note', starterCard('note', 2, 'Working notes', 'Double-click anywhere to add a step', 420, 120)],
        ]),
        flows: new LiveMap([
            ['seed-flow-1', { source: 'seed-trigger', target: 'seed-enrich' }],
            ['seed-flow-2', { source: 'seed-enrich', target: 'seed-qualify' }],
            ['seed-flow-3', { source: 'seed-qualify', target: 'seed-book' }],
        ]),
        feed: new LiveList([]),
    };
}
