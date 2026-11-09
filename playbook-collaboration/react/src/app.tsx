/**
 * The app shell: theme, header and the Liveblocks room the board lives in. One room
 * per board id from the URL; everything inside it reads and writes that room.
 */
import { ClientSideSuspense, LiveblocksProvider, RoomProvider } from '@liveblocks/react/suspense';
import { useEffect, useState } from 'react';
import { PlaybookBoard } from './board/playbook-board';
import { CONFIGURED_KEY, LIVEBLOCKS_PUBLIC_KEY, NOT_JOINED, createStarterStorage } from './liveblocks.config';
import { BoardErrorBoundary } from './panels/board-error-boundary';
import { BoardLoading } from './panels/board-loading';
import { Hint } from './panels/hint';
import { JoinDialog } from './panels/join-dialog';
import { MissingKeyNotice } from './panels/missing-key';
import { SidePanel } from './panels/side-panel';
import { BoardTitleControls, PeopleControls, TopBar } from './panels/top-bar';
import { boardIdFromUrl, readProfile } from './session';

const THEME_KEY = 'playbook:theme';

/** Read once at load: the board never changes without a page navigation. */
const BOARD_ID = boardIdFromUrl();

/** A reload of a joined tab goes straight back to the table. */
const INITIAL_PRESENCE = { ...NOT_JOINED, ...readProfile() };

function initialIsDark(): boolean {
    try {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved !== null) return saved === 'dark';
    } catch {
        // Storage is blocked; fall back to the OS preference.
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Keeps the `dark` class and the saved preference in step with the toggle. */
function useTheme(): [boolean, () => void] {
    const [isDark, setIsDark] = useState(initialIsDark);
    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDark);
        try {
            localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
        } catch {
            // The preference simply does not persist.
        }
    }, [isDark]);
    return [isDark, () => setIsDark((previous) => !previous)];
}

/** The whole page. */
export function App() {
    const [isDark, toggleTheme] = useTheme();

    if (!LIVEBLOCKS_PUBLIC_KEY) {
        return (
            <div className="relative flex h-full flex-col">
                <TopBar isDark={isDark} onToggleTheme={toggleTheme} />
                <main className="relative flex min-h-0 flex-1">
                    <MissingKeyNotice hasWrongKind={CONFIGURED_KEY !== ''} />
                </main>
            </div>
        );
    }

    return (
        // A throttle of one frame keeps remote cursors and drags smooth.
        <LiveblocksProvider publicApiKey={LIVEBLOCKS_PUBLIC_KEY} throttle={16}>
            <RoomProvider id={`playbook-collaboration:${BOARD_ID}`} initialPresence={INITIAL_PRESENCE} initialStorage={createStarterStorage}>
                <div className="relative flex h-full flex-col">
                    <TopBar
                        isDark={isDark}
                        onToggleTheme={toggleTheme}
                        boardControls={<ClientSideSuspense fallback={null}><BoardTitleControls /></ClientSideSuspense>}
                        people={<ClientSideSuspense fallback={null}><PeopleControls /></ClientSideSuspense>}
                    />
                    {/* Below 900px the side panel stacks under the board. */}
                    <main className="relative flex min-h-0 flex-1 max-[900px]:flex-col">
                        <BoardErrorBoundary>
                            <ClientSideSuspense fallback={<BoardLoading />}>
                                <PlaybookBoard />
                                <SidePanel />
                                <Hint />
                                <JoinDialog />
                            </ClientSideSuspense>
                        </BoardErrorBoundary>
                    </main>
                </div>
            </RoomProvider>
        </LiveblocksProvider>
    );
}
