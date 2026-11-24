/**
 * The right rail: a keyboard way to open any card, quick-add buttons, the inspector
 * for the selected card, who is at the table right now, and the activity feed.
 */
import { useUpdateMyPresence } from '@liveblocks/react/suspense';
import clsx from 'clsx';
import { useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { useAddCard, useEditCard, useRemoveCard, useRemoveFlow } from '@/board/board-actions';
import { CARD_HEIGHT, KIND_LABELS, KINDS, departmentOf, isKind, seatColor } from '@/model';
import { activityLabel, useMyProfile, usePeerSummaries } from '@/presence';
import { useCard, useCards, useFeed, useFlows } from '@/board/board-data';
import { clearSelection, selectCard, useUiState } from '@/ui-state';
import { buttonClass } from './button-class';

const TITLE_CLASS = 'mx-0 mb-0.5 mt-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-subtle';
const EMPTY_CLASS = 'm-0 text-xs text-subtle';
const FIELD_LABEL_CLASS = 'text-[10px] font-bold uppercase tracking-[0.08em] text-subtle';
const FIELD_INPUT_CLASS =
    'w-full rounded-md border border-control bg-paper px-2.5 py-2.5 font-sans text-[13px] text-ink focus:border-accent';
const FIELD_SELECT_CLASS = `${FIELD_INPUT_CLASS} pb-select`;
/** Space between the lowest card and a card added from the panel. */
const STACK_GAP = 36;

/** Enter on a native select does nothing; keyboard users expect it to open the list. */
function openPickerOnEnter(event: KeyboardEvent<HTMLSelectElement>): void {
    const select = event.currentTarget;
    if (event.key !== 'Enter' || !('showPicker' in select)) return;
    event.preventDefault();
    try {
        select.showPicker();
    } catch {
        // Refused outside a user gesture; Space still opens it.
    }
}

/** Cards are pointer targets on the board, so this list is how a keyboard opens one. */
function CardPicker() {
    const selectedCard = useUiState((state) => state.selectedCard);
    const cards = useCards();
    const options = Object.entries(cards).map(([id, card]) => ({ id, label: `${card.title} · ${KIND_LABELS[card.kind]}` }));
    if (options.length === 0) return null;
    return (
        <section aria-label="Cards">
            <h2 className={TITLE_CLASS}>Cards · {options.length}</h2>
            <label className="flex flex-col gap-1">
                <span className={FIELD_LABEL_CLASS}>Open a card</span>
                <select
                    className={FIELD_SELECT_CLASS}
                    value={selectedCard ?? ''}
                    onChange={(event) => (event.target.value === '' ? clearSelection() : selectCard(event.target.value))}
                    onKeyDown={openPickerOnEnter}
                >
                    <option value="">None</option>
                    {options.map((option) => (
                        <option key={option.id} value={option.id}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </label>
        </section>
    );
}

/** One button per kind; the new card lands below the lowest card. */
function QuickAdd() {
    const addCard = useAddCard();
    const cards = Object.values(useCards());
    let x = Infinity;
    let bottom = -Infinity;
    for (const card of cards) {
        x = Math.min(x, card.x);
        bottom = Math.max(bottom, card.y + CARD_HEIGHT);
    }
    const spot = cards.length === 0 ? { x: 40, y: 0 } : { x, y: bottom + STACK_GAP };
    return (
        <section aria-label="Add a card">
            <h2 className={TITLE_CLASS}>Add a card</h2>
            <div className="flex flex-wrap gap-1.5">
                {KINDS.map((kind) => (
                    <button key={kind} type="button" className={`${buttonClass()} px-2.5 py-1 text-[11px]`} onClick={() => addCard(kind, spot.x, spot.y)}>
                        + {KIND_LABELS[kind]}
                    </button>
                ))}
            </div>
            <p className="m-0 mt-1.5 text-[11px] leading-snug text-subtle">Or double-click anywhere on the board.</p>
        </section>
    );
}

/**
 * A text field that saves on blur or Enter, so storage does not change on every
 * keystroke. It saves only what the user actually changed: the field is not
 * refreshed by a colleague's edit (that would wipe a draft mid-typing), so saving
 * an untouched field would write its stale value over their newer one.
 */
function CommitField({
    label,
    value,
    isMultiline = false,
    onCommit,
}: Readonly<{ label: string; value: string; isMultiline?: boolean; onCommit: (next: string) => void }>) {
    // What the field held when it opened (or last saved), not the live value: after a
    // colleague's rename the two differ, and that difference is not my edit.
    const baseline = useRef(value);
    const commitIfEdited = (next: string) => {
        if (next === baseline.current) return;
        baseline.current = next;
        onCommit(next);
    };
    const onKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            commitIfEdited(event.currentTarget.value);
        }
    };
    return (
        <label className="flex flex-col gap-1">
            <span className={FIELD_LABEL_CLASS}>{label}</span>
            {isMultiline ? (
                <textarea
                    className={`${FIELD_INPUT_CLASS} resize-y leading-snug`}
                    rows={3}
                    defaultValue={value}
                    onBlur={(event) => commitIfEdited(event.target.value)}
                    onKeyDown={onKeyDown}
                />
            ) : (
                <input
                    className={FIELD_INPUT_CLASS}
                    type="text"
                    defaultValue={value}
                    onBlur={(event) => commitIfEdited(event.target.value)}
                    onKeyDown={onKeyDown}
                />
            )}
        </label>
    );
}

/** Edits the selected card. While a field has focus, peers see my "editing" frame on it. */
function Inspector({ cardId }: Readonly<{ cardId: string }>) {
    const card = useCard(cardId);
    const cards = useCards();
    const outgoing = Object.entries(useFlows())
        .filter(([, flow]) => flow.source === cardId)
        .map(([id, flow]) => ({ id, target: cards[flow.target]?.title ?? '...' }));
    const mySeat = useMyProfile().seat;
    const editCard = useEditCard();
    const removeCard = useRemoveCard();
    const removeFlow = useRemoveFlow();
    const updateMyPresence = useUpdateMyPresence();
    if (!card) return null;

    return (
        <section aria-label="Selected card">
            <h2 className={TITLE_CLASS}>Selected</h2>
            <div
                className="flex flex-col gap-2 rounded-lg border border-edge bg-paper p-2.5"
                onFocus={() => updateMyPresence({ busy: { cardId, verb: 'editing' }})}
                onBlur={() => updateMyPresence({ busy: null })}
            >
                <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13px] font-bold">{card.title}</span>
                    <span className="flex flex-none items-center gap-1.5 text-[11px] text-subtle">
                        <span className="size-2.5 rounded-full" style={{ background: seatColor(card.seat) }} aria-hidden />
                        {departmentOf(card.seat)}
                    </span>
                </div>
                {/* Uncontrolled on purpose: a colleague's edit must not wipe a draft mid-typing. */}
                <CommitField label="Title" value={card.title} onCommit={(title) => editCard(cardId, { title })} />
                <label className="flex flex-col gap-1">
                    <span className={FIELD_LABEL_CLASS}>Kind</span>
                    <select
                        className={FIELD_SELECT_CLASS}
                        value={card.kind}
                        onChange={(event) => {
                            if (isKind(event.target.value)) editCard(cardId, { kind: event.target.value });
                        }}
                        onKeyDown={openPickerOnEnter}
                    >
                        {KINDS.map((kind) => (
                            <option key={kind} value={kind}>
                                {KIND_LABELS[kind]}
                            </option>
                        ))}
                    </select>
                </label>
                <CommitField
                    label="Detail"
                    value={card.detail}
                    isMultiline
                    onCommit={(detail) => editCard(cardId, { detail })}
                />
                {outgoing.length > 0 && (
                    <div className="flex flex-col gap-1">
                        <span className={FIELD_LABEL_CLASS}>Connections out</span>
                        {outgoing.map((flow) => (
                            <div key={flow.id} className="flex items-center justify-between gap-2 text-xs">
                                <span className="truncate text-subtle">→ {flow.target}</span>
                                <button
                                    type="button"
                                    className="cursor-pointer border-0 bg-transparent p-0 text-[11px] font-semibold text-subtle hover:text-accent"
                                    aria-label={`Remove the connection to ${flow.target}`}
                                    onClick={() => removeFlow(flow.id)}
                                >
                                    remove
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                {card.seat === mySeat && (
                    <button
                        type="button"
                        className={`${buttonClass()} self-start px-2.5 py-1 text-[11px]`}
                        onClick={() => {
                            removeCard(cardId);
                            clearSelection();
                        }}
                    >
                        Remove card
                    </button>
                )}
            </div>
        </section>
    );
}

/** Who is online and what they are doing, me first. */
function Team() {
    const peers = usePeerSummaries();
    const me = useMyProfile();
    return (
        <>
            <h2 className={TITLE_CLASS}>Online · {peers.length + (me.seat >= 0 ? 1 : 0)}</h2>
            <ul className="m-0 flex list-none flex-col p-0">
                {me.seat >= 0 && <PersonRow seat={me.seat} name={`${me.name} · you`} status="here" />}
                {peers.map((peer) => {
                    const activity = activityLabel(peer.verb);
                    return (
                        <PersonRow
                            key={peer.connectionId}
                            seat={peer.seat}
                            name={peer.name}
                            status={activity ?? (peer.hasCursor ? 'on the board' : 'idle')}
                            isActive={activity !== null}
                        />
                    );
                })}
            </ul>
        </>
    );
}

function PersonRow({ seat, name, status, isActive = false }: Readonly<{ seat: number; name: string; status: string; isActive?: boolean }>) {
    return (
        <li className="flex items-center gap-2 border-b border-edge px-0.5 py-1.5">
            <span className="size-2.5 flex-none rounded-full" style={{ background: seatColor(seat) }} aria-hidden />
            <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-xs font-bold">{departmentOf(seat)}</span>
                <span className="truncate text-[11px] text-subtle">{name}</span>
            </span>
            <span className={clsx('text-right text-[10px] uppercase tracking-[0.04em]', isActive ? 'font-bold text-accent' : 'text-subtle')}>
                {status}
            </span>
        </li>
    );
}

/** The shared activity feed, newest first. */
function ActivityFeed() {
    const feed = useFeed();
    return (
        <>
            <h2 className={TITLE_CLASS}>Activity</h2>
            {feed.length === 0 && <p className={EMPTY_CLASS}>Quiet so far. Every card and connection lands here.</p>}
            <ol className="m-0 flex list-none flex-col p-0" aria-live="polite">
                {feed.toReversed().map((row) => (
                    <li
                        key={row.id}
                        className="flex animate-feed items-baseline gap-2 border-b border-dashed border-edge px-0.5 py-1.5 motion-reduce:animate-none"
                    >
                        <span className="size-[7px] flex-none self-center rounded-full" style={{ background: seatColor(row.seat) }} aria-hidden />
                        <span className="flex-1 text-xs leading-[1.45]">{row.text}</span>
                        <time className="font-mono text-[10px] text-subtle" dateTime={new Date(row.at).toISOString()}>
                            {new Date(row.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </time>
                    </li>
                ))}
            </ol>
        </>
    );
}

/** The right rail. */
export function SidePanel() {
    const selectedCard = useUiState((state) => state.selectedCard);
    return (
        <aside
            // Below 900px the rail moves under the board instead of hiding, so the
            // card picker (the keyboard route to a card) stays reachable.
            className="flex w-[312px] min-w-64 flex-col gap-2 overflow-y-auto border-l border-edge bg-panel p-3.5 max-[900px]:max-h-[45%] max-[900px]:w-full max-[900px]:border-l-0 max-[900px]:border-t"
            aria-label="Board panel"
        >
            <CardPicker />
            {selectedCard === null ? <QuickAdd /> : <Inspector key={selectedCard} cardId={selectedCard} />}
            <Team />
            <ActivityFeed />
        </aside>
    );
}
