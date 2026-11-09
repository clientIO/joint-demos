/**
 * How one card is drawn (the paper's `renderElement`): a kind tab over the top
 * edge, an icon chip and title, the owning department's pill and the detail text.
 * A colleague working on the card adds their frame and name tag; while they drag
 * or resize it, the frame runs as marching ants.
 */
import { useCell, useCellId } from '@joint/react-plus';
import { useUpdateMyPresence } from '@liveblocks/react/suspense';
import type { ElementRecord } from '@joint/react-plus';
import { useEffect, useRef, useState } from 'react';
import { CARD_HEIGHT, CARD_WIDTH, KIND_GLYPHS, KIND_LABELS, departmentOf, seatColor } from '@/model';
import { usePeerOnCard } from '@/presence';
import { setRenamingCard, useUiState } from '@/ui-state';
import { useEditCard } from './board-actions';
import type { CardData } from './to-cells';

const RADIUS = 14;
const PADDING = 14;
const TITLE_MAX_CHARS = 17;
/** Roughly how many pixels one more title character needs on a widened card. */
const TITLE_CHAR_WIDTH = 7.5;
/** Where the detail text starts, below the header row and its divider. */
const BODY_TOP = 64;
const NAME_TAG_MAX_CHARS = 14;
/** The colleague frame sits this far outside the card; the name tag this far above it. */
const FRAME_GAP = 6;
const TAG_GAP = 4;
const TAG_HEIGHT = 20;

function truncate(text: string, max: number): string {
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function tagWidth(name: string): number {
    return truncate(name, NAME_TAG_MAX_CHARS).length * 6 + 16;
}

const isSameSize = (a: { width: number; height: number }, b: { width: number; height: number }) =>
    a.width === b.width && a.height === b.height;

/** One playbook card. */
export function PlaybookCard(data: CardData) {
    const cardId = String(useCellId());
    const isRenaming = useUiState((state) => state.renamingCard === cardId);
    const isSelected = useUiState((state) => state.selectedCard === cardId && state.connectFrom !== cardId);
    const peer = usePeerOnCard(cardId);
    const editCard = useEditCard();
    // The live size: the resize handles change the graph before storage echoes it back.
    const { width, height } = useCell<ElementRecord<CardData>, { width: number; height: number }>(
        (cell) => ({ width: cell.size?.width ?? CARD_WIDTH, height: cell.size?.height ?? CARD_HEIGHT }),
        isSameSize
    );
    const isPeerHandling = peer !== null && peer.verb !== 'editing';
    const accent = seatColor(data.seat);
    const department = departmentOf(data.seat);
    const departmentPillWidth = department.length * 5.4 + 14;
    const titleMaxChars = TITLE_MAX_CHARS + Math.max(0, Math.floor((width - CARD_WIDTH) / TITLE_CHAR_WIDTH));

    const cardClass = ['pb-card', `pb-card-${data.kind}`];
    if (isSelected) cardClass.push('is-selected');
    if (isPeerHandling) cardClass.push('is-peer-handled');

    return (
        <>
            <g pointerEvents="none">
                <rect className="pb-kind-tab" x={12} y={-22} width={data.kind.length * 6.6 + 30} height={30} rx={9} />
                <text className="pb-kind-tab-text" x={24} y={-6}>
                    {KIND_LABELS[data.kind]}
                </text>
            </g>

            <rect className={cardClass.join(' ')} width={width} height={height} rx={RADIUS} ry={RADIUS} />

            {peer !== null && (
                <g pointerEvents="none" aria-hidden>
                    <rect
                        className={isPeerHandling ? 'pb-peer-frame pb-marching-ants' : 'pb-peer-frame'}
                        x={-FRAME_GAP}
                        y={-FRAME_GAP}
                        width={width + FRAME_GAP * 2}
                        height={height + FRAME_GAP * 2}
                        rx={RADIUS + FRAME_GAP}
                        ry={RADIUS + FRAME_GAP}
                        stroke={seatColor(peer.seat)}
                    />
                    <rect
                        x={width + FRAME_GAP - tagWidth(peer.name)}
                        y={-FRAME_GAP - TAG_GAP - TAG_HEIGHT}
                        width={tagWidth(peer.name)}
                        height={TAG_HEIGHT}
                        rx={TAG_HEIGHT / 2}
                        fill={seatColor(peer.seat)}
                    />
                    <text
                        className="pb-peer-tag-text"
                        x={width + FRAME_GAP - tagWidth(peer.name) / 2}
                        y={-FRAME_GAP - TAG_GAP - TAG_HEIGHT / 2}
                        textAnchor="middle"
                        dominantBaseline="central"
                    >
                        {truncate(peer.name, NAME_TAG_MAX_CHARS)}
                    </text>
                </g>
            )}

            <g pointerEvents="none">
                <rect className={`pb-chip pb-chip-${data.kind}`} x={PADDING} y={16} width={26} height={26} rx={8} />
                <text className="pb-chip-glyph" x={PADDING + 13} y={33} textAnchor="middle">
                    {KIND_GLYPHS[data.kind]}
                </text>
                <rect
                    x={width - PADDING - departmentPillWidth}
                    y={18}
                    width={departmentPillWidth}
                    height={22}
                    rx={11}
                    style={{ fill: `color-mix(in oklch, ${accent} 14%, var(--card-fill))` }}
                />
                <text
                    className="pb-department-pill-text"
                    x={width - PADDING - departmentPillWidth / 2}
                    y={33}
                    textAnchor="middle"
                    style={{ fill: accent }}
                >
                    {department}
                </text>
                {data.kind !== 'note' && <path className="pb-card-divider" d={`M ${PADDING} 54 H ${width - PADDING}`} />}
                {!isRenaming && (
                    <text className="pb-card-title" x={50} y={34}>
                        {truncate(data.title, titleMaxChars)}
                    </text>
                )}
                <foreignObject x={PADDING} y={BODY_TOP} width={width - PADDING * 2} height={Math.max(0, height - BODY_TOP - PADDING)}>
                    <div className="pb-card-body">{data.detail}</div>
                </foreignObject>
            </g>

            {isRenaming && (
                <TitleInput
                    cardId={cardId}
                    title={data.title}
                    width={width}
                    onDone={(title) => {
                        if (title !== null) editCard(cardId, { title });
                        setRenamingCard(null);
                    }}
                />
            )}
        </>
    );
}

/**
 * The in-place title editor. While it is open my presence says "editing" this card,
 * so colleagues see my frame on it.
 */
function TitleInput({
    cardId,
    title,
    width,
    onDone,
}: Readonly<{
    cardId: string;
    title: string;
    width: number;
    /** The new title, or `null` when the edit was canceled. */
    onDone: (title: string | null) => void;
}>) {
    // The title when the editor opened; `title` itself follows colleagues' renames.
    const [initialTitle] = useState(title);
    const [draft, setDraft] = useState(title);
    const inputRef = useRef<HTMLInputElement>(null);
    // Esc closes the field, and the browser then blurs it; the blur must not save.
    const isClosedRef = useRef(false);
    const updateMyPresence = useUpdateMyPresence();

    useEffect(() => {
        inputRef.current?.select();
    }, []);

    useEffect(() => {
        updateMyPresence({ busy: { cardId, verb: 'editing' }});
        return () => updateMyPresence({ busy: null });
    }, [cardId, updateMyPresence]);

    // Only a real edit is saved: an unchanged title could be stale, since a colleague
    // may have renamed the card while this field was open.
    const close = (result: string | null) => {
        if (isClosedRef.current) return;
        isClosedRef.current = true;
        onDone(result === initialTitle ? null : result);
    };

    return (
        <foreignObject x={46} y={15} width={width - 46 - PADDING} height={28}>
            <input
                ref={inputRef}
                className="pb-title-input"
                value={draft}
                spellCheck={false}
                aria-label="Title"
                onChange={(event) => setDraft(event.target.value)}
                onBlur={() => close(draft)}
                onKeyDown={(event) => {
                    // Keep the board's own shortcuts (Delete, Esc) out of the text field.
                    event.stopPropagation();
                    if (event.key === 'Enter') close(draft);
                    if (event.key === 'Escape') close(null);
                }}
                onPointerDown={(event) => event.stopPropagation()}
            />
        </foreignObject>
    );
}
