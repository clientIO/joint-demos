import { useEffect, useState } from 'react';

/** The theme the user picked; `system` follows the OS. */
export type ThemeChoice = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'scada-editor-theme';
/** The media query of the OS's dark theme. */
export const DARK_QUERY = '(prefers-color-scheme: dark)';

function readChoice(): ThemeChoice {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored === 'light' || stored === 'dark' ? stored : 'system';
    } catch {
        return 'system';
    }
}

/** The color theme: the system's by default, remembered in this browser when chosen. */
export function useTheme(): readonly [ThemeChoice, (choice: ThemeChoice) => void] {
    const [choice, setChoice] = useState(readChoice);

    useEffect(() => {
        const media = window.matchMedia(DARK_QUERY);
        const apply = () => {
            const isDark = choice === 'dark' || (choice === 'system' && media.matches);
            document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
        };
        apply();
        media.addEventListener('change', apply);
        return () => media.removeEventListener('change', apply);
    }, [choice]);

    const choose = (next: ThemeChoice) => {
        setChoice(next);
        try {
            if (next === 'system') {
                localStorage.removeItem(STORAGE_KEY);
            } else {
                localStorage.setItem(STORAGE_KEY, next);
            }
        } catch {
            // Private mode: the choice lasts for this visit only.
        }
    };
    return [choice, choose];
}
