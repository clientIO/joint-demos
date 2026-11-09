/**
 * Narrow, validated reads of other people's presence. Cursors move many times a
 * second, so each hook selects only the fields its component draws and compares
 * them shallowly: the roster re-renders when someone joins or starts editing,
 * not on every pointer move in the room. Presence comes from other browsers, so
 * every field is checked before it reaches a render.
 */
import { shallow } from '@liveblocks/react';
import { useOthers, useSelf } from '@liveblocks/react/suspense';
import type { CardActivity, FlowDraft, Presence } from './liveblocks.config';
import type { Kind } from './model';
import { isKind, normalizeSeat } from './model';
import type { PeerDraft } from './board/to-cells';

/** Longest name shown for a peer, whatever they broadcast. */
const PEER_NAME_MAX_LENGTH = 24;

type Verb = CardActivity['verb'];

/** A peer as the roster shows them. */
export interface PeerSummary {
    readonly connectionId: number;
    readonly name: string;
    readonly seat: number;
    readonly verb: Verb | null;
    readonly hasCursor: boolean;
}

/** A peer's pointer, ready to draw. */
export interface PeerCursor {
    readonly connectionId: number;
    readonly name: string;
    readonly seat: number;
    readonly verb: Verb | null;
    readonly x: number;
    readonly y: number;
}

/** A card a peer is dragging in from the palette. */
export interface PeerPlacing {
    readonly connectionId: number;
    readonly name: string;
    readonly seat: number;
    readonly kind: Kind;
    readonly x: number;
    readonly y: number;
}

function isFinitePoint(point: unknown): point is { x: number; y: number } {
    return typeof point === 'object' && point !== null
        && 'x' in point && typeof point.x === 'number' && Number.isFinite(point.x)
        && 'y' in point && typeof point.y === 'number' && Number.isFinite(point.y);
}

/** Whether a peer has joined, i.e. broadcasts a usable seat. */
function hasJoined(presence: Presence): boolean {
    return typeof presence.seat === 'number' && Number.isFinite(presence.seat) && presence.seat >= 0;
}

function safeName(presence: Presence): string {
    return typeof presence.name === 'string' && presence.name.trim() !== ''
        ? presence.name.slice(0, PEER_NAME_MAX_LENGTH)
        : 'Guest';
}

function safeVerb(presence: Presence): Verb | null {
    const verb = presence.busy?.verb;
    return verb === 'moving' || verb === 'resizing' || verb === 'editing' ? verb : null;
}

/** Lists equal item by item, each item compared shallowly. */
function shallowList<Item>(a: readonly Item[], b: readonly Item[]): boolean {
    return a.length === b.length && a.every((item, index) => shallow(item, b[index]));
}

/** Everyone else who has joined, for the roster and avatars (no cursor positions). */
export function usePeerSummaries(): readonly PeerSummary[] {
    return useOthers(
        (others) => others.filter((other) => hasJoined(other.presence)).map(({ connectionId, presence }) => ({
            connectionId,
            name: safeName(presence),
            seat: normalizeSeat(presence.seat),
            verb: safeVerb(presence),
            hasCursor: presence.cursor !== null,
        })),
        shallowList
    );
}

/** The seats taken by people already at the table. */
export function useTakenSeats(): readonly number[] {
    return useOthers(
        (others) => others.filter((other) => hasJoined(other.presence)).map((other) => normalizeSeat(other.presence.seat)),
        shallow
    );
}

/** Every peer pointer; this one is meant to update on each move. */
export function usePeerCursors(): readonly PeerCursor[] {
    return useOthers(
        (others) => others.flatMap(({ connectionId, presence }) => {
            if (!hasJoined(presence) || !isFinitePoint(presence.cursor)) return [];
            const { x, y } = presence.cursor;
            return [{ connectionId, name: safeName(presence), seat: normalizeSeat(presence.seat), verb: safeVerb(presence), x, y }];
        }),
        shallowList
    );
}

/** Cards peers are dragging in from the palette. */
export function usePeerPlacings(): readonly PeerPlacing[] {
    return useOthers(
        (others) => others.flatMap(({ connectionId, presence }) => {
            const { placing } = presence;
            if (!hasJoined(presence) || placing === null || !isFinitePoint(placing)) return [];
            if (typeof placing.kind !== 'string' || !isKind(placing.kind)) return [];
            return [{ connectionId, name: safeName(presence), seat: normalizeSeat(presence.seat), kind: placing.kind, x: placing.x, y: placing.y }];
        }),
        shallowList
    );
}

/** My own name and seat; my cursor is left out on purpose. */
export function useMyProfile(): { readonly name: string; readonly seat: number } {
    return useSelf((self) => ({ name: self.presence.name, seat: self.presence.seat }), shallow);
}

/** The colleague with their hands on a card right now, if any. */
export function usePeerOnCard(cardId: string): { readonly verb: Verb; readonly name: string; readonly seat: number } | null {
    return useOthers((others) => {
        for (const { presence } of others) {
            const verb = safeVerb(presence);
            if (verb !== null && hasJoined(presence) && presence.busy?.cardId === cardId) {
                return { verb, name: safeName(presence), seat: normalizeSeat(presence.seat) };
            }
        }
        return null;
    }, shallow);
}

function isValidDraft(draft: FlowDraft | null): draft is FlowDraft {
    return draft !== null && isFinitePoint(draft) && typeof draft.source === 'string' && typeof draft.linkId === 'string'
        && (draft.target === null || typeof draft.target === 'string');
}

/** Colleagues' flows still in the air, drawn on everyone's board as dashed links. */
export function usePeerDrafts(): readonly PeerDraft[] {
    return useOthers(
        (others) => others.flatMap(({ connectionId, presence }) => {
            const draft = presence.drawing;
            if (!hasJoined(presence) || !isValidDraft(draft)) return [];
            return [{ ...draft, connectionId, seat: normalizeSeat(presence.seat) }];
        }),
        shallowList
    );
}

/** My own flow in the air, so the board keeps it while others' edits re-sync the cells. */
export function useMyDraft(): FlowDraft | null {
    return useSelf((self) => (isValidDraft(self.presence.drawing) ? self.presence.drawing : null), shallow);
}

/** The verb shown next to a busy colleague, in the cursor plate and the side panel. */
export function activityLabel(verb: Verb | null): string | null {
    switch (verb) {
        case 'moving':
            return 'moving a card';
        case 'resizing':
            return 'resizing a card';
        case 'editing':
            return 'editing a card';
        default:
            return null;
    }
}
