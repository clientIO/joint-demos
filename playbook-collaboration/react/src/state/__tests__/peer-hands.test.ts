import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Colleagues should see a card as someone's work while that person has
 * their hands on it, never because they merely clicked it. A plain select
 * stays silent; a drag, a resize and an in-place rename each show in my
 * presence for as long as they last.
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

describe('hands on a card', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.stubGlobal('localStorage', fakeStorage());
        vi.stubGlobal('window', { addEventListener() {}, removeEventListener() {} });
    });

    it('a plain click is silent; drag, resize and rename show while they last', async() => {
        const { useStore } = await import('../store');
        const store = useStore.getState();
        store.setBoard('b-hands');
        store.join('Ada');
        const [card] = Object.values(useStore.getState().nodes);
        const me = () => useStore.getState().me;

        store.selectCard(card.id);
        expect([me().doing, me().focus, me().moving, me().resizing]).toEqual(['idle', null, null, null]);

        store.moveNode(card.id, card.x + 30, card.y + 10);
        expect([me().doing, me().moving]).toEqual(['moving', card.id]);
        store.settleNode(card.id);
        expect([me().doing, me().moving]).toEqual(['idle', null]);
        expect(useStore.getState().nodes[card.id].x).toBe(card.x + 30);

        store.setResizing(card.id);
        expect([me().doing, me().resizing]).toEqual(['resizing', card.id]);
        store.setResizing(null);
        expect([me().doing, me().resizing]).toEqual(['idle', null]);

        store.setEditingHands(card.id);
        expect([me().doing, me().focus]).toEqual(['editing', card.id]);
        store.setEditingHands(null);
        expect([me().doing, me().focus]).toEqual(['idle', null]);

        store.beginRename(card.id);
        expect([me().doing, me().focus]).toEqual(['editing', card.id]);
        store.endRename();
        expect([me().doing, me().focus]).toEqual(['idle', null]);
    });

    it('adding or removing a card never puts my hands on one', async() => {
        const { useStore } = await import('../store');
        const store = useStore.getState();
        store.setBoard('b-hands-add');
        store.join('Ada');
        const me = () => useStore.getState().me;

        store.addCard('step', 600, 600);
        const added = useStore.getState().selected;
        expect(added).not.toBeNull();
        expect(me().focus).toBeNull();

        if (added !== null) store.removeCard(added);
        expect(me().focus).toBeNull();
    });
});
