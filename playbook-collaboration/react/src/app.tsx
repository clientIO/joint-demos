import { useEffect, useState } from 'react';
import { BoardCanvas } from '@/canvas/canvas';
import { BoardLoading } from '@/panels/board-loading';
import { JoinDialog } from '@/panels/join-dialog';
import { Hint } from '@/panels/hint';
import { Lobby } from '@/panels/lobby';
import { TeamPanel } from '@/panels/team-panel';
import { TopBar } from '@/panels/top-bar';
import { boardFromUrl, boardNameFromUrl } from '@/state/identity';
import { ensureBoard } from '@/state/lobby';
import { useStore } from '@/state/store';
import { useRoomConnection } from '@/state/use-room';

const THEME_KEY = 'journey-board:theme';

function initialDark(): boolean {
    try {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved !== null) return saved === 'dark';
    } catch {
    // Storage may be blocked; fall through to the OS preference.
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** A `?board=` deep link skips the lobby; an invite link also names the board. */
function initialBoard(): string | null {
    const board = boardFromUrl();
    if (board !== null) ensureBoard(board, boardNameFromUrl() ?? undefined);
    return board;
}

/**
 * The Liveblocks badge (shown on the free plan) ships a hide button with no
 * accessible name; give it one whenever the badge appears.
 */
function useNamedLiveblocksBadge(): void {
    useEffect(() => {
        const name = () => {
            const button = document.getElementById('liveblocks-badge-hide-button');
            if (button && !button.hasAttribute('aria-label')) {
                button.setAttribute('aria-label', 'Hide the Liveblocks badge');
            }
        };
        name();
        const observer = new MutationObserver(name);
        observer.observe(document.body, { childList: true, subtree: true });
        return () => observer.disconnect();
    }, []);
}

export function App() {
    const board = useStore((state) => state.board);
    useRoomConnection();
    useNamedLiveblocksBadge();
    const [isDark, setDark] = useState(initialDark);

    // Deliberately once: later board switches go through the lobby.
    useEffect(() => {
        const deepLink = initialBoard();
        if (deepLink !== null) useStore.getState().setBoard(deepLink);
    }, []);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDark);
        try {
            localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
        } catch {
            // Preference simply won't persist.
        }
    }, [isDark]);

    return (
        <div className="relative flex h-full flex-col">
            <TopBar isDark={isDark} onToggleTheme={() => setDark((dark) => !dark)} />
            <main className="relative flex min-h-0 flex-1">
                {board !== null && (
                    <>
                        <BoardCanvas />
                        <TeamPanel />
                    </>
                )}
                <Lobby />
                {/* Inside the landmark, so no page content floats outside one. */}
                <Hint />
                <BoardLoading />
            </main>
            <JoinDialog />
        </div>
    );
}
