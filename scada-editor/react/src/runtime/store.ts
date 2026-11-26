import { useSyncExternalStore } from 'react';

/*
 * A value outside React that components read and follow: what the run shares between the parts mounted in
 * different places (the plant of the run, the log, the cells dimmed by it) - as the vanilla app keeps them on
 * the app.
 */

export interface Store<T> {
    readonly get: () => T;
    readonly set: (next: T | ((previous: T) => T)) => void;
    readonly subscribe: (listener: () => void) => () => void;
}

const isUpdater = <T,>(next: T | ((previous: T) => T)): next is (previous: T) => T => typeof next === 'function';

export function createStore<T>(initial: T): Store<T> {
    let value = initial;
    const listeners = new Set<() => void>();
    return {
        get: () => value,
        set: (next) => {
            const resolved = isUpdater(next) ? next(value) : next;
            if (Object.is(resolved, value)) {
                return;
            }
            value = resolved;
            [...listeners].forEach((listener) => listener());
        },
        subscribe: (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
    };
}

/**
 * A part of the value of the store, following its changes: re-rendered only when the part changes (a primitive, or
 * a value kept as it is).
 */
export function useStoreSelector<T, Selected>(store: Store<T>, select: (value: T) => Selected): Selected {
    return useSyncExternalStore(store.subscribe, () => select(store.get()));
}

/** The value of the store, following its changes. */
export function useStore<T>(store: Store<T>): T {
    return useSyncExternalStore(store.subscribe, store.get);
}
