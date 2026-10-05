import { useState } from 'react';
import { BOARD_TTL_MS, createBoard, useBoards } from '@/state/lobby';
import { writeBoardToUrl } from '@/state/identity';
import { SEAT_COUNT } from '@/model/palette';
import { useStore } from '@/state/store';
import { buttonClass } from './ui';
import { PlaybookMark } from './playbook-mark';

/**
 * The lobby: create a journey board or join one already in flight. Boards
 * are small rooms — at most {@link SEAT_COUNT} department seats — and a
 * board nobody touches for half an hour is retired from this list.
 */

function relativeTime(timestamp: number): string {
    const minutes = Math.round((Date.now() - timestamp) / 60_000);
    if (minutes < 1) return 'just now';
    if (minutes === 1) return '1 min ago';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
}

export function Lobby() {
    const board = useStore((state) => state.board);
    const boards = useBoards();
    const [name, setName] = useState('');

    if (board !== null) return null;

    const open = (id: string, boardName: string) => {
        useStore.getState().setBoard(id);
        writeBoardToUrl(id, boardName);
    };

    const create = () => {
        const meta = createBoard(name);
        setName('');
        open(meta.id, meta.name);
    };

    return (
        <div className="absolute inset-0 z-10 flex items-start justify-center overflow-y-auto bg-paper pt-[12vh]">
            <div className="flex w-[min(520px,calc(100vw-32px))] flex-col gap-5 pb-16">
                <header className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2.5">
                        <PlaybookMark size={24} />
                        <h1 className="m-0 text-[22px] font-extrabold tracking-tight">Playbook</h1>
                    </div>
                    <p className="m-0 text-[13px] leading-relaxed text-subtle">
            Design your team's processes together: every department takes a seat and owns
            its cards, and everyone sees who is working where — live cursors, frames and
            an activity feed.
                    </p>
                </header>

                <section
                    className="flex items-end gap-2 rounded-xl border border-edge bg-panel p-3.5"
                    aria-label="Create a board"
                >
                    <label className="flex min-w-0 flex-1 flex-col gap-1 text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">
                        <span>New board</span>
                        <input
                            className="rounded-lg border border-control bg-paper px-2.5 py-2 font-sans text-[13px] font-medium normal-case tracking-normal text-ink focus:border-accent"
                            value={name}
                            placeholder="Inbound lead intake"
                            maxLength={40}
                            onChange={(event) => setName(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') create();
                            }}
                        />
                    </label>
                    <button type="button" className={`${buttonClass('rush')} py-2`} onClick={create}>
            Create board
                    </button>
                </section>

                <section aria-labelledby="jb-latest-boards" className="flex flex-col gap-2">
                    <h2
                        id="jb-latest-boards"
                        className="m-0 text-[11px] font-extrabold uppercase tracking-[0.14em] text-subtle"
                    >
            Latest boards
                    </h2>
                    {boards.length === 0 && (
                        <p className="m-0 rounded-xl border border-dashed border-edge p-4 text-center text-xs text-subtle">
              None right now. Boards idle for {Math.round(BOARD_TTL_MS / 60_000)} minutes
              retire automatically — create one above.
                        </p>
                    )}
                    <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                        {boards.map((meta) => (
                            <li key={meta.id}>
                                <button
                                    type="button"
                                    className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-control bg-panel px-3.5 py-2.5 text-left hover:border-accent"
                                    onClick={() => open(meta.id, meta.name)}
                                >
                                    <span className="flex min-w-0 flex-col">
                                        <span className="truncate text-[13px] font-bold text-ink">{meta.name}</span>
                                        <span className="text-[11px] text-subtle">
                      active {relativeTime(meta.lastActiveAt)} · up to {SEAT_COUNT} seats
                                        </span>
                                    </span>
                                    <span className="flex-none text-[11px] font-semibold text-accent">Join →</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            </div>
        </div>
    );
}
