import {
    Diagram,
    FreeTransform,
    linkRoutingOrthogonal,
    Paper,
    PaperScroller,
    useOnGraphEvents,
    useOnKeyboardEvents,
    useOnPaperEvents,
    usePaper,
    usePaperScroller,
} from '@joint/react-plus';
import type { DefaultLink, InteractionsOptions, PaperProps } from '@joint/react-plus';
import type { dia } from '@joint/plus';
import { useEffect, useMemo, useRef } from 'react';
import { Cursors } from './cursors';
import { deriveCells } from './derive-cells';
import { ProcessCard } from './process-card';
import { deriveDraftLinks } from './draft-links';
import { PeerGhosts } from './peer-ghosts';
import { StencilRail } from './stencil-rail';
import { DEPARTMENTS, SEAT_COUNT } from '@/model/palette';
import type { PortSide } from '@/model/types';
import {
    CARD_HEIGHT,
    CARD_MAX_HEIGHT,
    CARD_MAX_WIDTH,
    CARD_MIN_HEIGHT,
    CARD_MIN_WIDTH,
    CARD_WIDTH,
    useStore,
} from '@/state/store';
import { usePeerDrafts } from '@/state/use-room';

/**
 * The board. Cells are fully controlled: the shared store is the single
 * source of truth and every collaborator derives the same board from it.
 *
 * Gestures:
 * - DOUBLE-click open ground (or drag a kind from the palette rail) → add a
 *   card (single blank clicks belong to panning, so adding must be
 *   deliberate);
 * - click a card → inspect it; click the SELECTED card again → arm a
 *   connection, then click the target card — or drag out of a connect dot
 *   on a card's edge and drop on another card;
 * - click open ground (or Esc) → cancel a pending connection;
 * - drag a card → move it; double-click a card → rename its title;
 * - the selected card grows a resize handle in its corner.
 */

const INTERACTIONS: InteractionsOptions = { selection: false };

/** Card dragging on; every link affordance off — flows follow the cards. */
const CELL_INTERACTIVITY = {
    elementMove: true,
    linkMove: false,
    labelMove: false,
    arrowheadMove: false,
    vertexAdd: false,
    vertexMove: false,
    vertexRemove: false,
    useLinkTools: false,
};

/** Gently rounded connector paths. */
const LINK_ROUTING = {
    // Right-angle runs that steer around the cards. Flows leave and arrive on
    // the cards' side ports, so a straight line between two stacked cards
    // would cut through one of them; the orthogonal router bends around.
    ...linkRoutingOrthogonal({ cornerType: 'cubic', cornerRadius: 12, margin: 20 }),
    // Every flow end names a port, so the line runs to the port's CENTRE —
    // the port-dot marker then sits exactly on the port, instead of stopping
    // short at the port body's outline.
    defaultAnchor: { name: 'center' },
    defaultConnectionPoint: { name: 'anchor' },
};

/**
 * Connection rules for the drag-from-a-port gesture. The full options form on
 * purpose: a bare predicate would still run the library's DEFAULTS first and
 * silently re-enable limits this board handles itself (duplicates are deduped
 * in the store's `addFlow`). A flow leaves an OUT dot and lands on an IN dot,
 * never on open ground or a card body, and never on a note.
 */
const VALIDATE_CONNECTION: NonNullable<PaperProps['validateConnection']> = {
    linkLimit: 'none',
    allowSelfLoops: false,
    allowRootConnection: true,
    validate: ({ source, target, endType }) => {
        const dragged = endType === 'source' ? source : target;
        const wanted: PortSide = endType === 'source' ? 'right' : 'left';
        if (dragged.port !== wanted) return false;
        return useStore.getState().nodes[String(dragged.id)]?.kind !== 'note';
    },
};

/** Narrows a link end's `port` to the two sides a card carries. */
function toPortSide(port: unknown): PortSide | undefined {
    return port === 'left' || port === 'right' ? port : undefined;
}

/** The dashed draft drawn while a flow is dragged out of a port. */
const createDraftFlow: DefaultLink = () => ({
    type: 'link',
    z: 10,
    style: {
        color: 'var(--accent)',
        width: 1.5,
        dasharray: '6,4',
        linecap: 'round',
    },
});

/** Rhythm of the dotted ground, in graph units. */
const GRID_STEP = 20;

/**
 * The dotted ground is the paper's own grid layer, drawn UNDER the cells;
 * as an overlay it was painted over them and the cards looked see-through.
 * The colour is the theme token, so it flips with dark mode like the rest.
 */
const DOT_GRID: PaperProps['drawGrid'] = {
    name: 'dot',
    args: { color: 'var(--dot)', thickness: 2 },
};

/**
 * The selected card's resize handles, the library's own free transform with
 * the card bounds as its limits, so a drag stops at the limit under the
 * pointer. Rotation is off: a playbook card never tilts.
 */
function CardTransform() {
    const selected = useStore((state) =>
        state.selected !== null && state.nodes[state.selected] !== undefined ? state.selected : null
    );
    if (selected === null) return null;
    return (
        <FreeTransform
            cell={selected}
            allowRotation={false}
            minWidth={CARD_MIN_WIDTH}
            minHeight={CARD_MIN_HEIGHT}
            maxWidth={CARD_MAX_WIDTH}
            maxHeight={CARD_MAX_HEIGHT}
        />
    );
}

/**
 * Echoes resizes into the shared store. The handles write the size onto the
 * MODEL; the store is the document of record, so the change is captured off
 * the graph and committed, and the controlled sync echoes it back, exactly
 * like card drags. A handle on the top or left edge resizes AND moves the
 * card, and joint writes the size before the position; capturing both on
 * both events means the position is right by the time the drag ends.
 *
 * Only the free transform's own writes are echoed (it tags them): a card
 * drag also moves the position, and it already reports through
 * `onElementPointerMove`, which must see the move first. The transform's
 * batch brackets the gesture, so it also sets and clears my "resizing"
 * presence, the live hands colleagues see on the card.
 */
function ResizeWriteBack() {
    const writeGeometry = (cell: dia.Cell, _value: unknown, opt?: { freeTransform?: string }) => {
        console.log('DBG writeGeometry', String(cell.id), JSON.stringify(opt));
        if (opt?.freeTransform === undefined || !cell.isElement() || !useStore.getState().joined) return;
        const { x, y } = cell.position();
        const { width, height } = cell.size();
        useStore.getState().resizeNode(String(cell.id), x, y, width, height);
    };
    useOnGraphEvents({
        'change:size': writeGeometry,
        'change:position': writeGeometry,
        'batch:start': ({ batchName }) => {
            const { selected, setResizing } = useStore.getState();
            if (batchName === 'free-transform') setResizing(selected);
        },
        'batch:stop': ({ batchName }) => {
            if (batchName === 'free-transform') useStore.getState().setResizing(null);
        },
    });
    return null;
}

function BoardSurface() {
    const { paper } = usePaper();
    const { paperScroller } = usePaperScroller();
    const joined = useStore((state) => state.joined);

    // My pointer, shared as presence in graph coordinates so every colleague
    // can place it correctly whatever their own pan and zoom. Straight to the
    // store: every subscriber reads a primitive off it, and the room transport
    // throttles what goes over the wire.
    const onPointerMove = (event: React.PointerEvent) => {
        if (!paper || !joined) return;
        const point = paper.clientToLocalPoint(event.clientX, event.clientY);
        useStore.getState().setCursor({ x: Math.round(point.x), y: Math.round(point.y) });
    };
    const onPointerLeave = () => {
        useStore.getState().setCursor(null);
        // A drag keeps tracking outside the board (document capture); leave the
        // "moving" verb alone until the release settles it.
        if (useStore.getState().me.doing !== 'moving') useStore.getState().setDoing('idle');
    };

    // Bring the selected card into view — a quick-added card can land below
    // the current viewport. Positions come from the store, not the graph: in
    // the commit that selects a fresh card the graph has not synced it yet.
    // While I drag a flow, every IN dot that can take it pulses (see
    // `.jb-is-drawing` in index.css), so the drop targets show themselves.
    const isDrawing = useStore((state) => state.me.drawing !== null);
    const selected = useStore((state) => state.selected);
    useEffect(() => {
        if (selected === null || !paperScroller) return;
        const node = useStore.getState().nodes[selected];
        if (!node) return;
        const centerX = node.x + CARD_WIDTH / 2;
        const centerY = node.y + CARD_HEIGHT / 2;
        if (paperScroller.isPointVisible({ x: centerX, y: centerY })) return;
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        paperScroller.center(centerX, centerY, {
            animation: prefersReducedMotion ? undefined : { duration: 200 },
        });
    }, [selected, paperScroller]);

    // Esc cancels an in-progress connection and closes the inspector; Delete
    // removes the selected flow. The diagram's keyboard skips fields on its
    // own, so typing never reaches these.
    useOnKeyboardEvents({
        escape: () => useStore.getState().clearGesture(),
        'delete backspace': (event) => {
            const { selectedFlow } = useStore.getState();
            if (selectedFlow === null) return;
            event.preventDefault();
            useStore.getState().removeFlow(selectedFlow);
        },
    });

    return (
        <div
            className={isDrawing ? 'jb-is-drawing relative min-w-0 flex-1' : 'relative min-w-0 flex-1'}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
        >
            {/* The scroller is the scrollable region: focusable and labelled
          (WCAG 2.1.1, axe scrollable-region-focusable). */}
            <PaperScroller
                className="jb-scroller"
                cursor="default"
                inertia
                tabIndex={0}
                role="application"
                aria-roledescription="playbook board"
                aria-label="Playbook board — scrollable"
            >
                <Paper
                    drawGrid={DOT_GRID}
                    drawGridSize={GRID_STEP}
                    className="jb-paper"
                    renderElement={ProcessCard}
                    interactive={CELL_INTERACTIVITY}
                    linkRouting={LINK_ROUTING}
                    validateConnection={VALIDATE_CONNECTION}
                    defaultLink={createDraftFlow}
                    magnetThreshold="onleave"
                    linkPinning={false}
                    // While drawing a flow, the loose end snaps to the nearest valid
                    // connect dot within 40px — forgiving to aim with.
                    snapLinks={{ radius: 40 }}
                    onLinkPointerMove={({ model, x, y }) => {
                        if (!joined) return;
                        const source = model.source();
                        const fromPort = toPortSide(source.port);
                        // Only a flow still in the air; a committed flow is not a gesture.
                        const isDraft = useStore.getState().flows[String(model.id)] === undefined;
                        if (!isDraft || source.id === undefined || fromPort === undefined) return;
                        // A snapped end names its port, so colleagues see the same snap.
                        const target = model.target();
                        const toPort = toPortSide(target.port);
                        useStore.getState().setDrawing({
                            from: String(source.id),
                            fromPort,
                            x: Math.round(x),
                            y: Math.round(y),
                            ...(target.id !== undefined && toPort !== undefined
                                ? { to: String(target.id), toPort }
                                : {}),
                        });
                    }}
                    onLinkPointerUp={() => useStore.getState().setDrawing(null)}
                    onLinkPointerClick={({ model }) => {
                        if (!joined) return;
                        // A committed flow; a draft still in the air is not selectable.
                        if (useStore.getState().flows[String(model.id)] === undefined) return;
                        useStore.getState().selectFlow(String(model.id));
                    }}
                    onLinkConnect={({ model }) => {
                        useStore.getState().setDrawing(null);
                        const source = model.source();
                        const target = model.target();
                        // The store's flow is the one that survives, and it keeps the
                        // dots the user actually joined, so the committed link attaches
                        // there rather than wherever the geometry faces.
                        if (joined && source.id !== undefined && target.id !== undefined) {
                            useStore
                                .getState()
                                .addFlow(
                                    String(source.id),
                                    String(target.id),
                                    toPortSide(source.port),
                                    toPortSide(target.port)
                                );
                        }
                        // Drop the draft explicitly rather than trusting the next cell
                        // sync to prune it: when the store REFUSES the flow — a pair that
                        // is already connected, or a drop made before joining — nothing
                        // in the document changes, no sync runs, and the connected draft
                        // would sit on the board forever, invisible to peers and
                        // undeletable (every link interaction is off). Deferred a frame
                        // so joint finishes its own pointerup handling on the model.
                        requestAnimationFrame(() => model.remove());
                    }}
                    clickThreshold={8}
                    onBlankPointerClick={() => {
                        if (!joined) return;
                        // A ground click only cancels — adding is a DOUBLE-click. A
                        // single blank click is unreliable for real pointers anyway: the
                        // slightest jitter turns it into a 1px pan and it never fires.
                        useStore.getState().clearGesture();
                    }}
                    onBlankPointerDblClick={({ x, y }) => {
                        if (!joined) return;
                        useStore.getState().addCard('step', x - CARD_WIDTH / 2, y - CARD_HEIGHT / 2);
                    }}
                    onElementPointerClick={({ model }) => {
                        if (!joined) return;
                        useStore.getState().connectOrSelect(String(model.id));
                    }}
                    onElementPointerDblClick={({ model }) => {
                        if (!joined) return;
                        useStore.getState().beginRename(String(model.id));
                    }}
                    onElementPointerMove={({ model }) => {
                        if (!joined) return;
                        // Unthrottled: the store then always matches the model, so a
                        // peer-triggered cell re-sync can never snap the drag backwards.
                        const { x, y } = model.position();
                        useStore.getState().moveNode(String(model.id), x, y);
                    }}
                    onElementPointerUp={({ model }) => {
                        if (!joined) return;
                        const { x, y } = model.position();
                        useStore.getState().moveNode(String(model.id), x, y);
                        useStore.getState().settleNode(String(model.id));
                    }}
                >
                    <Cursors />
                    <PeerGhosts />
                    <CardTransform />
                    <ResizeWriteBack />
                </Paper>
            </PaperScroller>
            <StencilRail />
            <FirstView />
            <ConnectPill />
            <FlowPill />
            <ZoomControls />
        </div>
    );
}

/** Persistent affordance for the armed connect gesture. */
function ConnectPill() {
    const pendingTitle = useStore((state) =>
        state.pendingSource === null ? null : (state.nodes[state.pendingSource]?.title ?? null)
    );
    if (pendingTitle === null) return null;
    return (
        <div
            className="absolute left-1/2 top-3.5 flex -translate-x-1/2 items-center gap-2 rounded-full border border-accent bg-panel px-3.5 py-1.5 text-xs shadow-plate"
            role="status"
        >
            <span className="size-2 rounded-full bg-accent" aria-hidden />
      Connecting from <strong>{pendingTitle}</strong> — click another card · Esc cancels
        </div>
    );
}

/** The selected flow, named, with the one thing to do to it. */
function FlowPill() {
    const titles = useStore((state) => {
        if (state.selectedFlow === null) return null;
        const flow = state.flows[state.selectedFlow];
        if (!flow) return null;
        return `${state.nodes[flow.from]?.title ?? '…'} → ${state.nodes[flow.to]?.title ?? '…'}`;
    });
    const selectedFlow = useStore((state) => state.selectedFlow);
    if (titles === null || selectedFlow === null) return null;
    return (
        <div
            className="absolute left-1/2 top-3.5 flex -translate-x-1/2 items-center gap-2.5 rounded-full border border-accent bg-panel py-1.5 pl-3.5 pr-3.5 text-xs shadow-plate"
            role="status"
        >
            <span className="size-2 rounded-full bg-accent" aria-hidden />
      Connection <strong className="max-w-[260px] truncate">{titles}</strong>
            <button
                type="button"
                className="cursor-pointer rounded-full border border-control bg-transparent px-2.5 py-0.5 font-sans text-xs font-semibold text-ink hover:bg-paper"
                onClick={() => useStore.getState().removeFlow(selectedFlow)}
            >
        Remove
            </button>
            <span className="text-subtle">Esc</span>
        </div>
    );
}

/**
 * Frames the playbook once: on the first paper render that has cards in it
 * (seed or peer state), so the fit sees the real content box.
 */
function FirstView() {
    const { paperScroller, zoomToFit } = usePaperScroller();
    const framed = useRef(false);
    useOnPaperEvents({
        'render:done': () => {
            if (framed.current || !paperScroller) return;
            if (Object.keys(useStore.getState().nodes).length === 0) return;
            framed.current = true;
            zoomToFit({ padding: 160, maxScale: 1 });
        },
    });
    return null;
}

const ZOOM_BUTTON_CLASS =
  'inline-flex size-8 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-ink hover:bg-paper';

/** Zoom glyphs as strokes, so they sit on the button's centre rather than a
 * text baseline. */
function ZoomIcon({ kind }: Readonly<{ kind: 'out' | 'fit' | 'in' }>) {
    return (
        <svg
            viewBox="0 0 16 16"
            width={14}
            height={14}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            aria-hidden
        >
            {kind !== 'fit' && <path d="M3.5 8h9" />}
            {kind === 'in' && <path d="M8 3.5v9" />}
            {kind === 'fit' && (
                <>
                    <circle cx={8} cy={8} r={3.25} />
                    <path d="M8 1.75v2.5M8 11.75v2.5M1.75 8h2.5M11.75 8h2.5" />
                </>
            )}
        </svg>
    );
}

function ZoomControls() {
    const { setZoom, zoomToFit } = usePaperScroller();
    return (
        <div
            className="absolute bottom-3.5 right-3.5 flex gap-1 rounded-full border border-edge bg-panel p-1 shadow-plate"
            role="group"
            aria-label="Zoom"
        >
            <button
                type="button"
                className={ZOOM_BUTTON_CLASS}
                aria-label="Zoom out"
                onClick={() => setZoom((zoom) => zoom / 1.2)}
            >
                <ZoomIcon kind="out" />
            </button>
            <button
                type="button"
                className={ZOOM_BUTTON_CLASS}
                aria-label="Zoom to fit the playbook"
                onClick={() => zoomToFit({ contentMargin: 140, maxScale: 1.15 })}
            >
                <ZoomIcon kind="fit" />
            </button>
            <button
                type="button"
                className={ZOOM_BUTTON_CLASS}
                aria-label="Zoom in"
                onClick={() => setZoom((zoom) => zoom * 1.2)}
            >
                <ZoomIcon kind="in" />
            </button>
        </div>
    );
}

export function BoardCanvas() {
    const nodes = useStore((state) => state.nodes);
    const flows = useStore((state) => state.flows);
    const members = useStore((state) => state.members);
    const drafts = usePeerDrafts();
    const selectedFlow = useStore((state) => state.selectedFlow);
    const cells = useMemo(
        () => [
            ...deriveCells(
                nodes,
                flows,
                (owner) => members[owner]?.seat ?? 0,
                (owner) => DEPARTMENTS[(members[owner]?.seat ?? 0) % SEAT_COUNT],
                selectedFlow
            ),
            ...deriveDraftLinks(drafts, nodes),
        ],
        [nodes, flows, members, drafts, selectedFlow]
    );

    return (
        <Diagram cells={cells} interactions={INTERACTIONS}>
            <BoardSurface />
        </Diagram>
    );
}
