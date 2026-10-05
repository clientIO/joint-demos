import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * A flow can be selected on the board and removed from there: selecting one
 * ends the card selection and any armed connection, removing it drops the
 * selection with it, and picking a card clears the flow again.
 */

function fakeStorage(): Storage {
    const data = new Map<string, string>();
    return {
        get length() {
            return data.size;
        },
        key: (index: number) => [...data.keys()][index] ?? null,
        getItem: (key: string) => data.get(key) ?? null,
        setItem: (key: string, value: string) => void data.set(key, value),
        removeItem: (key: string) => void data.delete(key),
        clear: () => data.clear(),
    };
}

describe('flow selection', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.stubGlobal('localStorage', fakeStorage());
        vi.stubGlobal('window', { addEventListener() {}, removeEventListener() {} });
    });

    it('selects a flow, drops it on removal, and yields to a card', async() => {
        const { useStore } = await import('../store');
        const store = useStore.getState();
        store.setBoard('b-flows');
        store.join('Ada');
        const [first, second] = Object.values(useStore.getState().nodes);
        store.addFlow(first.id, second.id);
        const flow = Object.values(useStore.getState().flows).find(
            (candidate) => candidate.from === first.id && candidate.to === second.id
        );
        expect(flow).toBeDefined();
        if (!flow) return;

        store.selectCard(first.id);
        store.selectFlow(flow.id);
        expect(useStore.getState().selectedFlow).toBe(flow.id);
        expect(useStore.getState().selected).toBeNull();

        store.selectCard(second.id);
        expect(useStore.getState().selectedFlow).toBeNull();

        store.selectFlow(flow.id);
        store.removeFlow(flow.id);
        expect(useStore.getState().flows[flow.id]).toBeUndefined();
        expect(useStore.getState().selectedFlow).toBeNull();

        store.selectFlow('no-such-flow');
        expect(useStore.getState().selectedFlow).toBeNull();
    });
});
