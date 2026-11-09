/**
 * The board: a controlled `<Diagram>` whose cells are drawn from Liveblocks storage,
 * plus the paper, its gestures and the presence layers. Edits flow one way: a
 * gesture writes to storage, and storage re-draws the board for everyone.
 */
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
import { useSelf, useUpdateMyPresence } from '@liveblocks/react/suspense';
import { useEffect, useMemo, useRef } from 'react';
import type { PointerEvent } from 'react';
import { CARD_HEIGHT, CARD_MAX_HEIGHT, CARD_MAX_WIDTH, CARD_MIN_HEIGHT, CARD_MIN_WIDTH, CARD_WIDTH } from '@/model';
import { useMyDraft, usePeerDrafts } from '@/presence';
import { clearSelection, selectCard, selectFlow, setRenamingCard, startConnecting, useUiState } from '@/ui-state';
import { useAddCard, useAddFlow, useMoveCard, useRemoveFlow, useResizeCard, useSaveCellChanges } from './board-actions';
import { useCard, useCards, useFlows } from './board-data';
import { ConnectHint, SelectedFlowBar, ZoomControls } from './board-controls';
import { CardPalette } from './card-palette';
import { PeerCursors, PeerPlacingGhosts } from './peer-layers';
import { PlaybookCard } from './playbook-card';
import { OWN_DRAFT_STYLE, toCells } from './to-cells';

/** The board does its own selection (the inspector), so the built-in one is off. */
const INTERACTIONS: InteractionsOptions = { selection: false };

/** Cards move; flows only follow their cards, so every link affordance is off. */
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

/** Right-angle runs that bend around cards, meeting each port at its center. */
const LINK_ROUTING = {
    ...linkRoutingOrthogonal({ cornerType: 'cubic', cornerRadius: 12, margin: 20 }),
    defaultAnchor: { name: 'center' },
    defaultConnectionPoint: { name: 'anchor' },
};

/**
 * A dragged flow must leave an OUT dot and land on an IN dot. The full options form
 * on purpose: a bare predicate would also run the library defaults, which would add
 * limits that the storage write ({@link useAddFlow}) already handles.
 */
const VALIDATE_CONNECTION: NonNullable<PaperProps['validateConnection']> = {
    linkLimit: 'none',
    allowSelfLoops: false,
    allowRootConnection: true,
    validate: ({ source, target, endType }) => {
        const dragged = endType === 'source' ? source : target;
        return dragged.port === (endType === 'source' ? 'out' : 'in');
    },
};

/** The dashed link I see while I drag a flow out of a port. */
const createDraftFlow: DefaultLink = () => ({
    type: 'link',
    z: 10,
    style: OWN_DRAFT_STYLE,
});

/** The dotted ground, drawn by the paper under the cells. */
const GRID_STEP = 20;
const DOT_GRID: PaperProps['drawGrid'] = { name: 'dot', args: { color: 'var(--dot)', thickness: 2 }};

/** Graph cells carry `data: unknown`; this reads a card's kind without a cast. */
function isNoteCell(model: { get: (key: string) => unknown }): boolean {
    const data = model.get('data');
    return typeof data === 'object' && data !== null && 'kind' in data && data.kind === 'note';
}

/** The board, controlled by the room's storage. */
export function PlaybookBoard() {
    // The whole sync, read side: storage in, cells out.
    const cards = useCards();
    const flows = useFlows();
    const selectedFlow = useUiState((state) => state.selectedFlow);
    const peerDrafts = usePeerDrafts();
    // My own flow in the air is part of the cells too, or a re-sync would drop it.
    const myDraft = useMyDraft();
    const cells = useMemo(
        () => toCells(cards, flows, selectedFlow, peerDrafts, myDraft),
        [cards, flows, selectedFlow, peerDrafts, myDraft]
    );
    // ...and write side: what the user changed in the graph goes back to storage.
    const saveCellChanges = useSaveCellChanges();

    return (
        <Diagram cells={cells} onIncrementalCellsChange={saveCellChanges} interactions={INTERACTIONS}>
            <BoardSurface />
        </Diagram>
    );
}

function BoardSurface() {
    const { paper } = usePaper();
    const updateMyPresence = useUpdateMyPresence();
    const addCard = useAddCard();
    const addFlow = useAddFlow();
    const moveCard = useMoveCard();
    const removeFlow = useRemoveFlow();
    const flows = useFlows();
    // While I drag a flow, the IN dots that can take it pulse (see index.css).
    const isDrawingFlow = useSelf((self) => self.presence.drawing !== null);

    // My pointer, in graph coordinates so everyone can place it whatever their zoom.
    const onPointerMove = (event: PointerEvent) => {
        if (!paper) return;
        const point = paper.clientToLocalPoint(event.clientX, event.clientY);
        updateMyPresence({ cursor: { x: Math.round(point.x), y: Math.round(point.y) }});
    };

    useOnKeyboardEvents({
        escape: () => clearSelection(),
        'delete backspace': (event) => {
            const { selectedFlow } = useUiState.getState();
            if (selectedFlow === null) return;
            event.preventDefault();
            removeFlow(selectedFlow);
            clearSelection();
        },
    });

    const onElementPointerClick: PaperProps['onElementPointerClick'] = ({ model }) => {
        const cardId = String(model.id);
        const { connectFrom, selectedCard } = useUiState.getState();
        if (connectFrom !== null && connectFrom !== cardId) {
            addFlow(connectFrom, cardId);
            selectCard(cardId);
            return;
        }
        // A click selects; a second click on the selected card arms a connection.
        if (connectFrom === null && selectedCard === cardId && !isNoteCell(model)) {
            startConnecting(cardId);
            return;
        }
        selectCard(cardId);
    };

    return (
        <div
            className="relative min-h-0 min-w-0 flex-1"
            data-pb-drawing={isDrawingFlow ? '' : undefined}
            onPointerMove={onPointerMove}
            onPointerLeave={() => updateMyPresence({ cursor: null })}
        >
            <PaperScroller
                className="pb-scroller"
                cursor="default"
                inertia
                tabIndex={0}
                role="application"
                aria-roledescription="playbook board"
                aria-label="Playbook board, scrollable"
            >
                <Paper
                    className="pb-paper"
                    drawGrid={DOT_GRID}
                    drawGridSize={GRID_STEP}
                    renderElement={PlaybookCard}
                    interactive={CELL_INTERACTIVITY}
                    linkRouting={LINK_ROUTING}
                    validateConnection={VALIDATE_CONNECTION}
                    defaultLink={createDraftFlow}
                    magnetThreshold="onleave"
                    linkPinning={false}
                    snapLinks={{ radius: 40 }}
                    clickThreshold={8}
                    onBlankPointerClick={() => clearSelection()}
                    onBlankPointerDblClick={({ x, y }) => addCard('step', x - CARD_WIDTH / 2, y - CARD_HEIGHT / 2)}
                    onElementPointerClick={onElementPointerClick}
                    onElementPointerDblClick={({ model }) => setRenamingCard(String(model.id))}
                    onElementPointerMove={({ model }) => {
                        const { x, y } = model.position();
                        moveCard(String(model.id), x, y);
                    }}
                    onElementPointerUp={() => updateMyPresence({ busy: null })}
                    onLinkPointerClick={({ model }) => {
                        // Drafts in the air are not flows yet, so only stored flows select.
                        if (String(model.id) in flows) selectFlow(String(model.id));
                    }}
                    // Share the flow I am drawing, so peers see it before it lands.
                    onLinkPointerMove={({ model, x, y }) => {
                        const linkId = String(model.id);
                        const source = model.source();
                        if (linkId in flows || source.id === undefined || source.port !== 'out') return;
                        const target = model.target();
                        updateMyPresence({
                            drawing: {
                                linkId,
                                source: String(source.id),
                                x: Math.round(x),
                                y: Math.round(y),
                                target: target.id === undefined ? null : String(target.id),
                            },
                        });
                    }}
                    // Clearing my draft also drops its link from the cells, so a flow that
                    // storage refused (a duplicate, say) never stays behind on my board.
                    onLinkPointerUp={() => updateMyPresence({ drawing: null })}
                    onLinkConnect={({ model }) => {
                        const source = model.source();
                        const target = model.target();
                        if (source.id !== undefined && target.id !== undefined) {
                            addFlow(String(source.id), String(target.id));
                        }
                    }}
                >
                    <PeerCursors />
                    <PeerPlacingGhosts />
                    <CardResizeHandles />
                </Paper>
            </PaperScroller>
            <CardPalette />
            <FirstView />
            <ScrollSelectedIntoView />
            <ConnectHint />
            <SelectedFlowBar />
            <ZoomControls />
        </div>
    );
}

/**
 * Resize handles on the selected card, with the card limits as bounds. Each step of
 * the resize is written to storage, like a drag: peers see it live, and a re-sync
 * caused by someone else's edit cannot snap the card back mid-gesture. While the
 * handles are held, my presence says "resizing", so peers see my frame on it.
 */
function CardResizeHandles() {
    const selectedCard = useUiState((state) => state.selectedCard);
    const exists = useCard(selectedCard) !== undefined;
    const updateMyPresence = useUpdateMyPresence();
    const resizeCard = useResizeCard();
    const resizingCardId = useRef<string | null>(null);
    // The handles change the size and, from a top or left handle, the position too.
    const writeResize = (cell: dia.Cell) => {
        const cardId = resizingCardId.current;
        if (cardId === null || String(cell.id) !== cardId || !cell.isElement()) return;
        resizeCard(cardId, { ...cell.position(), ...cell.size() });
    };
    useOnGraphEvents({
        'batch:start': ({ batchName }) => {
            const cardId = useUiState.getState().selectedCard;
            if (batchName !== 'free-transform' || cardId === null) return;
            resizingCardId.current = cardId;
            updateMyPresence({ busy: { cardId, verb: 'resizing' }});
        },
        'batch:stop': ({ batchName }) => {
            if (batchName !== 'free-transform') return;
            resizingCardId.current = null;
            updateMyPresence({ busy: null });
        },
        'change:size': writeResize,
        'change:position': writeResize,
    });
    if (selectedCard === null || !exists) return null;
    return (
        <FreeTransform
            cell={selectedCard}
            allowRotation={false}
            minWidth={CARD_MIN_WIDTH}
            minHeight={CARD_MIN_HEIGHT}
            maxWidth={CARD_MAX_WIDTH}
            maxHeight={CARD_MAX_HEIGHT}
        />
    );
}

/** Frames the playbook once, on the first render that has cards in it. */
function FirstView() {
    const { zoomToFit } = usePaperScroller();
    const hasCards = Object.keys(useCards()).length > 0;
    const isFramed = useRef(false);
    useOnPaperEvents({
        'render:done': () => {
            if (isFramed.current || !hasCards) return;
            isFramed.current = true;
            zoomToFit({ padding: 160, maxScale: 1 });
        },
    });
    return null;
}

/** Brings the selected card into view; a card added from the panel can land off screen. */
function ScrollSelectedIntoView() {
    const { paper } = usePaper();
    const { paperScroller } = usePaperScroller();
    const selectedCard = useUiState((state) => state.selectedCard);
    useEffect(() => {
        // Runs after the diagram synced this render's cells, so a new card is in the graph.
        const cell = selectedCard === null ? undefined : paper?.model.getCell(selectedCard);
        if (!paperScroller || !cell?.isElement()) return;
        const center = cell.getBBox().center();
        if (paperScroller.isPointVisible(center)) return;
        const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        paperScroller.center(center.x, center.y, { animation: isReducedMotion ? undefined : { duration: 200 }});
    }, [selectedCard, paper, paperScroller]);
    return null;
}
