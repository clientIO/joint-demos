/**
 * Joining a board: pick a name and a department. Both go into presence (so peers
 * see them at once) and into session storage (so a reload keeps you at the table).
 */
import * as Dialog from '@radix-ui/react-dialog';
import { useUpdateMyPresence } from '@liveblocks/react/suspense';
import { useState } from 'react';
import { DEPARTMENTS, departmentOf } from '@/model';
import { useMyProfile, useTakenSeats } from '@/presence';
import { NAME_MAX_LENGTH, lastUsedName, saveProfile } from '@/session';
import { buttonClass } from './button-class';
import { Roundel } from './roundel';

const NAME_FIELD_ID = 'pb-join-name';
const DESCRIPTION_ID = 'pb-join-description';
const LABEL_CLASS = 'flex flex-col gap-1 text-[11px] font-bold uppercase tracking-[0.06em] text-subtle';
const FIELD_CLASS =
    'rounded-lg border border-control bg-paper px-2.5 py-2 font-sans text-[13px] font-medium normal-case tracking-normal text-ink focus:border-accent';

/** The first department nobody online sits in, so new people spread over colors. */
function firstFreeSeat(takenSeats: ReadonlySet<number>): number {
    const free = DEPARTMENTS.findIndex((_, seat) => !takenSeats.has(seat));
    return free === -1 ? 0 : free;
}

/** The modal join form, open until this person has a seat. */
export function JoinDialog() {
    const me = useMyProfile();
    // Seats only, so the dialog does not re-render on every peer cursor move.
    const seatsOfPeers = useTakenSeats();
    const updateMyPresence = useUpdateMyPresence();
    const [name, setName] = useState(lastUsedName);
    const [pickedSeat, setPickedSeat] = useState<number | null>(null);
    if (me.seat >= 0) return null;

    const takenSeats = new Set(seatsOfPeers);
    const seat = pickedSeat ?? firstFreeSeat(takenSeats);
    const join = () => {
        const profile = { name: name.trim() || `Guest ${seatsOfPeers.length + 1}`, seat };
        saveProfile(profile);
        updateMyPresence(profile);
    };

    return (
        <Dialog.Root open>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-[oklch(0.2_0.01_260/40%)] backdrop-blur-[2px]" />
                <Dialog.Content
                    className="fixed left-1/2 top-1/2 flex w-[min(400px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-[14px] border border-edge bg-panel p-[22px] shadow-plate"
                    aria-describedby={DESCRIPTION_ID}
                    onOpenAutoFocus={(event: Event) => {
                        event.preventDefault();
                        document.getElementById(NAME_FIELD_ID)?.focus();
                    }}
                    // The dialog closes by joining; hand focus to the board, not to <body>.
                    onCloseAutoFocus={(event: Event) => {
                        event.preventDefault();
                        document.querySelector<HTMLElement>('.pb-scroller')?.focus();
                    }}
                >
                    <Dialog.Title className="m-0 text-[19px] font-extrabold tracking-[0.01em]">Join the table</Dialog.Title>
                    <Dialog.Description id={DESCRIPTION_ID} className="m-0 text-[12.5px] leading-relaxed text-subtle">
                        {seatsOfPeers.length > 0 ? `${seatsOfPeers.length} already here. ` : ''}
                        Your department's color marks every card you add, your cursor and your activity.
                    </Dialog.Description>
                    <div className="flex items-center gap-2.5 pb-0.5 pt-2">
                        <Roundel seat={seat} label={name || departmentOf(seat)} isBig />
                        <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-subtle">{departmentOf(seat)}</span>
                    </div>
                    <label className={LABEL_CLASS}>
                        <span>Your name</span>
                        <input
                            id={NAME_FIELD_ID}
                            className={FIELD_CLASS}
                            value={name}
                            placeholder={`Guest ${seatsOfPeers.length + 1}`}
                            maxLength={NAME_MAX_LENGTH}
                            onChange={(event) => setName(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') join();
                            }}
                        />
                    </label>
                    <label className={LABEL_CLASS}>
                        <span>Department</span>
                        <select
                            className={`${FIELD_CLASS} pb-select`}
                            value={seat}
                            onChange={(event) => setPickedSeat(Number(event.target.value))}
                        >
                            {DEPARTMENTS.map((department, index) => (
                                <option key={department} value={index}>
                                    {department}
                                    {takenSeats.has(index) ? ' (taken)' : ''}
                                </option>
                            ))}
                        </select>
                    </label>
                    <button type="button" className={`${buttonClass('primary')} px-3.5 py-2.5 text-sm`} onClick={join}>
                        Join as {departmentOf(seat)}
                    </button>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
