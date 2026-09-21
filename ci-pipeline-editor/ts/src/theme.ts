/** The two looks of the app; the stylesheet keys every color off `data-theme` on the document (see `styles.css`). */
export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'ci-pipeline-editor-theme';

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

export function getTheme(): Theme {
    return theme;
}

/** Puts the theme on the document. Called before the app is built, so that nothing paints in the wrong colors. */
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
}
