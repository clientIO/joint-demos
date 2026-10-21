import { useCell, useCellId } from '@joint/react-plus';
import type { ElementRecord } from '@joint/react-plus';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { CardData } from './derive-cells';
import { seatColor } from '@/model/palette';
import type { Kind } from '@/model/types';
import { KIND_LABELS } from '@/model/types';
import { CARD_HEIGHT, CARD_WIDTH, useStore } from '@/state/store';
import { usePeerHands } from '@/state/use-room';
import { createChangeClock } from './card-change';

/**
 * One card of the playbook: a kind tab tucked over the top edge, an icon
 * chip + title header, the owning department's tinted pill, a hairline
 * divider and a muted subtitle. Presence is drawn into the card itself —
 * a colleague's solid frame (with their name) when they have it open, and
 * their marching-ants ring while they drag it.
 *
 * Double-click renames in place; the input writes back through the shared
 * store so every colleague sees the new title. The card's two model ports
 * (left and right edge) are declared in `derive-cells`; drag one out to draw a
 * flow to another card.
 */

const RADIUS = 14;
const PADDING = 14;
const TITLE_MAX_CHARS = 17;
/** Where the body text starts, below the header row and its divider. */
const BODY_TOP = 64;
const NAME_TAG_MAX_CHARS = 14;
/** The colleague frame sits this far outside the card; the tag this far above it. */
const FRAME_GAP = 6;
const TAG_GAP = 4;
const TAG_HEIGHT = 20;

function tagWidth(person: string): number {
    return truncate(person, NAME_TAG_MAX_CHARS).length * 6 + 16;
}
/** How long a colleague's frame lingers on a card after their hands leave
 * it: just enough to bridge the gap between the last change landing and
 * their presence clearing, so one person frames one card at a time. */
const TOUCH_TTL_MS = 50;

const KIND_GLYPHS: Record<Kind, string> = {
    trigger: '⚡',
    step: '⚙️',
    approval: '✓',
    note: '✎',
};

function truncate(text: string, max: number): string {
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

const isSameSize = (a: { width: number; height: number }, b: { width: number; height: number }) =>
    a.width === b.width && a.height === b.height;

/** Whether a change to `nodeId` is one of my own gestures or edits. */
function isMyChange(nodeId: string): boolean {
    const { selected, editing, me } = useStore.getState();
    return selected === nodeId || editing === nodeId || me.moving === nodeId || me.resizing === nodeId;
}

/**
 * When a colleague last changed this card, read off the cell itself: the
 * selector keeps the last snapshot (position, size, text) and clocks the
 * moment it differs, skipping my own changes. One clock per card, for as
 * long as the card lives.
 */
function useChangedByOthersAt(nodeId: string): number | undefined {
    const [select] = useState(() => createChangeClock(() => isMyChange(nodeId)));
    return useCell<ElementRecord<CardData>, number | undefined>(select);
}

/**
 * Whether `at` lies within the last `windowMs`, re-read the moment it no
 * longer does. The clock is the external system here: a timer wakes the
 * subscriber at the edge of the window, and a stamp already past it reads
 * false from the first render. The stamp is the toucher's clock; a peer
 * clock far behind would read nothing, which this demo accepts.
 */
function useIsWithin(at: number | undefined, windowMs: number): boolean {
    const subscribe = useCallback(
        (onExpire: () => void) => {
            if (at === undefined) return () => {};
            const left = windowMs - (Date.now() - at);
            if (left <= 0) return () => {};
            const timer = setTimeout(onExpire, left);
            return () => clearTimeout(timer);
        },
        [at, windowMs]
    );
    const read = useCallback(() => at !== undefined && Date.now() - at < windowMs, [at, windowMs]);
    return useSyncExternalStore(subscribe, read, read);
}

export function ProcessCard(data: CardData) {
    const cellId = useCellId();
    const id = String(cellId);
    const isEditing = useStore((state) => state.editing === id);
    const isPendingSource = useStore((state) => state.pendingSource === id);
    const isSelected = useStore((state) => state.selected === id);
    // A colleague's hands on the card right now (dragging, resizing, renaming),
    // else the last pair of hands for a moment after a change landed. One
    // frame and name tag for both; live hands run as ants.
    const hands = usePeerHands(id);
    const [lastHands, setLastHands] = useState(hands);
    if (hands !== null && hands !== lastHands) setLastHands(hands);
    const changedAt = useChangedByOthersAt(id);
    const isRecentlyChanged = useIsWithin(changedAt, TOUCH_TTL_MS);
    const frame = hands ?? (isRecentlyChanged ? lastHands : null);
    const isHandled = hands !== null && hands.verb !== 'editing';
    const accent = seatColor(data.ownerSeat);
    const isNote = data.kind === 'note';
    const deptPillWidth = data.ownerDept.length * 5.4 + 14;
    // The live element size — the halo resizes the model and the store echoes
    // it back, so the card must draw whatever size it holds right now.
    const { width, height } = useCell<ElementRecord<CardData>, { width: number; height: number }>(
        (cell) => ({
            width: cell.size?.width ?? CARD_WIDTH,
            height: cell.size?.height ?? CARD_HEIGHT,
        }),
        isSameSize
    );

    return (
        <>
            {/* Kind tab, tucked behind the card's top edge. */}
            <g pointerEvents="none">
                <rect className="jb-kind-tab" x={12} y={-22} width={data.kind.length * 6.6 + 30} height={30} rx={9} />
                <text className="jb-kind-tab-text" x={24} y={-6}>
                    {KIND_LABELS[data.kind]}
                </text>
            </g>

            <rect
                // Armed for a connection, the dashed ring around the card says so on
                // its own; the selection stroke underneath read as a double border.
                className={`jb-card jb-card-${data.kind}${isSelected && !isPendingSource ? ' is-selected' : ''}${isHandled ? ' is-remote-dragged' : ''}`}
                width={width}
                height={height}
                rx={RADIUS}
                ry={RADIUS}
            />

            {/* A colleague's frame and name tag, the tag above the frame's top-right
          corner. The team panel already says who; here the tag is decoration. */}
            {frame !== null && (
                <g pointerEvents="none" aria-hidden>
                    <rect
                        className={isHandled ? 'jb-peer-frame jb-remote-drag' : 'jb-peer-frame'}
                        x={-FRAME_GAP}
                        y={-FRAME_GAP}
                        width={width + FRAME_GAP * 2}
                        height={height + FRAME_GAP * 2}
                        rx={RADIUS + FRAME_GAP}
                        ry={RADIUS + FRAME_GAP}
                        stroke={seatColor(frame.seat)}
                    />
                    <rect
                        className="jb-peer-tag"
                        x={width + FRAME_GAP - tagWidth(frame.person)}
                        y={-FRAME_GAP - TAG_GAP - TAG_HEIGHT}
                        width={tagWidth(frame.person)}
                        height={TAG_HEIGHT}
                        rx={TAG_HEIGHT / 2}
                        fill={seatColor(frame.seat)}
                    />
                    <text
                        className="jb-peer-tag-text"
                        x={width + FRAME_GAP - tagWidth(frame.person) / 2}
                        y={-FRAME_GAP - TAG_GAP - TAG_HEIGHT / 2}
                        textAnchor="middle"
                        dominantBaseline="central"
                    >
                        {truncate(frame.person, NAME_TAG_MAX_CHARS)}
                    </text>
                </g>
            )}

            <g pointerEvents="none">
                {/* Icon chip. */}
                <rect className={`jb-chip jb-chip-${data.kind}`} x={PADDING} y={16} width={26} height={26} rx={8} />
                <text className="jb-chip-glyph" x={PADDING + 13} y={33} textAnchor="middle">
                    {KIND_GLYPHS[data.kind]}
                </text>
                {/* Owning department, in its seat tint. */}
                <rect
                    className="jb-dept-pill"
                    x={width - PADDING - deptPillWidth}
                    y={18}
                    width={deptPillWidth}
                    height={22}
                    rx={11}
                    style={{ fill: `color-mix(in oklch, ${accent} 14%, var(--card-fill))` }}
                />
                <text
                    className="jb-dept-pill-text"
                    x={width - PADDING - deptPillWidth / 2}
                    y={33}
                    textAnchor="middle"
                    style={{ fill: accent }}
                >
                    {data.ownerDept}
                </text>
                {!isNote && (
                    <path
                        className="jb-card-divider"
                        d={`M ${PADDING} 54 H ${width - PADDING}`}
                    />
                )}
                {!isEditing && (
                    <text className="jb-card-title" x={50} y={34}>
                        {truncate(data.title, TITLE_MAX_CHARS + Math.max(0, Math.floor((width - CARD_WIDTH) / 7.5)))}
                    </text>
                )}
                {/* The body wraps and fills whatever room the card has been given;
            only a card too small for its text clips it. */}
                <foreignObject x={PADDING} y={BODY_TOP} width={width - PADDING * 2} height={Math.max(0, height - BODY_TOP - PADDING)}>
                    <div className="jb-card-body">{data.subtitle}</div>
                </foreignObject>
            </g>

            {isEditing && (
                <RenameInput
                    title={data.title}
                    width={width}
                    onCommit={(next) => {
                        useStore.getState().renameCard(id, next);
                        useStore.getState().endRename();
                    }}
                    onCancel={() => useStore.getState().endRename()}
                />
            )}
        </>
    );
}


function RenameInput({
    title,
    width,
    onCommit,
    onCancel,
}: Readonly<{
  title: string;
  width: number;
  onCommit: (title: string) => void;
  onCancel: () => void;
}>) {
    const [draft, setDraft] = useState(title);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.select();
    }, []);

    return (
        <foreignObject x={46} y={15} width={width - 46 - PADDING} height={28}>
            <input
                ref={inputRef}
                className="jb-rename"
                value={draft}
                spellCheck={false}
                aria-label="Title"
                onChange={(event) => setDraft(event.target.value)}
                onBlur={() => onCommit(draft)}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') onCommit(draft);
                    if (event.key === 'Escape') onCancel();
                    event.stopPropagation();
                }}
                onPointerDown={(event) => event.stopPropagation()}
            />
        </foreignObject>
    );
}
