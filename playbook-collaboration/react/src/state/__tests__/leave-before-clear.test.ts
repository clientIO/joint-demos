import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Leaving a board must leave the room BEFORE the storage-mapped slices are
 * cleared. The Liveblocks middleware mirrors every write into the room
 * while it is entered, so clearing first wiped the shared document for
 * everyone still on the board.
 */

describe('setBoard over Liveblocks', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.stubEnv('VITE_LIVEBLOCKS_PUBLIC_KEY', 'pk_dev_test');
        vi.stubGlobal('localStorage', {
            getItem: () => null,
            setItem() {},
            removeItem() {},
            clear() {},
            key: () => null,
            length: 0,
        });
    });

    it('leaves the room while the document is still populated, then clears', async() => {
        const { useStore, SYNC_MODE } = await import('../store');
        expect(SYNC_MODE).toBe('liveblocks');
        const nodesSeenOnLeave: unknown[] = [];
        useStore.setState({
            board: 'b-1',
            liveblocks: {
                ...useStore.getState().liveblocks,
                leaveRoom: () => {
                    nodesSeenOnLeave.push(useStore.getState().nodes);
                },
            },
        });
        useStore.getState().applyRemote({
            nodes: { 'n-1': { id: 'n-1', kind: 'step', title: 'A', subtitle: '', x: 0, y: 0, owner: 'm' }},
        });
        useStore.getState().setBoard(null);
        expect(nodesSeenOnLeave).toHaveLength(1);
        expect(Object.keys(nodesSeenOnLeave[0] as object)).toEqual(['n-1']);
        expect(useStore.getState().nodes).toEqual({});
        expect(useStore.getState().board).toBeNull();
    });
});
