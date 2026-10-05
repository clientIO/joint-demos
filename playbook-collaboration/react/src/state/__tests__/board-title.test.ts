import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * A board's name used to live only in the creator's browser (the lobby
 * registry in localStorage), so everyone who joined through the link saw the
 * raw id in the top bar and in their own lobby. The name now travels with
 * the shared document (`title`), and an invite link carries it too.
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

describe('board title', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.stubGlobal('localStorage', fakeStorage());
        vi.stubGlobal('window', { addEventListener() {}, removeEventListener() {} });
    });

    it('a deep link registers the board under the name the link carries', async() => {
        const lobby = await import('../lobby');
        lobby.ensureBoard('b-1', 'hello');
        expect(lobby.boardName('b-1')).toBe('hello');
        // A nameless deep link stays listed under its id until the room says.
        lobby.ensureBoard('b-2');
        expect(lobby.boardName('b-2')).toBe('b-2');
        lobby.renameBoard('b-2', 'hello too');
        expect(lobby.boardName('b-2')).toBe('hello too');
    });

    it('the first member writes the lobby name into the shared document', async() => {
        const lobby = await import('../lobby');
        const { useStore } = await import('../store');
        const meta = lobby.createBoard('hello');
        useStore.getState().setBoard(meta.id);
        expect(useStore.getState().title).toBe('');
        useStore.getState().join('Ada');
        expect(useStore.getState().title).toBe('hello');
    });

    it('a joiner takes the title the room sends', async() => {
        const { useStore } = await import('../store');
        useStore.getState().setBoard('b-9');
        useStore.getState().applyRemote({ title: 'hello' });
        expect(useStore.getState().title).toBe('hello');
        useStore.getState().setBoard(null);
        expect(useStore.getState().title).toBe('');
    });
});
