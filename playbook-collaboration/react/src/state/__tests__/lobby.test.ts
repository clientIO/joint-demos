import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BOARD_TTL_MS } from '../lobby';

/**
 * Regression: the registry is pruned while the module initialises. When that
 * prune actually removed a dead board it used to notify the (not yet created)
 * snapshot bindings and crash the whole app at import time.
 */

function fakeStorage(seed: Record<string, string>): Storage {
    const data = new Map(Object.entries(seed));
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

describe('lobby registry', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it('imports cleanly when a dead board has to be pruned on load', async() => {
        const dead = { id: 'b-dead', name: 'Old', createdAt: 0, lastActiveAt: Date.now() - BOARD_TTL_MS - 1 };
        const live = { id: 'b-live', name: 'New', createdAt: 0, lastActiveAt: Date.now() };
        const storage = fakeStorage({
            'journey-board:boards': JSON.stringify({ [dead.id]: dead, [live.id]: live }),
            'journey-board:doc:b-dead': '{}',
        });
        vi.stubGlobal('localStorage', storage);

        await expect(import('../lobby')).resolves.toBeDefined();

        expect(storage.getItem('journey-board:doc:b-dead')).toBeNull();
        expect(JSON.parse(storage.getItem('journey-board:boards') ?? '{}')).toEqual({ [live.id]: live });
        vi.unstubAllGlobals();
    });
});
