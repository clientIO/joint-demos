import { useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { PeerDraft } from '@/canvas/draft-links';
import type { Presence } from '@/model/types';
import { connectLocalRoom } from './local-room';
import { renameBoard, touchBoard } from './lobby';
import { SYNC_MODE, useStore } from './store';

/**
 * Connects the store to the OPEN board over whichever transport is
 * available: the Liveblocks room when a public key is configured, this
 * browser's BroadcastChannel otherwise. Also heartbeats the lobby registry
 * so an active board never counts as dead.
 */
export function useRoomConnection(): void {
    const board = useStore((state) => state.board);

    useEffect(() => {
        if (board === null) return;
        touchBoard(board);
        const beat = setInterval(() => touchBoard(board), 60_000);
        let disconnect: () => void;
        if (SYNC_MODE === 'liveblocks') {
            const { enterRoom, leaveRoom } = useStore.getState().liveblocks;
            enterRoom(`journey-board:${board}`);
            disconnect = leaveRoom;
        } else {
            disconnect = connectLocalRoom(board);
        }
        // The document names the board; the lobby lists it by that name.
        const stopNaming = useStore.subscribe((state, previous) => {
            if (state.board !== board || state.title === previous.title) return;
            renameBoard(board, state.title);
        });
        return () => {
            clearInterval(beat);
            stopNaming();
            disconnect();
        };
    }, [board]);
}

export interface Colleague {
  readonly id: string;
  readonly presence: Presence;
}

const NO_COLLEAGUES: readonly Colleague[] = [];
const NO_DRAFTS: readonly PeerDraft[] = [];

type RoomState = {
  liveblocks: { others: readonly { connectionId: number; presence: unknown }[] };
  localOthers: Record<string, { presence: Presence }>;
};

/** Everyone else who has joined, over either transport (no hook). */
function colleaguesOf(state: RoomState): Colleague[] {
    if (SYNC_MODE === 'liveblocks') {
        const colleagues: Colleague[] = [];
        for (const other of state.liveblocks.others) {
            const presence = (other.presence as { me?: Presence }).me;
            if (presence && presence.seat >= 0) {
                colleagues.push({ id: String(other.connectionId), presence });
            }
        }
        return colleagues;
    }
    return Object.entries(state.localOthers)
        .map(([id, peer]) => ({ id, presence: peer.presence }))
        .filter((colleague) => colleague.presence.seat >= 0);
}

function peerDraftsOf(state: RoomState): PeerDraft[] {
    const drafts: PeerDraft[] = [];
    for (const { id, presence } of colleaguesOf(state)) {
        if (presence.drawing !== null) drafts.push({ id, seat: presence.seat, ...presence.drawing });
    }
    return drafts;
}

/**
 * Colleagues' flows in the air, as a list that only changes when a draft
 * does. The selector reduces them to a string, so the board is not
 * re-derived on every remote cursor tick.
 */
export function usePeerDrafts(): readonly PeerDraft[] {
    const key = useStore((state) =>
        peerDraftsOf(state)
            .map((draft) => `${draft.id}:${draft.seat}:${draft.from}:${draft.fromPort}:${draft.x}:${draft.y}`)
            .join('|')
    );
    return useMemo(() => (key === '' ? NO_DRAFTS : peerDraftsOf(useStore.getState())), [key]);
}

/** What a colleague is doing to a card right now. */
export interface PeerHands {
  readonly seat: number;
  readonly person: string;
  readonly verb: 'moving' | 'resizing' | 'editing';
}

/**
 * The colleague with their hands on `nodeId` right now (dragging, resizing
 * or editing it, in place or in their inspector), `null` when nobody has. Shallow-compared so cards
 * re-render only when THEIR hands change, not on every remote cursor tick.
 */
export function usePeerHands(nodeId: string): PeerHands | null {
    return useStore(
        useShallow((state) => {
            for (const presence of peerPresences(state)) {
                const verb =
          presence.moving === nodeId
              ? 'moving'
              : presence.resizing === nodeId
                  ? 'resizing'
                  : presence.focus === nodeId
                      ? 'editing'
                      : null;
                if (verb !== null) return { seat: presence.seat, person: presence.person, verb };
            }
            return null;
        })
    );
}

function peerPresences(state: {
  liveblocks: { others: readonly { presence: unknown }[] };
  localOthers: Record<string, { presence: Presence }>;
}): Presence[] {
    if (SYNC_MODE === 'liveblocks') {
        const presences: Presence[] = [];
        for (const other of state.liveblocks.others) {
            const presence = (other.presence as { me?: Presence }).me;
            if (presence && presence.seat >= 0) presences.push(presence);
        }
        return presences;
    }
    return Object.values(state.localOthers)
        .map((peer) => peer.presence)
        .filter((presence) => presence.seat >= 0);
}

/** Everyone else in the open board who has joined, over either transport. */
export function useOthers(): readonly Colleague[] {
    const liveOthers = useStore((state) => state.liveblocks.others);
    const localOthers = useStore((state) => state.localOthers);
    if (SYNC_MODE === 'liveblocks') {
        const colleagues = liveOthers
            .map((other) => ({
                id: String(other.connectionId),
                presence: (other.presence as { me?: Presence }).me,
            }))
            .filter(
                (colleague): colleague is Colleague =>
                    colleague.presence !== undefined && colleague.presence.seat >= 0
            );
        return colleagues.length > 0 ? colleagues : NO_COLLEAGUES;
    }
    const colleagues = Object.entries(localOthers)
        .map(([id, peer]) => ({ id, presence: peer.presence }))
        .filter((colleague) => colleague.presence.seat >= 0);
    return colleagues.length > 0 ? colleagues : NO_COLLEAGUES;
}
