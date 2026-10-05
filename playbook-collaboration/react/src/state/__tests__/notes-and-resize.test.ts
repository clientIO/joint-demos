import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * A note annotates the board and never joins the process: no flow may
 * touch one, from a drag or from click-to-connect, and the seed carries
 * none. A resize from a top or left handle moves the card too, so the
 * store takes the position with the size.
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

describe('notes and resizing', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.stubGlobal('localStorage', fakeStorage());
        vi.stubGlobal('window', { addEventListener() {}, removeEventListener() {} });
    });

    it('keeps notes out of the flows', async() => {
        const { useStore } = await import('../store');
        const store = useStore.getState();
        store.setBoard('b-notes');
        store.join('Ada');
        const nodes = Object.values(useStore.getState().nodes);
        const note = nodes.find((node) => node.kind === 'note');
        const step = nodes.find((node) => node.kind === 'step');
        expect(note && step).toBeTruthy();
        if (!note || !step) return;
        const seeded = Object.values(useStore.getState().flows);
        expect(seeded.some((flow) => flow.from === note.id || flow.to === note.id)).toBe(false);

        store.addFlow(step.id, note.id);
        store.addFlow(note.id, step.id);
        expect(Object.values(useStore.getState().flows)).toHaveLength(seeded.length);

        // Clicking a selected note never arms a connection.
        store.selectCard(note.id);
        store.connectOrSelect(note.id);
        expect(useStore.getState().pendingSource).toBeNull();
    });

    it('takes the position along with the size', async() => {
        const { useStore, CARD_MIN_WIDTH, CARD_MAX_WIDTH } = await import('../store');
        const store = useStore.getState();
        store.setBoard('b-resize');
        store.join('Ada');
        const [card] = Object.values(useStore.getState().nodes);
        store.resizeNode(card.id, card.x - 40, card.y - 20, CARD_MAX_WIDTH + 100, 200);
        const grown = useStore.getState().nodes[card.id];
        expect([grown.x, grown.y, grown.w, grown.h]).toEqual([card.x - 40, card.y - 20, CARD_MAX_WIDTH, 200]);
        store.resizeNode(card.id, grown.x, grown.y, 10, 10);
        expect(useStore.getState().nodes[card.id].w).toBe(CARD_MIN_WIDTH);
    });
});
