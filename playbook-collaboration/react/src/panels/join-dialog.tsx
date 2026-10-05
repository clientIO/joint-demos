import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';
import { DEPARTMENTS, SEAT_COUNT } from '@/model/palette';
import { NAME_MAX_LENGTH, rememberName, rememberedName, writeBoardToUrl } from '@/state/identity';
import { SYNC_MODE, useStore } from '@/state/store';
import { Roundel } from './top-bar';
import { buttonClass } from './ui';

/**
 * Joining an open board: you take the next free department seat — the board
 * holds at most {@link SEAT_COUNT} people. Your seat's color marks
 * everything you add: cards, cursor, feed rows.
 */

const FIELD_CLASS =
  'flex flex-col gap-1 text-[11px] font-bold uppercase tracking-[0.06em] text-subtle';
const INPUT_CLASS =
  'rounded-lg border border-control bg-paper px-2.5 py-2 font-sans text-[13px] font-medium normal-case tracking-normal text-ink focus:border-accent';

function nextFreeSeat(taken: ReadonlySet<number>): number | null {
    for (let seat = 0; seat < SEAT_COUNT; seat += 1) {
        if (!taken.has(seat)) return seat;
    }
    return null;
}

export function JoinDialog() {
    const joined = useStore((state) => state.joined);
    const board = useStore((state) => state.board);
    const members = useStore((state) => state.members);
    const myId = useStore((state) => state.myId);
    // Until the room's document has arrived there is no telling whether this
    // tab is a returning member, so the dialog waits rather than flash.
    const isHydrating = useStore(
        (state) => SYNC_MODE === 'liveblocks' && state.liveblocks.isStorageLoading
    );
    // The name given on any earlier board is offered again: one click to join.
    const [person, setPerson] = useState(rememberedName);

    // A returning member (a reload, or the board re-opened from the lobby)
    // keeps both seat and name and goes straight back in.
    const returningName = members[myId]?.person;
    useEffect(() => {
        if (board === null || joined || returningName === undefined) return;
        useStore.getState().join(returningName);
    }, [board, joined, returningName]);

    // Newcomers get the next free seat.
    const seat = nextFreeSeat(new Set(Object.values(members).map((member) => member.seat)));
    const teamSize = Object.keys(members).length;

    if (board === null || joined || isHydrating || returningName !== undefined) return null;

    const isFull = seat === null;
    const department = seat === null ? '' : DEPARTMENTS[seat % SEAT_COUNT];

    const commit = () => {
        if (isFull) return;
        const typed = person.trim();
        if (typed !== '') rememberName(typed);
        useStore.getState().join(typed === '' ? `Guest ${teamSize + 1}` : typed);
    };

    return (
        <Dialog.Root open>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-[oklch(0.2_0.01_260/40%)] backdrop-blur-[2px]" />
                <Dialog.Content
                    className="fixed left-1/2 top-1/2 flex w-[min(400px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-[14px] border border-edge bg-panel p-[22px] shadow-plate"
                    aria-describedby="jb-join-copy"
                    onOpenAutoFocus={(event: Event) => {
                        event.preventDefault();
                        (document.getElementById('jb-person') as HTMLInputElement | null)?.focus();
                    }}
                    // The dialog only closes by joining, and the lobby control that
                    // opened it is gone by then — hand focus to the board rather than
                    // letting it fall to <body>.
                    onCloseAutoFocus={(event: Event) => {
                        event.preventDefault();
                        document.querySelector<HTMLElement>('.jb-scroller')?.focus();
                    }}
                >
                    <Dialog.Title className="m-0 text-[19px] font-extrabold tracking-[0.01em]">
                        {isFull ? 'This board is full' : 'Join the table'}
                    </Dialog.Title>
                    <Dialog.Description id="jb-join-copy" className="m-0 text-[12.5px] leading-relaxed text-subtle">
                        {isFull
                            ? `All ${SEAT_COUNT} department seats are taken. Go back to the dashboard and open another board.`
                            : `${teamSize > 0 ? `${teamSize} of ${SEAT_COUNT} seats taken. ` : ''}You get the next free department seat — its color marks every card you add, your cursor and your activity.`}
                    </Dialog.Description>

                    {!isFull && seat !== null && (
                        <>
                            <div className="flex items-center gap-2.5 pb-0.5 pt-2">
                                <Roundel seat={seat} label={person || department} big />
                                <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-subtle">
                                    {department} seat
                                </span>
                            </div>

                            <label className={FIELD_CLASS}>
                                <span>Your name</span>
                                <input
                                    id="jb-person"
                                    className={INPUT_CLASS}
                                    value={person}
                                    placeholder={`Guest ${teamSize + 1}`}
                                    maxLength={NAME_MAX_LENGTH}
                                    onChange={(event) => setPerson(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') commit();
                                    }}
                                />
                            </label>

                            <button
                                type="button"
                                className={`${buttonClass('rush')} px-3.5 py-2.5 text-sm`}
                                onClick={commit}
                            >
                Join as {department}
                            </button>
                        </>
                    )}
                    {isFull && (
                        <button
                            type="button"
                            className={`${buttonClass()} px-3.5 py-2.5 text-sm`}
                            onClick={() => {
                                useStore.getState().setBoard(null);
                                writeBoardToUrl(null);
                            }}
                        >
              Back to the dashboard
                        </button>
                    )}

                    <p className="m-0 text-[11px] leading-normal text-subtle">
                        {SYNC_MODE === 'liveblocks'
                            ? 'Live board — share this URL to map together.'
                            : 'Local board: open this page in a second tab to map together — no account needed. Set VITE_LIVEBLOCKS_PUBLIC_KEY to go online.'}
                    </p>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
