import * as Tooltip from '@radix-ui/react-tooltip';
import clsx from 'clsx';
import { useState } from 'react';
import { seatColor } from '@/model/palette';
import { useBoards } from '@/state/lobby';
import { writeBoardToUrl } from '@/state/identity';
import { SYNC_MODE, useStore } from '@/state/store';
import { useOthers } from '@/state/use-room';
import { BuiltWithJointJs } from './built-with-jointjs';
import { InviteDialog } from './invite-dialog';
import { buttonClass } from './ui';
import { PlaybookMark } from './playbook-mark';

/**
 * The header: wordmark, a way back to the dashboard and the open board's
 * name; on the right the team's avatar roundels (everyone in the room, me
 * last) beside Invite, then the theme toggle and the JointJS mark. All
 * identity color comes from department seats.
 */

export function Roundel({
    seat,
    label,
    title,
    big,
    className,
}: Readonly<{ seat: number; label: string; title?: string; big?: boolean; className?: string }>) {
    const roundelClass = clsx(
        'inline-flex items-center justify-center rounded-full border-2 border-panel font-semibold',
        big ? 'size-11 border-edge text-[19px]' : 'size-9 text-[13px]',
        className
    );
    const roundelStyle = { background: seatColor(seat), color: 'var(--seat-ink)' };
    const initial = label.slice(0, 1).toUpperCase();
    // One letter means nothing to a screen reader: hide a roundel whose
    // caption already sits beside it.
    if (title === undefined) {
        return (
            <span className={roundelClass} style={roundelStyle} aria-hidden>
                {initial}
            </span>
        );
    }
    // A named roundel is a button: the name comes up from the keyboard too,
    // and only a widget may sit in the focus order.
    const roundel = (
        <button type="button" className={clsx(roundelClass, 'cursor-default p-0')} style={roundelStyle} aria-label={title}>
            {initial}
        </button>
    );
    // A real tooltip, not the browser's slow title: the full name and
    // department come up on hover and on focus.
    return (
        <Tooltip.Root delayDuration={150}>
            <Tooltip.Trigger asChild>{roundel}</Tooltip.Trigger>
            <Tooltip.Portal>
                <Tooltip.Content
                    side="bottom"
                    sideOffset={6}
                    className="z-30 rounded-lg border border-edge bg-panel px-2.5 py-1.5 text-xs font-semibold text-ink shadow-plate"
                >
                    {title}
                    <Tooltip.Arrow className="fill-panel" />
                </Tooltip.Content>
            </Tooltip.Portal>
        </Tooltip.Root>
    );
}

function MoonIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            width={16}
            height={16}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
        >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
    );
}

function SunIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            width={16}
            height={16}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
        >
            <circle cx={12} cy={12} r={5} />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
    );
}

export function TopBar({
    isDark,
    onToggleTheme,
}: Readonly<{ isDark: boolean; onToggleTheme: () => void }>) {
    const me = useStore((state) => state.me);
    const joined = useStore((state) => state.joined);
    const board = useStore((state) => state.board);
    const title = useStore((state) => state.title);
    const boards = useBoards();
    const others = useOthers();
    // The shared document names the board; this browser's lobby is the
    // fallback while the room is still loading.
    const boardName = title || (boards.find((candidate) => candidate.id === board)?.name ?? board ?? '');
    // Invite opens the share dialog (the pattern people know from YouTube's
    // Share): the link is selected on open and Copy is the one action.
    const [isInviteOpen, setInviteOpen] = useState(false);

    return (
        <header className="flex items-center justify-between gap-4 border-b border-edge bg-panel px-4 py-2">
            <div className="flex min-w-0 items-center gap-3">
                <PlaybookMark size={20} />
                <h1 className="m-0 text-[15px] font-extrabold tracking-tight">Playbook</h1>
                {board !== null && (
                    <>
                        <button
                            type="button"
                            className={`${buttonClass()} px-3 py-1 text-xs`}
                            onClick={() => {
                                useStore.getState().setBoard(null);
                                writeBoardToUrl(null);
                            }}
                        >
              Dashboard
                        </button>
                        <span className="flex min-w-0 items-center gap-2 text-[13px] font-semibold text-ink">
                            <span
                                className={clsx(
                                    'size-[7px] flex-none rounded-full',
                                    SYNC_MODE === 'liveblocks' ? 'bg-live' : 'bg-accent'
                                )}
                                title={
                                    SYNC_MODE === 'liveblocks'
                                        ? 'Synced with Liveblocks'
                                        : 'Local board — open a second tab to collaborate'
                                }
                                aria-hidden
                            />
                            <span className="max-w-56 truncate">{boardName}</span>
                        </span>
                    </>
                )}
            </div>


            {/* One row, one height: every control in this cluster is 36px tall,
          12px apart; the hairline sets the brand mark off from the controls. */}
            <div className="flex items-center gap-3">
                <Tooltip.Provider>
                    <div
                        className="flex items-center"
                        role="group"
                        aria-label="People on this board"
                    >
                        {others.map((colleague) => (
                            <Roundel
                                key={colleague.id}
                                seat={colleague.presence.seat}
                                label={colleague.presence.person}
                                title={`${colleague.presence.person} · ${colleague.presence.department}`}
                                className="-ml-2 first:ml-0"
                            />
                        ))}
                        {joined && (
                            <Roundel
                                seat={me.seat}
                                label={me.person}
                                title={`${me.person} (you) · ${me.department}`}
                                className="-ml-2 first:ml-0"
                            />
                        )}
                    </div>
                </Tooltip.Provider>
                {board !== null && joined && (
                    <>
                        <button
                            type="button"
                            className={`${buttonClass('rush')} h-9 px-4 py-0`}
                            onClick={() => setInviteOpen(true)}
                        >
              Invite
                        </button>
                        <InviteDialog
                            open={isInviteOpen}
                            boardId={board}
                            boardName={boardName}
                            onOpenChange={setInviteOpen}
                        />
                    </>
                )}
                <button
                    type="button"
                    className={buttonClass('icon')}
                    aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
                    onClick={onToggleTheme}
                >
                    {isDark ? <MoonIcon /> : <SunIcon />}
                </button>
                <span className="h-5 w-px bg-edge max-[900px]:hidden" aria-hidden />
                <BuiltWithJointJs />
            </div>
        </header>
    );
}
