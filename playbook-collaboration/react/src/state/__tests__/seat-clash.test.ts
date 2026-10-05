import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '../store';

/**
 * Two people joining a fresh board at the same moment both see every seat
 * free and claim the same one. Whatever transport delivers the other
 * member's record, the deterministic loser (the higher member id) must move
 * to a free seat — the local adapter used to be the only caller, so over
 * Liveblocks both stayed on one seat.
 */

const flush = () => new Promise<void>((resolve) => queueMicrotask(resolve));

describe('seat clash', () => {
    beforeEach(() => {
        useStore.setState({
            board: 'qa',
            joined: false,
            myId: 'm-zz',
            nodes: {},
            flows: {},
            members: {},
            feed: [],
        });
    });

    it('re-seats me when a lower member id arrives on my seat', async() => {
        useStore.getState().join('Me');
        expect(useStore.getState().members['m-zz'].seat).toBe(0);
        useStore.getState().applyRemote({
            members: { ...useStore.getState().members, 'm-aa': { id: 'm-aa', seat: 0, person: 'Other' }},
        });
        await flush();
        expect(useStore.getState().members['m-zz'].seat).toBe(1);
        expect(useStore.getState().me.seat).toBe(1);
        expect(useStore.getState().members['m-aa'].seat).toBe(0);
    });

    it('keeps my seat when the other member id is higher', async() => {
        useStore.getState().join('Me');
        useStore.getState().applyRemote({
            members: { ...useStore.getState().members, 'm-zzz': { id: 'm-zzz', seat: 0, person: 'Other' }},
        });
        await flush();
        expect(useStore.getState().members['m-zz'].seat).toBe(0);
        expect(useStore.getState().me.seat).toBe(0);
    });
});
