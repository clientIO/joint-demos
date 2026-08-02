import type { Theme } from '@/hooks/use-theme';

export interface ThemeToggleProps {
    readonly theme: Theme;
    readonly onToggle: () => void;
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
    const isDark = theme === 'dark';
    return (
        <button
            type="button"
            className="app-button is-icon"
            onClick={onToggle}
            aria-pressed={isDark}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        >
            {isDark ? (
                <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden>
                    <path d="M12.06 3.6a.9.9 0 0 0-1.05-1.2A9.6 9.6 0 1 0 21.96 13.3a.9.9 0 0 0-1.2-1.05A6.6 6.6 0 0 1 12.06 3.6Z" />
                </svg>
            ) : (
                <svg
                    viewBox="0 0 24 24"
                    width="15"
                    height="15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden
                >
                    <circle cx="12" cy="12" r="4.2" />
                    <path d="M12 2.6v2M12 19.4v2M2.6 12h2M19.4 12h2M5.4 5.4l1.4 1.4M17.2 17.2l1.4 1.4M18.6 5.4l-1.4 1.4M6.8 17.2l-1.4 1.4" />
                </svg>
            )}
        </button>
    );
}
