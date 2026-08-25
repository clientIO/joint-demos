// The ERD canvas board: the <Paper> configured for entity-relationship editing
// (column-magnet connections, group embedding, smooth FK wires) with multi-select,
// a minimap, and fit-to-screen on load. It reads the graph/paper context provided
// by the <Diagram> that lives at the app root, so the toolbar and side panels are
// siblings that share the same graph.
//
// The draw-to-create + keyboard interactions live in useCanvasTools; the focusable
// placement surface is <DrawCaptureLayer>. Keyboard focus on a cell drives
// selection (onCellFocus), so tabbing highlights.

import { memo, useEffect, useRef, type ComponentProps } from 'react';
import {
    Paper,
    PaperScroller,
    Selection,
    Snaplines,
    getSelectionDefaultHandle,
    useCells,
    useOnKeyboardEvents,
    useOnPaperEvents,
    usePaperScroller,
    useSelectionCollection,
    type PaperProps,
} from '@joint/react-plus';
import { cn } from '@/utils/cn';
import { isCollapsedGroupCell, isGroupCell, isTableCell } from '@/model/cell-data';
import { renderElement } from './render-element';
import { RelationshipMenu } from './relationship-menu';
import { NavigatorPanel } from './navigator-panel';
import { AccessibilityCheck } from './accessibility-check';
import { DrawCaptureLayer } from './draw-capture-layer';
import { RelationshipKeyboardList } from './relationship-keyboard-list';
import { FIT_MIN_ZOOM, MAX_ZOOM } from './fit-content';
import { useContainerResize } from './use-container-resize';
import { useContainmentEmbedding } from './use-containment-embedding';
import { useZOrder } from './use-z-order';
import { useCanvasTools } from './use-canvas-tools';
import {
    CONNECT_HIGHLIGHTING,
    LINK_ROUTING,
    PAPER_OPTIONS,
    createDefaultLink,
} from './paper-config';

// Links must land on a column magnet, never an element's bare body.
const VALIDATE_CONNECTION: NonNullable<PaperProps['validateConnection']> = {
    allowRootConnection: false,
    // One FK per column pair, in EITHER direction. The default 'one-per-direction'
    // only blocks a second link the SAME way round — but seed links are stored
    // child→parent (e.g. tasks.assignee → users.id), so a user dragging the reverse
    // (users.id → tasks.assignee) would draw a duplicate on top of a loaded link.
    // An FK column pair has at most one relationship, so cap it per pair.
    linkLimit: 'one-per-pair',
};

// Link-drag / magnet-availability feedback for the Paper. The group drop-target
// highlight is NOT here — it's drawn by useContainmentEmbedding (the sole embedder),
// see that hook for why joint's own embeddingMode highlight was dropped.
const HIGHLIGHTING: NonNullable<PaperProps['highlighting']> = CONNECT_HIGHLIGHTING;

// Selection wrapper: keep ONLY the remove handle. Move is a plain body drag
// (allowTranslate, the default) — no handle needed — and rotate/clone don't apply
// to ERD cards. Resize comes from each card's own FreeTransform (tables, groups,
// and notes all mount one while selected), so the wrapper adds just a delete button.
const SELECTION_WRAPPER: NonNullable<
  ComponentProps<typeof Selection>['wrapper']
> = {
    // Build the list explicitly (the AI Workflow Builder pattern) instead of
    // filtering — the resolved defaults don't reliably carry a `name`, so a filter
    // drops everything and the native fallback re-adds all handles.
    handles: () => [getSelectionDefaultHandle('remove')],
};

// Fit the whole diagram into view once on load, so the seeded schema is visible
// without manual panning.
function FitOnLoad() {
    const { zoomToFit } = usePaperScroller();
    useEffect(() => {
        zoomToFit({ padding: 48, maxScale: 1 });
    }, [zoomToFit]);
    return null;
}

// memo'd: the root <Diagram cells> is controlled, so onCellsChange fires setCells
// ~60×/sec during a drag and re-renders the whole Workspace. CanvasArea takes no
// props, so this memo boundary stops that cascade — it re-renders only on its OWN
// subscriptions (none of which fire per frame, since useCanvasTools reads the graph
// on demand rather than subscribing).
export const CanvasArea = memo(function CanvasArea() {
    // RAW-JOINT BOUNDARY lives inside this hook; it hands back the collapse-aware
    // visibility predicate the Paper needs.
    const cellVisibility = useContainerResize();

    // Dynamic group membership: as tables/groups move and groups resize, re-file
    // tables into / out of the group whose bounds contain them (raw-graph escape —
    // controlled-cells setCell can't un-embed). It also rings each moved cell
    // green/red as it joins/leaves a group.
    // Only tables get embedded into groups — notes float freely (never move with a group).
    useContainmentEmbedding(isGroupCell, isCollapsedGroupCell, isTableCell);
    // Keep groups/notes behind tables + links in the data z-order, no matter creation
    // order or embedding.
    useZOrder();

    const { collection, selectCells } = useSelectionCollection();
    const { paperScroller } = usePaperScroller();
    const { armed, onDrawPointerDown, placeAtViewportCenter } = useCanvasTools();

    // Whether a right-docked inspector is up (single selected table or group —
    // the same condition the inspectors mount on). Drives the minimap sliding
    // left of the panel so it's never buried under it. Boolean snapshot, so this
    // memo'd board re-renders only when the flag actually flips.
    const sideInspectorOpen = useCells(collection, (cells) => {
        if (cells.length !== 1) return false;
        const [only] = cells;
        return only.type === 'element' && (isTableCell(only.data) || isGroupCell(only.data));
    });

    // The scrollable canvas region must be keyboard-focusable (WCAG scrollable-region-
    // focusable). The react-plus PaperScroller has no tabIndex prop, and its focusable
    // cell cards are portaled to a sibling overlay (NOT descendants of the scroller), so
    // the scroll container has no focusable child of its own. Set the attributes on the
    // library element once — a targeted a11y escape hatch, like the [model-id] levers.
    const rootRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;
        const scroller = root.querySelector('.jj-paper-scroller');
        if (scroller instanceof HTMLElement) {
            scroller.tabIndex = 0;
            // role="application": a focusable, arrow-key-pannable diagram canvas is a widget,
            // not a plain group — a focusable element in the tab order needs a widget role
            // (WCAG focus-order-semantics), and "application" tells AT to pass the arrow keys
            // through for panning. The aria-label names the region.
            scroller.setAttribute('role', 'application');
            scroller.setAttribute('aria-label', 'Diagram canvas — scrollable; use arrow keys to pan');
        }
        // Track whether the focus about to land was POINTER-initiated. A click/tap already puts
        // the card where the user pressed, so animating it into view then would yank the canvas
        // (the "weird jump when clicking to pan"). Only a KEYBOARD focus (Tab) should smooth-
        // scroll. The flag is set on pointerdown (which fires before the focusin it causes) and
        // cleared once consumed / on pointerup.
        let pointerInitiated = false;
        const onPointerDownFlag = (): void => {
            pointerInitiated = true;
        };
        const onPointerUpFlag = (): void => {
            pointerInitiated = false;
        };
        document.addEventListener('pointerdown', onPointerDownFlag, true);
        document.addEventListener('pointerup', onPointerUpFlag, true);

        // Keyboard focus on a cell SELECTS it (so tabbing highlights). The reworked
        // @joint/react has no Paper focus callback; the cards are portaled `<div model-id>`
        // wrappers and `focusin` bubbles, so one listener on the root catches whichever card
        // Tab lands on and walks up to its cell id.
        const onFocusIn = (event: FocusEvent): void => {
            const target = event.target;
            const card = target instanceof HTMLElement ? target.closest('[model-id]') : null;
            const id = card?.getAttribute('model-id');
            if (!id || !(card instanceof HTMLElement)) return;
            selectCells([id]);
            // A pointer-driven focus is a click on a visible card — never scroll (that's the jump).
            if (pointerInitiated) {
                pointerInitiated = false;
                return;
            }
            // Keyboard focus: smooth-scroll the card into view when it's OFF-SCREEN — the animated
            // framing the user liked from Search. `isElementVisible` with `strict` asks the
            // scroller whether the card sits FULLY inside the visible area, so tabbing between
            // on-screen cards never moves the canvas. Pan only: the scale is pinned to the
            // current zoom so focus never changes the zoom level.
            if (paperScroller) {
                const paper = paperScroller.options.paper;
                const cell = paper.model.getCell(id);
                if (cell?.isElement() && !paperScroller.isElementVisible(cell, { strict: true })) {
                    const scale = paper.scale().sx;
                    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                    paperScroller.transitionToRect(cell.getBBox(), {
                        maxScale: scale,
                        minScale: scale,
                        visibility: 0.7,
                        duration: reduce ? '0ms' : '250ms',
                        timingFunction: 'ease-out',
                    });
                }
            }
        };
        root.addEventListener('focusin', onFocusIn);
        return () => {
            document.removeEventListener('pointerdown', onPointerDownFlag, true);
            document.removeEventListener('pointerup', onPointerUpFlag, true);
            root.removeEventListener('focusin', onFocusIn);
        };
    }, [selectCells, paperScroller]);

    // ESC breaks OUT of the canvas: once focus is on a cell card, Tab only cycles the cards
    // (they're a portaled cluster), so a keyboard user can feel trapped. ESC on a focused
    // card moves focus up to the toolbar so they can reach the rest of the UI again. Bound
    // through the Diagram keyboard, which already skips field edits; focus outside any card
    // (e.g. a dialog) is left to its own ESC handling.
    useOnKeyboardEvents({
        escape: (event) => {
            const active = document.activeElement;
            if (!(active instanceof HTMLElement) || !active.closest('[model-id]')) return;
            const toolbarTarget = document.querySelector('[aria-label="Add table"]');
            if (toolbarTarget instanceof HTMLElement) {
                event.preventDefault();
                toolbarTarget.focus();
            }
        },
    });

    // Pressing a node makes it the selected one, so the coral outline follows your interaction
    // instead of lingering on a previously-clicked table. joint selects on a plain element press
    // already, but it preventDefaults a MAGNET press (a link-drag started from a column edge), so
    // that path left the owning table unselected — bind both through the typed paper events.
    // The camelCase handler gets a params object with `id` extracted; the magnet press has no
    // camelCase pointerdown variant, so it uses joint's native event key (also fully typed).
    useOnPaperEvents({
        onElementPointerDown: ({ id }) => selectCells([id]),
        'element:magnet:pointerdown': (elementView) => selectCells([elementView.model.id]),
    });

    return (
        <div ref={rootRef} className="relative size-full">
            {/* Keyboard access to FK links (which aren't Tab-focusable): a focus-revealed
          list that selects a relation so the RelationshipMenu opens. */}
            <RelationshipKeyboardList />
            {/* Ambient warm wash behind the canvas — decorative only. */}
            <div
                aria-hidden
                className="canvas-glow pointer-events-none absolute inset-0"
            />
            {/* virtualRendering: only cells inside the viewport are rendered — the make-or-
          break for big imports (a 159-table pg_dump froze panning with every card
          mounted). Composes automatically with the collapse-aware cellVisibility on
          the child Paper. Mount-only option (no runtime toggle needed here). */}
            {/* minZoom/maxZoom clamp EVERY zoom interaction (wheel, pinch, setZoom,
          minimap drag) at the scroller level — the navigator's slider maps onto
          the same shared bounds. */}
            <PaperScroller
                className="relative size-full touch-none"
                virtualRendering
                minZoom={FIT_MIN_ZOOM}
                maxZoom={MAX_ZOOM}
            >
                <Paper
                    className={cn('size-full', armed && 'cursor-crosshair')}
                    gridSize={1}
                    drawGridSize={16}
                    renderElement={renderElement}
                    cellVisibility={cellVisibility}
                    // Embedding (drag a table into a group) is handled entirely by
                    // useContainmentEmbedding — centre-containment on every move — NOT joint's
                    // embeddingMode, whose bbox-on-drop rule + highlight both fought it.
                    highlighting={HIGHLIGHTING}
                    // Connections: only column magnets, no pinned/floating ends.
                    validateConnection={VALIDATE_CONNECTION}
                    magnetThreshold="onleave"
                    linkPinning={false}
                    linkRouting={LINK_ROUTING}
                    defaultLink={createDefaultLink}
                    // 10px of pointer slop before a press counts as a drag — without it the
                    // tiniest touch jitter withholds every tap on the row controls.
                    clickThreshold={10}
                    // Raw-option escape hatch: veto link-start on interactive column controls.
                    options={PAPER_OPTIONS}
                >
                    {/* Marquee + multi-cell selection (drag-to-select, shift-add). Only the
              remove handle is kept; move is a plain drag. */}
                    <Selection wrapper={SELECTION_WRAPPER} />
                    {/* Alignment guides while dragging (like the AI workflow demo). */}
                    <Snaplines />
                    {/* Relationship hover-highlighting lives in HoverProvider now: it writes
              LinkStyle.className on the related wires (see .rel-hover in index.css). */}
                    <FitOnLoad />
                    {/* Inspector for a single selected relationship (cardinality + FK actions). */}
                    <RelationshipMenu />
                </Paper>
            </PaperScroller>
            {/* The rubber-band itself is drawn by the region the layer's press starts
          (styled via .jj-selection-region in index.css). */}
            {armed ? (
                <DrawCaptureLayer tool={armed} onPointerDown={onDrawPointerDown} onPlace={placeAtViewportCenter} />
            ) : null}
            {/* Combined minimap + zoom controls (collapse, slider, ±, %, fit). The query
          panel is a flex sibling that shrinks this canvas, so bottom-4 already sits
          above it — no manual inset needed. The INSPECTOR is different: a z-30
          absolute overlay docked right (lg+), which would bury this z-10 panel —
          so while one is open, slide left of its w-80 (right-84 = 20rem + the
          1rem inset). On mobile the inspector is a bottom sheet; no shift needed. */}
            <div
                className={cn(
                    'absolute bottom-4 right-4 z-10 transition-[right] duration-200 ease-out motion-reduce:transition-none',
                    sideInspectorOpen && 'lg:right-84',
                )}
            >
                <NavigatorPanel />
            </div>
            {/* "Check accessibility" pill, mirroring the AI Workflow Builder demo. Bottom-left
          so it clears the bottom-right navigator and the query panel below. */}
            <div className="absolute bottom-4 left-4 z-10">
                <AccessibilityCheck />
            </div>
        </div>
    );
});
