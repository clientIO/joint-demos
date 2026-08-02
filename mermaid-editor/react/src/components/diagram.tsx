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

function runLayout(graph: dia.Graph, direction: FlowDirection): void {
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
}

/** Where the reader left the view: zoom, plus the centre in paper coordinates. */
interface Camera {
    readonly zoom: number;
    readonly x: number;
    readonly y: number;
}

interface CanvasProps {
    readonly direction: FlowDirection;
    readonly cells: readonly MermaidCell[];
    readonly selectedIds: readonly CellId[];
    readonly onSelect: (ids: readonly CellId[]) => void;
    readonly fitToken: number;
    /** Last `fitToken` framed; owned above so it survives the keyed remount. */
    readonly fittedTokenRef: RefObject<number | null>;
    /** Camera carried across the keyed remount; same reason. */
    readonly cameraRef: RefObject<Camera | null>;
    readonly edit: NodeEditHandlers;
}

function Canvas({
    direction,
    cells,
    selectedIds,
    onSelect,
    fitToken,
    fittedTokenRef,
    cameraRef,
    edit,
}: CanvasProps) {
    const { graph } = useGraph();
    const { selectCells } = useSelection();
    // The scroller owns panning, wheel scrolling, pinch zoom and the zoom
    // bounds on its own. What this component asks of it is framing, bringing a
    // selected node into view, and carrying the camera across a remount.
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

    const fit = useCallback(() => zoomToFit(FIT_OPTIONS), [zoomToFit]);

    /*
     * Remember the camera while unmounting.
     *
     * The remount below rebuilds the scroller, and a fresh one starts at 100%
     * centred on nothing in particular — so without this, renaming a node
     * would throw away the reader's pan and zoom. Read here rather than
     * tracked continuously because the scroller reports the whole camera in
     * one go, and this is the only moment it is about to be lost.
     */
    useEffect(() => {
        if (!paperScroller) return;
        return () => {
            const { x, y } = paperScroller.getVisibleArea().center();
            cameraRef.current = { zoom: paperScroller.zoom(), x, y };
        };
    }, [cameraRef, paperScroller]);

    /*
     * The one place the diagram is laid out and framed.
     *
     * Dagre reads element sizes, so it must not run before they are measured —
     * and here it cannot: this fires only once every element has reported its
     * size. Anything that changes what the layout depends on is routed through
     * a remount by `graphKey` below, which re-measures and comes back here, so
     * there is no second trigger racing this one on an unmeasured graph.
     * `useOnElementsMeasured` also flushes the paper afterwards, so no frame
     * shows a node at its pre-layout position.
     *
     * Framing is deliberately not tied to the remount, which happens on
     * something as small as a rename. It follows `fitToken` instead — raised by
     * the app only when a different diagram is loaded — so editing leaves the
     * camera where the reader put it.
     */
    useOnElementsMeasured(({ graph: measuredGraph }) => {
        runLayout(measuredGraph, direction);
        if (fittedTokenRef.current !== fitToken) {
            fittedTokenRef.current = fitToken;
            cameraRef.current = null;
            fit();
            return;
        }
        const camera = cameraRef.current;
        if (!camera || !paperScroller) return;
        // Consumed, not merely read: elements re-measure while the graph is
        // alive — zooming alone is enough — and re-applying a camera saved
        // before the last remount would snap the view back out from under
        // whoever had just moved it.
        cameraRef.current = null;
        paperScroller.zoom(camera.zoom, { absolute: true });
        paperScroller.center(camera.x, camera.y);
    });

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
     * The key carries the rest of the layout's inputs too, because a remount
     * re-measures and re-measuring is what triggers the layout. Direction and
     * rank length change what dagre produces without changing any element's
     * size — `flowchart TD` to `LR`, or `-->` lengthened to `---->` — so on
     * their own they would leave the diagram in its old shape. Routing them
     * through the same remount keeps one layout trigger, instead of a second
     * one that has to guard against firing before measurement.
     *
     * `fitToken` is here for the same reason: framing is done from the measured
     * callback, so loading a new example has to reach it even in the rare case
     * where the new diagram reuses every id of the old one.
     *
     * Editing a label still flows through as a plain update — it re-measures
     * on its own.
     */
    const graphKey = useMemo(() => {
        const cellKeys = cells.map((cell) =>
            cell.type === 'link' ? `${cell.id}~${cell.data?.minLen ?? 1}` : cell.id);
        return [fitToken, direction, ...cellKeys].join(' ');
    }, [cells, direction, fitToken]);

    // Survives the remount above, which is what lets framing follow `fitToken`
    // rather than firing on every keyed rebuild.
    const fittedTokenRef = useRef<number | null>(null);
    const cameraRef = useRef<Camera | null>(null);

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
                fittedTokenRef={fittedTokenRef}
                cameraRef={cameraRef}
                edit={edit}
            />
        </Diagram>
    );
}
