import clsx from 'clsx';
import type { KeyboardEvent } from 'react';
import { DEPARTMENTS, SEAT_COUNT, seatColor } from '@/model/palette';
import type { Kind, Member, NodeId, Presence } from '@/model/types';
import { KIND_LABELS, KINDS } from '@/model/types';
import { useStore } from '@/state/store';
import { useOthers } from '@/state/use-room';
import { buttonClass } from './ui';

/**
 * The right rail: the inspector for the selected card, quick-add buttons,
 * the team roster with live verbs, and the activity feed — the "who does
 * what" ledger of the board.
 */

const TITLE_CLASS =
  'mx-0 mb-0.5 mt-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-subtle';
const EMPTY_CLASS = 'm-0 text-xs text-subtle';
const FIELD_LABEL_CLASS = 'text-[10px] font-bold uppercase tracking-[0.08em] text-subtle';
const FIELD_INPUT_CLASS =
  'w-full rounded-md border border-control bg-paper px-2.5 py-2.5 font-sans text-[13px] text-ink focus:border-accent';
/* Own chevron with a real right margin; the native one sits on the border. */
const FIELD_SELECT_CLASS = `${FIELD_INPUT_CLASS} jb-select`;

/**
 * Enter on a native <select> does nothing; keyboard users expect it to open
 * the list the way Space does. `showPicker` is Chrome 121+ / Safari 17.4+,
 * hence the guard.
 */
function openPickerOnEnter(event: KeyboardEvent<HTMLSelectElement>): void {
    const select = event.currentTarget;
    if (event.key !== 'Enter' || !('showPicker' in select)) return;
    event.preventDefault();
    try {
        select.showPicker();
    } catch {
    // Refused outside a user gesture or in a cross-origin frame; Space still opens it.
    }
}

function doingLabel(presence: Presence | undefined, isMe: boolean): string {
    if (isMe) return 'you';
    if (!presence) return 'away';
    switch (presence.doing) {
        case 'mapping':
            return 'mapping';
        case 'moving':
            return 'moving a card';
        case 'resizing':
            return 'resizing a card';
        case 'editing':
            return 'editing a card';
        default:
            return presence.cursor ? 'on the board' : 'idle';
    }
}

/**
 * The always-available way to add cards: one button per kind, shown while
 * nothing is selected. The canvas double-click adds a step in place.
 */
function QuickAdd() {
    const joined = useStore((state) => state.joined);
    const hasSelection = useStore((state) => state.selected !== null);
    if (!joined || hasSelection) return null;
    return (
        <section aria-label="Add a card">
            <h2 className={TITLE_CLASS}>Add a card</h2>
            <div className="flex flex-wrap gap-1.5">
                {KINDS.map((kind) => (
                    <button
                        key={kind}
                        type="button"
                        className={`${buttonClass()} px-2.5 py-1 text-[11px]`}
                        onClick={() => useStore.getState().quickAdd(kind)}
                    >
            + {KIND_LABELS[kind]}
                    </button>
                ))}
            </div>
            <p className="m-0 mt-1.5 text-[11px] leading-snug text-subtle">
        Or double-click anywhere on the board.
            </p>
        </section>
    );
}

/**
 * The keyboard route into the inspector: the canvas cards are pointer targets
 * only, so this list is how a card gets selected without a mouse.
 */
function CardPicker() {
    const joined = useStore((state) => state.joined);
    const nodes = useStore((state) => state.nodes);
    const selected = useStore((state) => state.selected);
    const cards = Object.values(nodes);
    if (!joined || cards.length === 0) return null;
    const value = selected !== null && selected in nodes ? selected : '';
    return (
        <section aria-label="Cards">
            <h2 className={TITLE_CLASS}>Cards · {cards.length}</h2>
            <label className="flex flex-col gap-1">
                <span className={FIELD_LABEL_CLASS}>Open a card</span>
                <select
                    className={FIELD_SELECT_CLASS}
                    value={value}
                    onChange={(event) => {
                        const id = event.target.value;
                        if (id === '') useStore.getState().clearGesture();
                        else useStore.getState().selectCard(id);
                    }}
                    onKeyDown={openPickerOnEnter}
                >
                    <option value="">None</option>
                    {cards.map((card) => (
                        <option key={card.id} value={card.id}>
                            {card.title} · {KIND_LABELS[card.kind]}
                        </option>
                    ))}
                </select>
            </label>
        </section>
    );
}

/**
 * A text field that commits on blur or Enter — the shared document must not
 * churn on every keystroke.
 */
function CommitField({
    label,
    nodeId,
    value,
    onCommit,
    isMultiline = false,
}: Readonly<{
  label: string;
  nodeId: NodeId;
  value: string;
  onCommit: (next: string) => void;
  /** A taller, wrapping field for the card's detail text. */
  isMultiline?: boolean;
}>) {
    const onKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            onCommit(event.currentTarget.value);
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
                    // Keyed on the id alone: a colleague's concurrent edit must not
                    // remount the field and wipe a draft mid-typing.
                    key={nodeId}
                    onBlur={(event) => onCommit(event.target.value)}
                    onKeyDown={onKeyDown}
                />
            ) : (
                <input
                    className={FIELD_INPUT_CLASS}
                    type="text"
                    defaultValue={value}
                    key={nodeId}
                    onBlur={(event) => onCommit(event.target.value)}
                    onKeyDown={onKeyDown}
                />
            )}
        </label>
    );
}

function Inspector() {
    const selected = useStore((state) => state.selected);
    const node = useStore((state) => (state.selected === null ? undefined : state.nodes[state.selected]));
    const flows = useStore((state) => state.flows);
    const nodes = useStore((state) => state.nodes);
    const members = useStore((state) => state.members);
    const myId = useStore((state) => state.myId);
    if (selected === null || !node) return null;

    const outgoing = Object.values(flows).filter((flow) => flow.from === node.id);
    const isMine = node.owner === myId;
    const ownerSeat = members[node.owner]?.seat ?? 0;

    return (
        <section aria-label="Selected card">
            <h2 className={TITLE_CLASS}>Selected</h2>
            {/* Focus bubbles: while any field here holds it, the room sees my hands
          on the card, the way a rename in place or a drag shows. */}
            <div
                className="flex flex-col gap-2 rounded-lg border border-edge bg-paper p-2.5"
                onFocus={() => useStore.getState().setEditingHands(node.id)}
                onBlur={() => useStore.getState().setEditingHands(null)}
            >
                <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13px] font-bold">{node.title}</span>
                    <span className="flex flex-none items-center gap-1.5 text-[11px] text-subtle">
                        <span
                            className="size-2.5 rounded-full"
                            style={{ background: seatColor(ownerSeat) }}
                            aria-hidden
                        />
                        {DEPARTMENTS[ownerSeat % SEAT_COUNT]}
                    </span>
                </div>
                <CommitField
                    label="Title"
                    nodeId={node.id}
                    value={node.title}
                    onCommit={(title) => useStore.getState().renameCard(node.id, title)}
                />
                <label className="flex flex-col gap-1">
                    <span className={FIELD_LABEL_CLASS}>Kind</span>
                    <select
                        className={FIELD_SELECT_CLASS}
                        value={node.kind}
                        onChange={(event) => useStore.getState().setKind(node.id, event.target.value as Kind)}
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
                    nodeId={node.id}
                    value={node.subtitle}
                    onCommit={(subtitle) => useStore.getState().setSubtitle(node.id, subtitle)}
                    isMultiline
                />
                {outgoing.length > 0 && (
                    <div className="flex flex-col gap-1">
                        <span className={FIELD_LABEL_CLASS}>Connections out</span>
                        {outgoing.map((flow) => (
                            <div key={flow.id} className="flex items-center justify-between gap-2 text-xs">
                                <span className="truncate text-subtle">→ {nodes[flow.to]?.title ?? '…'}</span>
                                <button
                                    type="button"
                                    className="cursor-pointer border-0 bg-transparent p-0 text-[11px] font-semibold text-subtle hover:text-accent"
                                    aria-label={`Remove the connection to ${nodes[flow.to]?.title ?? 'a removed card'}`}
                                    onClick={() => useStore.getState().removeFlow(flow.id)}
                                >
                  remove
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                {isMine && (
                    <button
                        type="button"
                        className={`${buttonClass()} self-start px-2.5 py-1 text-[11px]`}
                        onClick={() => useStore.getState().removeCard(node.id)}
                    >
            Remove card
                    </button>
                )}
            </div>
        </section>
    );
}

function MemberRow({
    member,
    presence,
    isMe,
}: Readonly<{ member: Member; presence: Presence | undefined; isMe: boolean }>) {
    const isActive = presence !== undefined && presence.doing !== 'idle' && !isMe;
    return (
        <li className="flex items-center gap-2 border-b border-edge px-0.5 py-1.5">
            <span
                className="size-2.5 flex-none rounded-full"
                style={{ background: seatColor(member.seat) }}
                aria-hidden
            />
            <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-xs font-bold">
                    {DEPARTMENTS[member.seat % SEAT_COUNT]}
                </span>
                <span className="truncate text-[11px] text-subtle">
                    {member.person}
                    {isMe ? ' · you' : ''}
                </span>
            </span>
            <span
                className={clsx(
                    'text-right text-[10px] uppercase tracking-[0.04em]',
                    isActive ? 'font-bold text-accent' : 'text-subtle'
                )}
            >
                {doingLabel(presence, isMe)}
            </span>
        </li>
    );
}

export function TeamPanel() {
    const members = useStore((state) => state.members);
    const feed = useStore((state) => state.feed);
    const myId = useStore((state) => state.myId);
    const others = useOthers();

    // Deliberately NOT subscribed to `me`: my own row always reads "you", and
    // `me` changes ~60/s while the pointer moves over the canvas.
    const rows = Object.values(members).sort((a, b) => a.seat - b.seat);
    const presenceBySeat = new Map<number, Presence>();
    for (const colleague of others) presenceBySeat.set(colleague.presence.seat, colleague.presence);

    return (
        <aside
            className="flex w-[312px] min-w-64 flex-col gap-2 overflow-y-auto border-l border-edge bg-panel p-3.5 max-[900px]:hidden"
            aria-label="Board panel"
        >
            <CardPicker />
            <QuickAdd />
            <Inspector />

            <h2 className={TITLE_CLASS}>Team · {rows.length}/{SEAT_COUNT} seats</h2>
            {rows.length === 0 && <p className={EMPTY_CLASS}>Nobody at the table yet.</p>}
            <ul className="m-0 flex list-none flex-col p-0">
                {rows.map((member) => (
                    <MemberRow
                        key={member.id}
                        member={member}
                        presence={member.id === myId ? undefined : presenceBySeat.get(member.seat)}
                        isMe={member.id === myId}
                    />
                ))}
            </ul>

            <h2 className={TITLE_CLASS}>Activity</h2>
            {feed.length === 0 && (
                <p className={EMPTY_CLASS}>Quiet so far. Every card and connection lands here.</p>
            )}
            <ol className="m-0 flex list-none flex-col p-0" aria-live="polite">
                {[...feed].reverse().map((row) => (
                    <li
                        key={row.id}
                        className="flex animate-feed items-baseline gap-2 border-b border-dashed border-edge px-0.5 py-1.5 motion-reduce:animate-none"
                    >
                        <span
                            className="size-[7px] flex-none self-center rounded-full"
                            style={{ background: seatColor(row.seat) }}
                            aria-hidden
                        />
                        <span className="flex-1 text-xs leading-[1.45]">{row.text}</span>
                        <time
                            className="font-mono text-[10px] text-subtle"
                            dateTime={new Date(row.at).toISOString()}
                        >
                            {new Date(row.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </time>
                    </li>
                ))}
            </ol>
        </aside>
    );
}
