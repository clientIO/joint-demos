// `dia` comes from `@joint/plus` rather than `@joint/core` so the types are the
// exact ones `@joint/react-plus` is built against — a second `@joint/core` copy
// would make `useGraph()`'s graph unassignable to anything typed from it.
import type { dia } from '@joint/plus';
import { DirectedGraph } from '@joint/layout-directed-graph';
import {
    Diagram,
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
import type { MermaidCell } from '@/mermaid/to-cells';
import type { FlowDirection } from '@/mermaid/types';
import type { EditableShape } from '@/mermaid/edit-source';
import type { NodeData } from '@/mermaid/to-cells';
import { ExportButton } from './export-button';
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
 * The diagram is a rendering of the source, not a canvas to edit: the text is
 * the single source of truth, and a dragged node would be silently discarded on
 * the next keystroke. Panning and zooming are unaffected — the scroller drives
 * those from the blank area, not from cell interactions.
 */
const PAPER_INTERACTIVE = false;

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

function runLayout(graph: dia.Graph, direction: FlowDirection): boolean {
    if (!isMeasured(graph)) return false;
    DirectedGraph.layout(graph, {
        rankDir: direction,
        nodeSep: 46,
        edgeSep: 24,
        rankSep: 64,
        marginX: 20,
        marginY: 20,
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

interface CanvasProps {
    readonly direction: FlowDirection;
    readonly cells: readonly MermaidCell[];
    readonly selectedIds: readonly CellId[];
    readonly onSelect: (ids: readonly CellId[]) => void;
    readonly fitToken: number;
    readonly edit: NodeEditHandlers;
}

function Canvas({ direction, cells, selectedIds, onSelect, fitToken, edit }: CanvasProps) {
    const { graph } = useGraph();
    const { paper } = usePaper();
    const { selectCells } = useSelection();
    // The scroller owns panning, wheel scrolling, pinch zoom and the zoom
    // bounds; all this component needs from it is the fit-to-content call.
    const { zoomToFit, paperScroller } = usePaperScroller();

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
        if (paperScroller.isElementVisible(first, VISIBILITY_OPTIONS)) return;
        paperScroller.scrollToElement(first, SCROLL_OPTIONS);
    }, [graph, paperScroller, selectCells, selectedIds]);
    // A fit is *requested*, then consumed once the graph has been laid out —
    // framing before measurement would frame a graph of 0×0 boxes. Fresh on
    // every mount, so the first render of a graph always frames itself.
    const pendingFit = useRef(true);

    const fit = useCallback(() => zoomToFit(FIT_OPTIONS), [zoomToFit]);

    // Primary trigger. `useOnElementsMeasured` flushes the paper after the
    // callback, so there is no frame where nodes are visible at their
    // pre-layout position.
    useOnElementsMeasured(({ graph: measuredGraph }) => {
        if (!runLayout(measuredGraph, direction)) return;
        if (pendingFit.current) {
            pendingFit.current = false;
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
    // This trigger never re-frames, so a direction flip leaves the camera
    // alone. An edit that changes an id is a different story: it remounts, and
    // `pendingFit` is fresh on every mount, so a rename does re-fit. That is a
    // side effect of the remount below, not a decision.
    useEffect(() => {
        if (!paper) return;
        runLayout(graph, direction);
    }, [cells, direction, graph, paper]);

    // Framing is its own signal, raised by the app when a different diagram is
    // loaded — not on every parse. Typing must not yank the camera around.
    useEffect(() => {
        pendingFit.current = true;
        if (!paper || !isMeasured(graph)) return;
        pendingFit.current = false;
        fit();
    }, [fitToken, fit, graph, paper]);

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
    const toolbarData = toolbarCell?.data as NodeData | undefined;

    return (
        <NodeEditingContext value={editing}>
            <div className="canvas-stage">
                <PaperScroller className="mermaid-scroller" cursor="grab" inertia>
                    <Paper
                        className="mermaid-paper"
                        renderElement={RenderNode}
                        drawGrid={false}
                        snapLabels
                        interactive={PAPER_INTERACTIVE}
                        onElementPointerClick={({ model }) => onSelect([model.id])}
                        onElementPointerDblClick={({ model }) => editing.begin(model.id)}
                        onBlankPointerClick={() => {
                            onSelect([]);
                            editing.cancel();
                        }}
                    >
                        <Selection {...SELECTION} />
                        {toolbarCell?.id !== undefined && toolbarData && (
                            <NodeToolbar
                                cellId={toolbarCell.id}
                                data={toolbarData}
                                onShapeChange={edit.onShapeChange}
                                onFillChange={edit.onFillChange}
                            />
                        )}
                    </Paper>
                </PaperScroller>
                <ExportButton />
                <ZoomControls onFit={fit} />
            </div>
        </NodeEditingContext>
    );
}

/** Edits the node toolbar can request, each rewriting a span of the source. */
export interface NodeEditHandlers {
    readonly onLabelChange: (id: CellId, label: string) => void;
    readonly onShapeChange: (id: CellId, shape: EditableShape) => void;
    readonly onFillChange: (id: CellId, fill: string | null) => void;
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
            />
        </Diagram>
    );
}
