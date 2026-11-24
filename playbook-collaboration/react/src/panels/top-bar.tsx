/**
 * The header: the product mark, the board's shared name (editable by anyone), a
 * way to start a new board, everyone at the table, Invite, the theme toggle and the
 * JointJS badge. The room-bound parts render only inside a Liveblocks room.
 */
import * as Tooltip from '@radix-ui/react-tooltip';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { departmentOf } from '@/model';
import { useMyProfile, usePeerSummaries } from '@/presence';
import { useBoardTitle } from '@/board/board-data';
import { openNewBoard } from '@/session';
import { useSetBoardTitle } from '@/board/board-actions';
import { BuiltWithBadge } from './built-with-badge';
import { buttonClass } from './button-class';
import { InviteDialog } from './invite-dialog';
import { PlaybookMark } from './playbook-mark';
import { Roundel } from './roundel';

/** The page header; `boardControls` and `people` are the parts that need a room. */
export function TopBar({
    isDark,
    onToggleTheme,
    boardControls,
    people,
}: Readonly<{ isDark: boolean; onToggleTheme: () => void; boardControls?: ReactNode; people?: ReactNode }>) {
    return (
        <header className="flex items-center justify-between gap-4 border-b border-edge bg-panel px-4 py-2">
            <div className="flex min-w-0 items-center gap-3">
                <PlaybookMark size={20} />
                <h1 className="m-0 text-[15px] font-extrabold tracking-tight">Playbook</h1>
                {boardControls}
            </div>
            <div className="flex items-center gap-3">
                {people}
                <button
                    type="button"
                    className={buttonClass('icon')}
                    aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
                    onClick={onToggleTheme}
                >
                    {isDark ? <MoonIcon /> : <SunIcon />}
                </button>
                <span className="h-5 w-px bg-edge max-[900px]:hidden" aria-hidden />
                <BuiltWithBadge />
            </div>
        </header>
    );
}

/** The board's name, saved for everyone on Enter or blur, and a "New board" button. */
export function BoardTitleControls() {
    const title = useBoardTitle();
    const setBoardTitle = useSetBoardTitle();
    // My edit in progress, with the title it started from. While it exists the field
    // shows my text, so a colleague's rename never wipes what I am typing; when idle
    // the field shows the shared title.
    const [draft, setDraft] = useState<{ readonly start: string; readonly text: string } | null>(null);
    return (
        <>
            <span className="size-[7px] flex-none rounded-full bg-live" title="Synced with Liveblocks" aria-hidden />
            <input
                className="w-56 min-w-0 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-[13px] font-semibold text-ink hover:border-control focus:border-accent"
                aria-label="Board name"
                value={draft?.text ?? title}
                maxLength={40}
                onFocus={() => setDraft({ start: title, text: title })}
                onChange={(event) => setDraft({ start: draft?.start ?? title, text: event.target.value })}
                onBlur={() => {
                    // Save only a real edit, never the stale text of an untouched field.
                    if (draft !== null && draft.text !== draft.start) setBoardTitle(draft.text);
                    setDraft(null);
                }}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') event.currentTarget.blur();
                }}
            />
            <button type="button" className={`${buttonClass()} px-3 py-1 text-xs`} onClick={openNewBoard}>
                New board
            </button>
        </>
    );
}

/** Everyone in the room (me last) and the Invite button. */
export function PeopleControls() {
    const peers = usePeerSummaries();
    const me = useMyProfile();
    const [isInviteOpen, setInviteOpen] = useState(false);
    const hasJoined = me.seat >= 0;
    return (
        <>
            <Tooltip.Provider>
                <div className="flex items-center" role="group" aria-label="People on this board">
                    {peers.map((peer) => (
                        <Roundel
                            key={peer.connectionId}
                            seat={peer.seat}
                            label={peer.name}
                            title={`${peer.name} · ${departmentOf(peer.seat)}`}
                            className="-ml-2 first:ml-0"
                        />
                    ))}
                    {hasJoined && (
                        <Roundel
                            seat={me.seat}
                            label={me.name}
                            title={`${me.name} (you) · ${departmentOf(me.seat)}`}
                            className="-ml-2 first:ml-0"
                        />
                    )}
                </div>
            </Tooltip.Provider>
            {hasJoined && (
                <>
                    <button type="button" className={`${buttonClass('primary')} h-9 px-4 py-0`} onClick={() => setInviteOpen(true)}>
                        Invite
                    </button>
                    <InviteDialog open={isInviteOpen} onOpenChange={setInviteOpen} />
                </>
            )}
        </>
    );
}

function MoonIcon() {
    return (
        <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
    );
}

function SunIcon() {
    return (
        <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx={12} cy={12} r={5} />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
    );
}
