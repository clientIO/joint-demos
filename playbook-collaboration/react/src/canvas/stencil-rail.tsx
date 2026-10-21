import { Stencil, usePaperScroller, useStencil } from '@joint/react-plus';
import type { KeyboardEvent, PointerEvent } from 'react';
import { KINDS, KIND_LABELS } from '@/model/types';
import type { Kind } from '@/model/types';
import { CARD_HEIGHT, CARD_WIDTH, useStore } from '@/state/store';

/**
 * The card palette — a left rail built on the HEADLESS react-plus <Stencil>:
 * the component brings JointJS's drag-and-drop machinery (clone preview,
 * drop animation, invalid-drop bounce), the rail brings the UI. Drag a kind
 * onto the board to place it there; Enter or Space places it at the center
 * of the view. The dropped ghost cell never survives: `addCard` commits the
 * real card to the shared store and the controlled cell sync replaces it.
 */

const KIND_GLYPHS: Record<Kind, string> = {
    trigger: '⚡',
    step: '⚙️',
    approval: '✓',
    note: '✎',
};

/**
 * WORKAROUND — react-plus `StencilView.startDragging` inlines the upstream
 * `ui.Stencil#startDragging`/`preparePaperForDragging` pair (to defer sizing
 * until the React portal has rendered) but drops the upstream `showPopover()`
 * promotion. The drag paper still carries `popover="manual"`, and the browser
 * keeps a never-shown popover at `display: none` — so the drag ghost renders
 * fully yet stays invisible. Re-promote it ourselves once the drag starts
 * (and on every drag move, in case anything closes it mid-flight).
 */
function revealDragGhost(): void {
    const layer = document.querySelector('body > .jj-stencil-paper');
    if (layer instanceof HTMLElement && layer.isConnected && !layer.matches(':popover-open')) {
        try {
            layer.showPopover();
        } catch {
            // Popover API unavailable or the layer is mid-teardown — nothing to do.
        }
    }
}

/** The kind a dragged clone carries. */
function kindOf(model: { get: (key: string) => unknown }): Kind {
    return (model.get('data') as { kind?: Kind } | undefined)?.kind ?? 'step';
}

/** The chip the card header carries, so the ghost reads as the card it becomes. */
const CHIP_SIZE = 26;
const CHIP_X = 14;
const CHIP_Y = (CARD_HEIGHT - CHIP_SIZE) / 2;

/**
 * The drag preview: a card-shaped ghost with the kind's chip and name on one
 * row, centred, the same chip the rail tile and the card header show.
 */
function DragPreview(data: { readonly kind: Kind }) {
    return (
        <>
            <rect
                className={`jb-card jb-card-${data.kind}`}
                width={CARD_WIDTH}
                height={CARD_HEIGHT}
                rx={14}
                ry={14}
                opacity={0.92}
            />
            <rect
                className={`jb-chip jb-chip-${data.kind}`}
                x={CHIP_X}
                y={CHIP_Y}
                width={CHIP_SIZE}
                height={CHIP_SIZE}
                rx={8}
            />
            <text
                className="jb-chip-glyph"
                x={CHIP_X + CHIP_SIZE / 2}
                y={CARD_HEIGHT / 2}
                textAnchor="middle"
                dominantBaseline="central"
            >
                {KIND_GLYPHS[data.kind]}
            </text>
            <text
                className="jb-card-title"
                x={CHIP_X + CHIP_SIZE + 10}
                y={CARD_HEIGHT / 2}
                dominantBaseline="central"
            >
                {KIND_LABELS[data.kind]}
            </text>
        </>
    );
}

function KindTile({ kind }: Readonly<{ kind: Kind }>) {
    const { startCellDrag } = useStencil();
    const { paperScroller } = usePaperScroller();

    const onPointerDown = (event: PointerEvent) => {
        if (event.button !== 0) return;
        // No preventDefault: the underlying ui.Stencil drives its drag on the
        // browser's compatibility mouse events; canceling the pointerdown would
        // suppress them and freeze the drag. `select-none` on the rail handles
        // text selection instead.
        startCellDrag(
            {
                id: `drop-${kind}`,
                type: 'element',
                size: { width: CARD_WIDTH, height: CARD_HEIGHT },
                data: { kind },
            },
            event
        );
    };

    const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        const area = paperScroller?.getVisibleArea();
        const center = area ? area.center() : { x: 300, y: 300 };
        useStore.getState().addCard(kind, center.x - CARD_WIDTH / 2, center.y - CARD_HEIGHT / 2);
    };

    return (
        <button
            type="button"
            aria-label={`Add ${KIND_LABELS[kind].toLowerCase()} card`}
            title="Drag onto the board, or press Enter to place it at the centre of the view"
            onPointerDown={onPointerDown}
            onKeyDown={onKeyDown}
            className="flex w-full cursor-grab items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12.5px] text-ink transition-colors hover:bg-paper active:cursor-grabbing"
        >
            <span
                className={`jb-tile-chip jb-chip-${kind} grid size-7 flex-none place-items-center rounded-lg text-sm`}
                aria-hidden
            >
                {KIND_GLYPHS[kind]}
            </span>
            {KIND_LABELS[kind]}
        </button>
    );
}

/** The palette rail; hidden until the member has taken a seat. */
export function StencilRail() {
    const joined = useStore((state) => state.joined);
    if (!joined) return null;
    return (
    // The <Stencil> host must live inside <Diagram> (it resolves the target
    // paper from context).
        <Stencil
            className="absolute left-3.5 top-1/2 z-10 w-[136px] -translate-y-1/2"
            renderElement={DragPreview}
            onCellDragStart={revealDragGhost}
            // The card in flight is presence: colleagues see a ghost where it
            // hovers, and nothing while it is off the board (over the rail).
            onCellDrag={({ model, dropArea, isValidDrop }) => {
                revealDragGhost();
                useStore.getState().setPlacing(
                    isValidDrop
                        ? { kind: kindOf(model), x: Math.round(dropArea.x), y: Math.round(dropArea.y) }
                        : null
                );
            }}
            onCellDragEnd={() => useStore.getState().setPlacing(null)}
            onCellDropInvalid={() => useStore.getState().setPlacing(null)}
            onCellDrop={({ model }) => {
                useStore.getState().setPlacing(null);
                const { x, y } = model.position();
                useStore.getState().addCard(kindOf(model), x, y);
            }}
        >
            <div
                className="select-none rounded-xl border border-edge bg-panel p-1.5 shadow-plate"
                role="group"
                aria-label="Card palette"
            >
                <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-subtle">
          Cards
                </p>
                {KINDS.map((kind) => (
                    <KindTile key={kind} kind={kind} />
                ))}
            </div>
        </Stencil>
    );
}
