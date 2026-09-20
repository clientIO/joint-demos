import { useSyncExternalStore } from 'react';

/** The two looks of the app; the stylesheet keys every color off `data-theme` on the document (see `index.css`). */
export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'tree-branch-groups-theme';

const listeners = new Set<() => void>();
let theme: Theme = readTheme();

/** The theme chosen last time, or the one the system prefers. */
function readTheme(): Theme {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark') return stored;
    } catch {
        // No storage: the system's preference, every time.
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Puts the theme on the document. Called before the first render, so that nothing paints in the wrong colors. */
export function applyTheme(): void {
    document.documentElement.dataset.theme = theme;
}

export function setTheme(next: Theme): void {
    theme = next;
    try {
        localStorage.setItem(STORAGE_KEY, next);
    } catch {
        // No storage: the choice lasts the session.
    }
    applyTheme();
    for (const listener of listeners) listener();
}

/** The current theme; the component re-renders when it changes. */
export function useTheme(): Theme {
    return useSyncExternalStore(
        (listener) => {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        () => theme
    );
}
