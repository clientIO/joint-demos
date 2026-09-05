/**
 * Light or dark, remembered.
 *
 * The choice is a `data-theme` attribute on the document root; everything the
 * demo draws — chrome and board alike — reads its colors from custom
 * properties defined per theme in `index.css`, so this hook sets one attribute
 * and nothing else has to know.
 *
 * With no stored choice the system's preference wins, and keeps winning: the
 * media query stays subscribed until the player picks a side, so a machine that
 * switches to dark in the evening takes the demo with it.
 */
import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'shikaku:theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

function storedTheme(): Theme | null {
    try {
        const value = localStorage.getItem(STORAGE_KEY);
        return value === 'light' || value === 'dark' ? value : null;
    } catch {
        // Private browsing, or storage turned off. The preference is a
        // convenience, not something to fail over.
        return null;
    }
}

function systemTheme(): Theme {
    return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

export interface ThemeApi {
    readonly theme: Theme;
    readonly toggleTheme: () => void;
}

export function useTheme(): ThemeApi {
    const [chosen, setChosen] = useState<Theme | null>(storedTheme);
    const [system, setSystem] = useState<Theme>(systemTheme);
    const theme = chosen ?? system;

    // Only matters until the player chooses, but the listener is cheap and
    // unsubscribing on choice would be a second effect for nothing.
    useEffect(() => {
        const query = window.matchMedia(DARK_QUERY);
        const onChange = (event: MediaQueryListEvent) => setSystem(event.matches ? 'dark' : 'light');
        query.addEventListener('change', onChange);
        return () => query.removeEventListener('change', onChange);
    }, []);

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setChosen((previous) => {
            const next: Theme = (previous ?? systemTheme()) === 'dark' ? 'light' : 'dark';
            try {
                localStorage.setItem(STORAGE_KEY, next);
            } catch {
                // Not being able to remember it is survivable.
            }
            return next;
        });
    }, []);

    return { theme, toggleTheme };
}
