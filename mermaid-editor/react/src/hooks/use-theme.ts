import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function preferredTheme(): Theme {
    return globalThis.matchMedia?.(DARK_QUERY).matches ? 'dark' : 'light';
}

/**
 * Light/dark theme, applied as `data-theme` on `<html>` so a single CSS block
 * repaints the app, the diagram and the editor at once — nothing re-renders and
 * the JointJS paper is never rebuilt.
 *
 * Starts from the OS preference and follows it until the user picks a side.
 */
export function useTheme(): { theme: Theme; toggle: () => void } {
    const [theme, setTheme] = useState<Theme>(preferredTheme);
    const [isPinned, setIsPinned] = useState(false);

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
    }, [theme]);

    useEffect(() => {
        if (isPinned) return;
        const media = globalThis.matchMedia?.(DARK_QUERY);
        if (!media) return;
        const onChange = (event: MediaQueryListEvent) => setTheme(event.matches ? 'dark' : 'light');
        media.addEventListener('change', onChange);
        return () => media.removeEventListener('change', onChange);
    }, [isPinned]);

    const toggle = useCallback(() => {
        setIsPinned(true);
        setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
    }, []);

    return { theme, toggle };
}
