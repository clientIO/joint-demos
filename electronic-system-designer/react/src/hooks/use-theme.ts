// Light/dark toggle. index.html applies the OS preference to <html> BEFORE
// first paint (no flash); this hook reads that as the initial value and keeps
// the class in sync when the user toggles. The DOM write lives in an effect —
// never inside the setState updater, which StrictMode double-invokes.

import { useCallback, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

export function useTheme(): { readonly theme: Theme; readonly toggle: () => void } {
    const [theme, setTheme] = useState<Theme>(() =>
        document.documentElement.classList.contains('dark') ? 'dark' : 'light',
    );

    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
    }, [theme]);

    const toggle = useCallback(() => {
        setTheme((previous) => (previous === 'dark' ? 'light' : 'dark'));
    }, []);

    return { theme, toggle };
}
