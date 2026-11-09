/**
 * The card palette: a rail of card kinds on the left of the board, built on the
 * headless react-plus `<Stencil>`. The stencil brings the drag-and-drop (preview,
 * drop, invalid-drop bounce), the rail brings the look. Dropping writes a real card
 * to storage; the dragged clone itself is not part of the document, so the
 * controlled cells remove it again.
 */
import { Stencil, usePaperScroller, useStencil } from '@joint/react-plus';
import { useUpdateMyPresence } from '@liveblocks/react/suspense';
import type { KeyboardEvent, PointerEvent } from 'react';
import { CARD_HEIGHT, CARD_WIDTH, KIND_GLYPHS, KIND_LABELS, KINDS, isKind } from '@/model';
import type { Kind } from '@/model';
import { useAddCard } from './board-actions';

/** Where the chip sits on the drag preview. */
const CHIP_SIZE = 26;
const CHIP_X = 14;
const CHIP_Y = (CARD_HEIGHT - CHIP_SIZE) / 2;

/**
 * WORKAROUND: the stencil's drag layer is a `popover` element that react-plus 4.3.4
 * never shows, so the browser keeps it `display: none` and the drag preview is
 * invisible. Show it ourselves when a drag starts and on every move.
 * The class is the stencil's documented styling hook.
 */
function revealDragPreview(): void {
    const layer = document.querySelector('body > .jj-stencil-paper');
    if (!(layer instanceof HTMLElement) || !layer.isConnected || layer.matches(':popover-open')) return;
    try {
        layer.showPopover();
    } catch {
        // No Popover API, or the layer is being torn down: nothing to show.
    }
}

/** The kind a dragged clone carries in its data. */
function kindOf(model: { get: (key: string) => unknown }): Kind {
    const data = model.get('data');
    if (typeof data === 'object' && data !== null && 'kind' in data && typeof data.kind === 'string' && isKind(data.kind)) {
        return data.kind;
    }
    return 'step';
}

/** The drag preview: card-shaped, with the kind's chip and name. */
function DragPreview(data: { readonly kind: Kind }) {
    return (
        <>
            <rect className={`pb-card pb-card-${data.kind}`} width={CARD_WIDTH} height={CARD_HEIGHT} rx={14} ry={14} opacity={0.92} />
            <rect className={`pb-chip pb-chip-${data.kind}`} x={CHIP_X} y={CHIP_Y} width={CHIP_SIZE} height={CHIP_SIZE} rx={8} />
            <text className="pb-chip-glyph" x={CHIP_X + CHIP_SIZE / 2} y={CARD_HEIGHT / 2} textAnchor="middle" dominantBaseline="central">
                {KIND_GLYPHS[data.kind]}
            </text>
            <text className="pb-card-title" x={CHIP_X + CHIP_SIZE + 10} y={CARD_HEIGHT / 2} dominantBaseline="central">
                {KIND_LABELS[data.kind]}
            </text>
        </>
    );
}

function KindTile({ kind }: Readonly<{ kind: Kind }>) {
    const { startCellDrag } = useStencil();
    const { paperScroller } = usePaperScroller();
    const addCard = useAddCard();

    const onPointerDown = (event: PointerEvent) => {
        if (event.button !== 0) return;
        // No preventDefault: the stencil drives its drag on the browser's mouse
        // events, and canceling the pointerdown would suppress them.
        startCellDrag({ id: `palette-${kind}`, type: 'element', size: { width: CARD_WIDTH, height: CARD_HEIGHT }, data: { kind }}, event);
    };

    // Keyboard route: Enter or Space places the card at the center of the view.
    const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        const center = paperScroller?.getVisibleArea().center() ?? { x: 300, y: 300 };
        addCard(kind, center.x - CARD_WIDTH / 2, center.y - CARD_HEIGHT / 2);
    };

    return (
        <button
            type="button"
            aria-label={`Add ${KIND_LABELS[kind].toLowerCase()} card`}
            title="Drag onto the board, or press Enter to place it at the center of the view"
            onPointerDown={onPointerDown}
            onKeyDown={onKeyDown}
            className="flex w-full cursor-grab items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12.5px] text-ink transition-colors hover:bg-paper active:cursor-grabbing"
        >
            <span className={`pb-tile-chip pb-chip-${kind} grid size-7 flex-none place-items-center rounded-lg text-sm`} aria-hidden>
                {KIND_GLYPHS[kind]}
            </span>
            {KIND_LABELS[kind]}
        </button>
    );
}

/** The palette rail. It must render inside `<Diagram>`, which gives it the target paper. */
export function CardPalette() {
    const addCard = useAddCard();
    const updateMyPresence = useUpdateMyPresence();
    return (
        <Stencil
            className="absolute left-3.5 top-1/2 z-10 w-[136px] -translate-y-1/2"
            renderElement={DragPreview}
            onCellDragStart={revealDragPreview}
            // The card in flight is presence: peers see a ghost where it hovers.
            onCellDrag={({ model, dropArea, isValidDrop }) => {
                revealDragPreview();
                updateMyPresence({
                    placing: isValidDrop ? { kind: kindOf(model), x: Math.round(dropArea.x), y: Math.round(dropArea.y) } : null,
                });
            }}
            onCellDragEnd={() => updateMyPresence({ placing: null })}
            onCellDropInvalid={() => updateMyPresence({ placing: null })}
            onCellDrop={({ model }) => {
                updateMyPresence({ placing: null });
                const { x, y } = model.position();
                addCard(kindOf(model), x, y);
            }}
        >
            <div className="select-none rounded-xl border border-edge bg-panel p-1.5 shadow-plate" role="group" aria-label="Card palette">
                <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-subtle">Cards</p>
                {KINDS.map((kind) => (
                    <KindTile key={kind} kind={kind} />
                ))}
            </div>
        </Stencil>
    );
}
