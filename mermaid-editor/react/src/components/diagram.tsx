// `dia` comes from `@joint/plus` rather than `@joint/core` so the types are the
// exact ones `@joint/react-plus` is built against — a second `@joint/core` copy
// would make `useGraph()`'s graph unassignable to anything typed from it.
import type { dia } from '@joint/plus';
import { DirectedGraph } from '@joint/layout-directed-graph';
import {
    Diagram,
    ElementOverlay,
    linkRoutingOrthogonal,
    linkRoutingStraight,
    Paper,
    PaperScroller,
    Selection,
    useGraph,
    useOnElementsMeasured,
    usePaper,
    usePaperScroller,
    useSelection,
} from '@joint/react-plus';
import type {
    CellId,
    InteractionsOptions,
    SelectionProps,
    ZoomToFitOptions,
} from '@joint/react-plus';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { EdgeArrowChange, EdgeRef } from '@/mermaid/edit-source';
import type { EdgeData, MermaidCell } from '@/mermaid/to-cells';
import type { FlowDirection } from '@/mermaid/types';
import type { NodeData } from '@/mermaid/to-cells';
import { AccessibilityCheck } from './accessibility-check';
import { CanvasActions } from './canvas-actions';
import { LinkToolbar } from './link-toolbar';
import { NodeEditingContext } from './node-editing';
import type { NodeEditing } from './node-editing';
import { NodeToolbar } from './node-toolbar';
import { RenderNode } from './render-node';
import { ZoomControls } from './zoom-controls';

const FIT_OPTIONS: ZoomToFitOptions = {
    contentMargin: 40,
    useModelGeometry: true,
    maxScale: 1.2,
};

/**
 * With auto-layout on, the diagram is a rendering of the source, not a canvas
 * to edit: the text is the single source of truth, and a dragged node would be
 * silently discarded on the next layout. Panning and zooming are unaffected —
 * the scroller drives those from the blank area, not from cell interactions.
 */
const PAPER_INTERACTIVE = false;

/**
 * Manual mode: nodes drag, everything else stays read-only. Positions are not
 * Mermaid syntax, so they live in {@link MermaidDiagramProps.positionsRef}
 * rather than the source — the one piece of diagram state the text cannot
 * carry.
 */
const MANUAL_INTERACTIVE = {
    elementMove: true,
    linkMove: false,
    labelMove: false,
    arrowheadMove: false,
    vertexAdd: false,
    vertexMove: false,
    vertexRemove: false,
    useLinkTools: false,
} as const;

/**
 * Bring a selected node into view. `strict` counts a partly clipped node as
 * not visible, so moving the caret onto one that is half off the edge centres
 * it rather than leaving it cut in two.
 */
const VISIBILITY_OPTIONS = { strict: true };
const SCROLL_OPTIONS = { animation: { duration: 150 }};

/**
 * Keep the scroller's pan/zoom, drop the built-in selection interactions.
 *
 * Those bundle click-to-select with Shift-drag regions, Ctrl/Cmd+A and
 * Delete/Backspace — editing gestures with nothing to act on here. A single
 * `onElementPointerClick` handler below is the whole behaviour this demo wants.
 */
const INTERACTIONS: InteractionsOptions = { selection: false };

/**
 * `wrapper: false` drops the bbox overlay and its resize / rotate handles —
 * editing affordances on a read-only diagram. What remains is the
 * `jj-is-selected` class on the selected cell, styled in `index.css`.
 */
const SELECTION: SelectionProps = { wrapper: false, allowTranslate: false };

/**
 * Straight links with a small gap at the end, and rounded corners where dagre's vertices turn the line.
 */
const LINK_ROUTING = linkRoutingStraight({
    targetOffset: 6,
    cornerType: 'cubic',
    cornerRadius: 8
});

/**
 * Manual mode drops dagre's vertices, so the links need a router of their own:
 * orthogonal routing steers around elements wherever the user drags them.
 * (The libavoid-based router would slot in here the day its wrapper package
 * ships; this is the closest routing the current @joint/plus build carries.)
 */
const MANUAL_ROUTING = linkRoutingOrthogonal({
    cornerType: 'cubic',
    cornerRadius: 8,
    margin: 12,
});

/**
 * Every element has reported a real size.
 *
 * Less a readiness check than a decision about which of the two triggers below
 * owns a given run. Dagre reads element sizes, and elements start out 0×0
 * because `to-cells` emits them with none — the label is measured first and
 * `useMeasureElement` supplies the size.
 *
 * The three cases, as measured:
 *
 * - Direction alone (`TB` to `BT`): no element changes size, so the graph is
 *   already measured and the effect lays out on the spot. Nothing re-measures,
 *   so no measured callback ever arrives — the effect is the only trigger there
 *   is, which is why it cannot be dropped.
 * - A changed id (rename, insert): the keyed remount builds a fresh graph, every
 *   element is back to 0×0, and the effect stands down. The measured callback
 *   owns that run.
 * - A label alone: sizes are stale but non-zero, so both triggers run — the
 *   effect against the old widths, the measured callback against the new ones.
 *   Redundant rather than harmful: the hook flushes the paper afterwards, so
 *   nothing paints in between.
 */
function isMeasured(graph: dia.Graph): boolean {
    const elements = graph.getElements();
    return elements.length > 0 && elements.every((element) => element.size().width > 0);
}

/**
 * Breathing room `fitToChildren` keeps between a subgraph's border and its
 * members. Extra at the top, where the container's title sits.
 */
const CLUSTER_PADDING = { top: 44, left: 18, right: 18, bottom: 18 };

function runLayout(graph: dia.Graph, direction: FlowDirection): boolean {
    if (!isMeasured(graph)) return false;
    DirectedGraph.layout(graph, {
        rankDir: direction,
        nodeSep: 46,
        edgeSep: 24,
        rankSep: 64,
        marginX: 20,
        marginY: 20,
        // Subgraphs ride through dagre as clusters; the layout then calls
        // `fitToChildren` on each so the container hugs its members.
        clusterPadding: CLUSTER_PADDING,
        // Links use the paper's default routing, so dagre owns their shape:
        // it writes the simplified spline it already computed for each edge as
        // the link's vertices, and the default router draws straight through
        // them.
        setVertices: true,
        // Labels stay at the midpoint of the path (`position: 0.5`, set in
        // `to-cells.ts`) rather than at dagre's label point, which would be
        // overwritten on the next declarative cell sync.
        setLabels: false,
        exportLink: (link) => ({ minLen: link.get('data')?.minLen ?? 1 }),
    });
    return true;
}

/** Where a dragged node ended up, keyed by node id. */
export type ManualPositions = Map<string, { x: number; y: number }>;

/** Vertical gap between a new node and the neighbour it is placed under. */
const MANUAL_DROP_GAP = 56;

/**
 * Manual mode's stand-in for the layout: put every node back where the user
 * left it. A node the cache has never seen — one just added from the toolbar
 * or typed into the source — lands under a connected neighbour, cascading a
 * little so siblings do not stack pixel-perfectly on each other.
 *
 * Dagre's vertices are dropped along the way: they describe the *previous*
 * layout, and the orthogonal router owns the link shapes here.
 */
function applyManualPositions(graph: dia.Graph, positions: ManualPositions): boolean {
    if (!isMeasured(graph)) return false;
    const elements = graph.getElements();
    let cascade = 0;
    for (const element of elements) {
        const saved = positions.get(String(element.id));
        if (saved) element.position(saved.x, saved.y);
    }
    for (const element of elements) {
        if (positions.has(String(element.id))) continue;
        const neighbour = graph
            .getNeighbors(element)
            .find((candidate) => positions.has(String(candidate.id)));
        const base = neighbour
            ? {
                x: neighbour.position().x + cascade * 24,
                y: neighbour.position().y + neighbour.size().height + MANUAL_DROP_GAP,
            }
            : { x: 40 + cascade * 24, y: 40 + cascade * 24 };
        cascade += 1;
        element.position(base.x, base.y);
        positions.set(String(element.id), base);
    }
    for (const link of graph.getLinks()) link.unset('vertices');
    // Containers hug wherever their members sit now — deepest first, so an
    // outer subgraph fits around its inner one's ALREADY-fitted border.
    const containers = elements
        .filter((element) => element.getEmbeddedCells().length > 0)
        .toSorted((a, b) => b.getAncestors().length - a.getAncestors().length);
    for (const container of containers) container.fitToChildren({ padding: CLUSTER_PADDING });
    return true;
}

interface CanvasProps {
    readonly direction: FlowDirection;
    readonly cells: readonly MermaidCell[];
    readonly selectedIds: readonly CellId[];
    readonly onSelect: (ids: readonly CellId[]) => void;
    readonly fitToken: number;
    readonly edit: NodeEditHandlers;
    readonly linkEdit: EdgeEditHandlers;
    readonly autoLayout: boolean;
    readonly onAutoLayoutChange: (autoLayout: boolean) => void;
    readonly onDirectionChange: (direction: FlowDirection) => void;
    readonly onAddShape: () => void;
    readonly positionsRef: RefObject<ManualPositions>;
}

function Canvas({
    direction,
    cells,
    selectedIds,
    onSelect,
    fitToken,
    edit,
    linkEdit,
    autoLayout,
    onAutoLayoutChange,
    onDirectionChange,
    onAddShape,
    positionsRef,
}: CanvasProps) {
    const { graph } = useGraph();
    const { paper } = usePaper();
    const { selectCells } = useSelection();
    // The scroller owns panning, wheel scrolling, pinch zoom and the zoom
    // bounds; all this component needs from it is the fit-to-content call.
    const { zoomToFit, paperScroller } = usePaperScroller();

    // The scroller element is the scrollable region, so it must be focusable
    // and labelled (WCAG 2.1.1, axe `scrollable-region-focusable`).
    // `@joint/react-plus` 4.3.2 drops HTML attributes passed to
    // `<PaperScroller>` (clientIO/joint-plus#801), so until that fix ships the
    // attributes go on imperatively.
    useEffect(() => {
        const scrollerElement = paperScroller?.el;
        if (!scrollerElement) return;
        scrollerElement.setAttribute('tabindex', '0');
        scrollerElement.setAttribute('role', 'application');
        scrollerElement.setAttribute('aria-roledescription', 'diagram canvas');
        scrollerElement.setAttribute('aria-label', 'Flowchart canvas — scrollable');
    }, [paperScroller]);

    // Selection is one-way: the app owns it, the canvas renders it and reports
    // clicks upward. Subscribing to the collection here as well would close a
    // loop with the editor's caret, each side re-asserting what the other just
    // said, so the collection is written to and never read from.
    useEffect(() => {
        // A stale id outlives an edit that deleted its node, and selecting a
        // cell the graph no longer holds would throw.
        const selected = selectedIds
            .map((id) => graph.getCell(id))
            .filter((cell): cell is dia.Cell => Boolean(cell));
        // `getSubgraph` adds the links whose *both* ends are in the set, so a
        // caret on `a --> b` selects the edge along with its two nodes. For a
        // single element it returns just that element, which is what a canvas
        // click should do.
        selectCells(graph.getSubgraph(selected));

        // Driving the selection from the caret can pick a node that is off
        // screen, so bring the first one into view. Scrolling only when it is
        // not already visible keeps a click on a node the user can see — or a
        // caret move within the visible part of the diagram — from shifting the
        // canvas under them.
        const [first] = selected.filter((cell): cell is dia.Element => cell.isElement());
        if (!first || !paperScroller) return;
        // A 0×0 element is pre-layout — the graph just remounted and nothing
        // sits at its real position yet. Scrolling would start a 150 ms
        // animation towards a meaningless point that then lands AFTER the
        // post-layout fit and drags the camera off the diagram.
        if (first.size().width === 0) return;
        if (paperScroller.isElementVisible(first, VISIBILITY_OPTIONS)) return;
        paperScroller.scrollToElement(first, SCROLL_OPTIONS);
    }, [graph, paperScroller, selectCells, selectedIds]);
    // A fit is *requested*, then consumed once the graph has been laid out —
    // framing before measurement would frame a graph of 0×0 boxes. Fresh on
    // every mount, so the first render of a graph always frames itself.
    const pendingFit = useRef(true);

    const fit = useCallback(() => zoomToFit(FIT_OPTIONS), [zoomToFit]);

    // One place decides how nodes get their positions: dagre with auto-layout
    // on, the user's own drags (via the position cache) with it off.
    const settle = useCallback(
        (target: dia.Graph): boolean =>
            autoLayout
                ? runLayout(target, direction)
                : applyManualPositions(target, positionsRef.current),
        [autoLayout, direction, positionsRef]
    );

    // Mode transitions — declared BEFORE the settle triggers below, because
    // effects run in declaration order: entering manual must capture the
    // positions the user is looking at before the first manual pass runs, or
    // that pass would treat every node as new and scatter them. Returning to
    // auto re-runs dagre and re-frames: the manual arrangement is the user's,
    // but the auto one is dagre's, and showing it half-off-screen would look
    // like data loss.
    const wasAutoLayout = useRef(autoLayout);
    useEffect(() => {
        if (wasAutoLayout.current === autoLayout) return;
        wasAutoLayout.current = autoLayout;
        if (!paper) return;
        if (autoLayout) {
            if (runLayout(graph, direction)) fit();
            return;
        }
        const positions = positionsRef.current;
        positions.clear();
        for (const element of graph.getElements()) {
            const { x, y } = element.position();
            positions.set(String(element.id), { x, y });
        }
        for (const link of graph.getLinks()) link.unset('vertices');
    }, [autoLayout, direction, fit, graph, paper, positionsRef]);

    // Primary trigger. `useOnElementsMeasured` flushes the paper after the
    // callback, so there is no frame where nodes are visible at their
    // pre-layout position.
    useOnElementsMeasured(({ graph: measuredGraph }) => {
        if (!settle(measuredGraph)) return;
        if (pendingFit.current) {
            pendingFit.current = false;
            // Manual mode frames too: the id-keyed remount rebuilds the
            // scroller alongside the graph, so there is no previous camera
            // to preserve.
            fit();
        }
    });

    // Secondary layout trigger, for edits that change what the layout depends
    // on without changing any element's size.
    //
    // Adding or removing a cell already re-lays-out on its own: it changes the
    // id set, `MermaidDiagram` keys the graph on that, and the remount
    // re-measures. What slips through is an edit that keeps every id and every
    // label — switching `flowchart TD` to `LR`, or lengthening `-->` to `---->`
    // for a wider rank gap. Nothing re-measures there, so `useOnElementsMeasured`
    // never fires and the diagram would keep its old shape. Verified: with this
    // effect removed, `TD` → `LR` leaves the chart vertical.
    //
    // A pending fit is consumed HERE too: when the app raises `fitToken` (a
    // loaded example, the direction switch), the parse lands a commit later,
    // and framing anything earlier would frame the previous layout.
    useEffect(() => {
        if (!paper) return;
        if (!settle(graph)) return;
        if (pendingFit.current) {
            pendingFit.current = false;
            fit();
        }
    }, [cells, fit, graph, paper, settle]);

    // Framing is its own signal, raised by the app when a different diagram is
    // loaded or relaid out wholesale — not on every parse. Typing must not
    // yank the camera around. Only the REQUEST is recorded here; whichever
    // layout pass runs next consumes it against the fresh geometry.
    useEffect(() => {
        pendingFit.current = true;
    }, [fitToken]);

    // The node the pointer is over, driving the add-step "+" under it. The
    // clear is DELAYED: the "+" hangs below the shape, so the pointer leaves
    // the element on its way to the button, and an instant clear would yank
    // the button away mid-travel. Entering the button cancels the clear.
    const [hoveredId, setHoveredId] = useState<CellId | null>(null);
    const hoverClearTimer = useRef<number | null>(null);
    const cancelHoverClear = useCallback(() => {
        if (hoverClearTimer.current !== null) {
            window.clearTimeout(hoverClearTimer.current);
            hoverClearTimer.current = null;
        }
    }, []);
    const scheduleHoverClear = useCallback(() => {
        cancelHoverClear();
        hoverClearTimer.current = window.setTimeout(() => setHoveredId(null), 250);
    }, [cancelHoverClear]);
    useEffect(() => cancelHoverClear, [cancelHoverClear]);

    // Double-click renames in place. The id lives here rather than in the node
    // so that only one node is ever in edit mode, and so the canvas can clear
    // it when the selection moves on.
    const [editingId, setEditingId] = useState<CellId | null>(null);
    const editing = useMemo<NodeEditing>(() => ({
        editingId,
        begin: (id) => setEditingId(id),
        commit: (id, label) => {
            setEditingId(null);
            edit.onLabelChange(id, label);
        },
        cancel: () => setEditingId(null),
    }), [edit, editingId]);

    // Only a lone element gets controls: a caret on `a --> b` selects both
    // ends plus the link, and stacking a toolbar on each would be noise.
    //
    // Read from the declared `cells` rather than the graph. The store applies
    // them in a layout effect, so during the render where `cells` is new the
    // model still holds the previous data — reading it there left the toolbar
    // showing the shape from before the last edit.
    const toolbarCell = selectedIds.length === 1
        ? cells.find((cell) => cell.id === selectedIds[0] && cell.type === 'element')
        : undefined;
    const maybeToolbarData = toolbarCell?.data as NodeData | undefined;
    // Subgraph containers take no shape or fill — their look is the block's.
    const toolbarData = maybeToolbarData?.isGroup ? undefined : maybeToolbarData;

    // The add-step "+" hangs under the hovered node — or the selected one, so
    // it is reachable by keyboard-and-click flows too. Groups take none: a
    // child cannot hang off a subgraph.
    const addTargetId = hoveredId ?? toolbarCell?.id ?? null;
    const addTargetCell = addTargetId === null
        ? undefined
        : cells.find(
            (cell) =>
                cell.id === addTargetId
                && cell.type === 'element'
                && !(cell.data as NodeData).isGroup
        );

    // A lone selected edge gets its own toolbar, floating over the midpoint of
    // its route. The position comes from the model — dagre writes its vertices
    // there — so it is read per render rather than subscribed to; every edit
    // that could move the link also re-renders this component.
    const linkToolbarCell = selectedIds.length === 1
        ? cells.find((cell) => cell.id === selectedIds[0] && cell.type === 'link')
        : undefined;
    const linkToolbarData = linkToolbarCell?.data as EdgeData | undefined;
    const linkModel = linkToolbarCell?.id === undefined
        ? undefined
        : graph.getCell(linkToolbarCell.id);
    const linkAnchor = linkModel?.isLink() ? linkModel.getBBox() : undefined;

    // Exactly two nodes selected (Shift-click) offers to connect them, in
    // selection order. Subgraphs are excluded — dagre cannot route to one.
    const connectPair = selectedIds.length === 2
        ? selectedIds.map((id) =>
            cells.find((cell) =>
                cell.id === id
                && cell.type === 'element'
                && !(cell.data as NodeData).isGroup))
        : undefined;
    const [connectFrom, connectTo] = connectPair ?? [];
    const connectFromId = connectFrom?.id;
    const connectToId = connectTo?.id;

    return (
        <NodeEditingContext value={editing}>
            <div className="canvas-stage">
                <PaperScroller className="mermaid-scroller" cursor="grab" inertia>
                    <Paper
                        className="mermaid-paper"
                        renderElement={RenderNode}
                        drawGrid={false}
                        snapLabels
                        interactive={autoLayout ? PAPER_INTERACTIVE : MANUAL_INTERACTIVE}
                        linkRouting={autoLayout ? LINK_ROUTING : MANUAL_ROUTING}
                        onElementPointerUp={({ model }) => {
                            if (autoLayout) return;
                            // Containers hug their members again after a member
                            // moves — the whole ancestor chain, inner to outer,
                            // so a nested subgraph's outer border tracks too.
                            // Then every position is re-captured: the drag may
                            // have moved embedded children, and the containers
                            // just resized.
                            for (const ancestor of model.getAncestors()) {
                                if (ancestor.isElement()) {
                                    ancestor.fitToChildren({ padding: CLUSTER_PADDING });
                                }
                            }
                            const positions = positionsRef.current;
                            for (const element of graph.getElements()) {
                                const { x, y } = element.position();
                                positions.set(String(element.id), { x, y });
                            }
                        }}
                        onElementPointerClick={({ model, event }) => {
                            // Shift (or the platform modifier) grows the
                            // selection; a plain click replaces it.
                            const isAdditive =
                                event.shiftKey === true
                                || event.metaKey === true
                                || event.ctrlKey === true;
                            if (!isAdditive) {
                                onSelect([model.id]);
                                return;
                            }
                            onSelect(
                                selectedIds.includes(model.id)
                                    ? selectedIds.filter((id) => id !== model.id)
                                    : [...selectedIds, model.id]
                            );
                        }}
                        // An edge is selectable like a node; a lone one opens
                        // the edge toolbar below.
                        onLinkPointerClick={({ model }) => onSelect([model.id])}
                        onElementMouseEnter={({ model }) => {
                            // Subgraph containers are skipped HERE, not just
                            // in the lookup below: a container cannot take a
                            // child, and recording it as hovered would drop
                            // the "+" off the node the user has selected.
                            const cell = cells.find((candidate) => candidate.id === model.id);
                            if ((cell?.data as NodeData | undefined)?.isGroup) return;
                            cancelHoverClear();
                            setHoveredId(model.id);
                        }}
                        onElementMouseLeave={scheduleHoverClear}
                        onElementPointerDblClick={({ model }) => {
                            // Subgraph containers render no label input, so
                            // entering edit mode there would be a dead end.
                            const cell = cells.find((candidate) => candidate.id === model.id);
                            if ((cell?.data as NodeData | undefined)?.isGroup) return;
                            editing.begin(model.id);
                        }}
                        onBlankPointerClick={() => {
                            onSelect([]);
                            editing.cancel();
                        }}
                    >
                        <Selection {...SELECTION} />
                        {toolbarCell?.id !== undefined && toolbarData && (
                            <NodeToolbar
                                // Keyed so toolbar state (an open link editor,
                                // its draft) never survives onto another node.
                                key={String(toolbarCell.id)}
                                cellId={toolbarCell.id}
                                data={toolbarData}
                                edit={edit}
                            />
                        )}
                        {linkToolbarCell?.id !== undefined && linkToolbarData && linkAnchor && (
                            <LinkToolbar
                                key={String(linkToolbarCell.id)}
                                cellId={linkToolbarCell.id}
                                data={linkToolbarData}
                                x={linkAnchor.x + linkAnchor.width / 2}
                                y={linkAnchor.y + linkAnchor.height / 2}
                                edit={linkEdit}
                            />
                        )}
                        {addTargetCell?.id !== undefined && (
                            <ElementOverlay
                                cell={addTargetCell.id}
                                position="bottom"
                                origin="top"
                                dy={-6}
                            >
                                <button
                                    type="button"
                                    className="node-add-below"
                                    aria-label="Add a connected step"
                                    title="Add a connected step"
                                    onPointerDown={(event) => event.stopPropagation()}
                                    // Travelling from the node onto this button
                                    // leaves the element; keep the button alive.
                                    onPointerEnter={cancelHoverClear}
                                    onPointerLeave={scheduleHoverClear}
                                    onClick={() => {
                                        if (addTargetCell.id !== undefined) {
                                            edit.onAddChild(addTargetCell.id);
                                        }
                                    }}
                                >
                                    +
                                </button>
                            </ElementOverlay>
                        )}
                        {connectFrom && connectTo
                            && connectFromId !== undefined && connectToId !== undefined && (
                            <ElementOverlay cell={connectToId} position="top" origin="bottom" dy={-10}>
                                <button
                                    type="button"
                                    className="connect-bar"
                                    onPointerDown={(event) => event.stopPropagation()}
                                    onClick={() => edit.onConnect(connectFromId, connectToId)}
                                >
                                    Connect {(connectFrom.data as NodeData).label}
                                    {' → '}
                                    {(connectTo.data as NodeData).label}
                                </button>
                            </ElementOverlay>
                        )}
                    </Paper>
                </PaperScroller>
                <CanvasActions
                    autoLayout={autoLayout}
                    onAutoLayoutChange={onAutoLayoutChange}
                    direction={direction}
                    onDirectionChange={onDirectionChange}
                    onAddShape={onAddShape}
                />
                <ZoomControls onFit={fit} />
                <AccessibilityCheck />
            </div>
        </NodeEditingContext>
    );
}

/** Edits the node toolbar can request, each rewriting a span of the source. */
export interface NodeEditHandlers {
    readonly onLabelChange: (id: CellId, label: string) => void;
    /** Target is an `EditableShape` or a v11 `@{ shape: … }` name. */
    readonly onShapeChange: (id: CellId, shape: string) => void;
    readonly onFillChange: (id: CellId, fill: string | null) => void;
    /** Sets or clears one property on the node's `style` line. */
    readonly onStyleChange: (id: CellId, property: string, value: string | null) => void;
    /** Sets or removes the node's `click` hyperlink. */
    readonly onLinkChange: (id: CellId, url: string | null) => void;
    /** Sets or removes the node's `@{ img: … }` image. */
    readonly onImageChange: (id: CellId, url: string | null) => void;
    /** Appends a new node connected from this one. */
    readonly onAddChild: (id: CellId) => void;
    /** Appends an edge between two existing nodes. */
    readonly onConnect: (from: CellId, to: CellId) => void;
}

/** Edits the edge toolbar can request, each rewriting a span of the source. */
export interface EdgeEditHandlers {
    /** Rewrites the edge's arrow token — line pattern and heads. */
    readonly onArrowChange: (edge: EdgeRef, change: EdgeArrowChange) => void;
    /** Sets or clears the `linkStyle <n> stroke:` colour. */
    readonly onColorChange: (edgeIndex: number, color: string | null) => void;
    /** Sets or clears the `linkStyle <n> interpolate <curve>` statement. */
    readonly onCurveChange: (edgeIndex: number, curve: string | null) => void;
    /** Turns the marching-dash animation on or off. */
    readonly onAnimationChange: (edge: EdgeRef, animate: boolean) => void;
}

export interface MermaidDiagramProps {
    readonly direction: FlowDirection;
    readonly cells: readonly MermaidCell[];
    /** Ids to show as selected; the app owns this state. */
    readonly selectedIds: readonly CellId[];
    /** Raised when the user clicks a node, or blank space to clear. */
    readonly onSelect: (ids: readonly CellId[]) => void;
    /**
     * Bump to re-frame the diagram. The app raises it when a different example
     * is loaded, so editing never moves the camera.
     */
    readonly fitToken: number;
    /** Writes from the node toolbar, applied to the Mermaid source. */
    readonly edit: NodeEditHandlers;
    /** Writes from the edge toolbar, applied to the Mermaid source. */
    readonly linkEdit: EdgeEditHandlers;
    /** Dagre owns positions when true; the user's drags own them when false. */
    readonly autoLayout: boolean;
    readonly onAutoLayoutChange: (autoLayout: boolean) => void;
    /** Rewrites the `flowchart <dir>` header in the source. */
    readonly onDirectionChange: (direction: FlowDirection) => void;
    /** Appends a top-level, unconnected node — the from-scratch start. */
    readonly onAddShape: () => void;
    /**
     * Where manual-mode positions live. Owned by the app — the canvas below
     * remounts on id changes, and dragged positions must survive that.
     */
    readonly positionsRef: RefObject<ManualPositions>;
}

/**
 * The JointJS canvas. `cells` is fully controlled: every successful parse
 * produces a new array and the graph re-syncs to it.
 *
 * `<Diagram>` supplies the graph plus the built-in pointer interactions the
 * `<PaperScroller>` needs — drag the background to pan, wheel to scroll, pinch
 * to zoom — so none of that has to be wired by hand.
 */
export function MermaidDiagram({
    direction,
    cells,
    selectedIds,
    onSelect,
    fitToken,
    edit,
    linkEdit,
    autoLayout,
    onAutoLayoutChange,
    onDirectionChange,
    onAddShape,
    positionsRef,
}: MermaidDiagramProps) {
    /*
     * Remount the graph whenever the set of cell ids changes.
     *
     * A cell id here is the author's own node name, so renaming a node in the
     * source removes one cell and adds another. Removing a cell while its
     * `renderElement` subtree is still mounted tears the store: the subtree is
     * subscribed to it, so React re-runs its selector on the change and
     * `useMeasureElement`'s `useCell` throws `no cell with id "…"` before the
     * parent gets to unmount it — taking the whole canvas down. Replacing every
     * cell at once does not hit this (switching examples has always worked), so
     * a keyed remount turns the unsafe partial diff into the safe wholesale one.
     *
     * Keyed on the ids alone, so editing a label or an edge — the common case
     * while typing — still flows through as a plain update.
     *
     * Temporary. It goes once the store can drop a cell whose `renderElement`
     * subtree is still mounted; clientIO/joint#3442 carries the minimal repro.
     * Three things here are downstream of it and should go at the same time:
     * the 0×0 pass that `isMeasured` exists to arbitrate, the camera reset on
     * every rename, and a full graph teardown on a single keystroke.
     */
    const graphKey = useMemo(() => cells.map((cell) => cell.id).join(' '), [cells]);

    return (
        <Diagram
            key={graphKey}
            cells={cells}
            autoSizeOrigin="center"
            interactions={INTERACTIONS}
        >
            <Canvas
                direction={direction}
                cells={cells}
                selectedIds={selectedIds}
                onSelect={onSelect}
                fitToken={fitToken}
                edit={edit}
                linkEdit={linkEdit}
                autoLayout={autoLayout}
                onAutoLayoutChange={onAutoLayoutChange}
                onDirectionChange={onDirectionChange}
                onAddShape={onAddShape}
                positionsRef={positionsRef}
            />
        </Diagram>
    );
}
