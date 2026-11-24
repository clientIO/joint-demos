/**
 * Every read of the shared board, validated. Storage is written by other browsers,
 * so entries of the wrong shape are dropped here, once, and the rest of the app can
 * trust what it gets. Shallow equality keeps unchanged snapshots referentially
 * stable, so readers re-render only when their part of the board changes.
 */
import { shallow } from '@liveblocks/react';
import { useStorage } from '@liveblocks/react/suspense';
import type { Card, FeedRow, Flow } from '@/model';
import { isValidCard, isValidFeedRow, isValidFlow, pickValid } from '@/model';

/** All valid cards, by id. */
export function useCards(): Readonly<Record<string, Card>> {
    return useStorage((root) => pickValid(root.cards, isValidCard), shallow);
}

/** All valid flows, by id. */
export function useFlows(): Readonly<Record<string, Flow>> {
    return useStorage((root) => pickValid(root.flows, isValidFlow), shallow);
}

/** One card, or `undefined` when it is missing or malformed. */
export function useCard(cardId: string | null): Card | undefined {
    return useStorage((root) => {
        const card = cardId === null ? undefined : root.cards[cardId];
        return isValidCard(card) ? card : undefined;
    });
}

/** The activity feed, valid rows only. */
export function useFeed(): readonly FeedRow[] {
    return useStorage((root) => root.feed.filter(isValidFeedRow), shallow);
}

/** The board's name, with a fallback if storage holds something else. */
export function useBoardTitle(): string {
    return useStorage((root) => (typeof root.title === 'string' ? root.title : 'Untitled playbook'));
}
