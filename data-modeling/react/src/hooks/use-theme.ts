// Light/dark theme. On load it follows the OS preference (`prefers-color-scheme`)
// and keeps tracking it live; the toggle overrides the choice for the session.
// The choice is intentionally not persisted — each load starts from the system
// preference. Drives the `.dark` class on <html> that the Tailwind `dark:`
// variant + design tokens key off.
import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

function getSystemTheme(): Theme {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
}

export interface UseThemeResult {
  readonly theme: Theme;
  readonly toggle: () => void;
}

export function useTheme(): UseThemeResult {
    const [theme, setTheme] = useState<Theme>(getSystemTheme);
    const [overridden, setOverridden] = useState(false);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
    }, [theme]);

    // Follow OS scheme changes until the user picks a theme themselves.
    useEffect(() => {
        if (overridden) return;
        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const onChange = (event: MediaQueryListEvent) =>
            setTheme(event.matches ? 'dark' : 'light');
        media.addEventListener('change', onChange);
        return () => media.removeEventListener('change', onChange);
    }, [overridden]);

    function toggle() {
        setOverridden(true);
        setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
    }

    return { theme, toggle };
}
