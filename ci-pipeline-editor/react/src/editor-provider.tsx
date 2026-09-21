import { dia } from '@joint/plus';
import { useGraph, usePaper, usePaperScroller, useSelectionCollection } from '@joint/react-plus';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';

import { addBelow, canDelete, canMoveBelow, canMoveOnLink, deleteElement, getMovedCells, hasMoveTarget, insertOnLink, moveBelow, moveOnLink, toggleGroup } from './actions';
import type { MenuRequest } from './components/menu';
import { buildGraph, getId } from './data/build';
import type { Id } from './data/types';
import { DiagramData } from './data/diagram-data';
import { EditorContext, MAX_ZOOM, MIN_ZOOM, PAPER_ID } from './editor-context';
import type { EditorApi } from './editor-context';
import { getVisibleBBox, isCellVisible, runLayout } from './layout';
import { example } from './data/example';
import { NO_MARKS, getCollapseMarks, getDeletionMarks, getMoveMarks, getMovingMarks } from './highlights';
import type { Marks } from './highlights';

const PAPER_PADDING = 40;
/** How close the fit goes, at most: a narrow flow is shown at its size, not blown up. */
const FIT_MAX_ZOOM = 1;
const ZOOM_STEP = 0.2;

/** An event emitter of JointJS: the data, the history. */
interface Emitter {
    on(events: string, handler: () => void): unknown;
    off(events: string, handler: () => void): unknown;
}

/** Subscribes to `events` of `emitter` for `useSyncExternalStore`. */
function useEmitter(emitter: Emitter, events: string): (notify: () => void) => () => void {
    return useCallback((notify) => {
        emitter.on(events, notify);
        return () => {
            emitter.off(events, notify);
        };
    }, [emitter, events]);
}

/** A counter of the `events` of `emitter`: what depends on its state re-renders on every one. */
function useEventCounter(emitter: Emitter, events: string): number {
    const counter = useRef(0);
    const subscribe = useEmitter(emitter, events);
    return useSyncExternalStore(
        useCallback((notify) => subscribe(() => {
            counter.current += 1;
            notify();
        }), [subscribe]),
        () => counter.current
    );
}

/** Whether the history has something to undo and to redo, kept up to date with its stack. */
function useHistoryState(history: dia.CommandManager): { canUndo: boolean; canRedo: boolean } {
    const snapshot = useRef({ canUndo: false, canRedo: false });
    return useSyncExternalStore(useEmitter(history, 'stack'), () => {
        const canUndo = history.hasUndo();
        const canRedo = history.hasRedo();
        if (snapshot.current.canUndo !== canUndo || snapshot.current.canRedo !== canRedo) snapshot.current = { canUndo, canRedo };
        return snapshot.current;
    });
}

/**
 * Holds the data, the history and the state of the editor, and provides
 * the editor to every component. The graph is rebuilt from the data after
 * every edit, undo and redo, and laid out.
 * Rendered inside `<Diagram>`, around the paper and the panels.
 */
export function EditorProvider({ children }: { children: ReactNode }): ReactNode {
    const { graph } = useGraph();
    const [data] = useState(() => {
        const model = new DiagramData();
        model.fromJSON(example);
        return model;
    });
    const [history] = useState(() => new dia.CommandManager({ model: data }));
    // The paper and its scroller, by id: `null` until `<Paper>` has mounted, one and the same afterwards.
    const { paper } = usePaper(PAPER_ID);
    const { paperScroller, setZoom } = usePaperScroller(PAPER_ID);
    // The selection is `<Diagram>`'s collection (see `components/selection.tsx`).
    const { collection: selection, selectCells } = useSelectionCollection();
    // The move in progress: the element, and the marks of the move - the dimmed subtree, the buttons that cannot take it. Set where the state changes: a move starts or ends, or the graph is rebuilt.
    const [move, setMove] = useState<{ element: dia.Element; marks: Marks } | null>(null);
    const getMoveState = useCallback((element: dia.Element) => ({
        element,
        marks: getMovingMarks(graph, getMovedCells(graph, data, getId(element)), (parent) => canMoveBelow(graph, data, getId(element), parent))
    }), [graph, data]);
    // The marks of the previews, one set each: a hovered "remove" item, a hovered collapse button, a hovered "move" item.
    const [previews, setPreviews] = useState<{ deletion: Marks; collapse: Marks; move: Marks }>({ deletion: NO_MARKS, collapse: NO_MARKS, move: NO_MARKS });
    const preview = useCallback((kind: 'deletion' | 'collapse' | 'move', previewMarks: Marks): void => setPreviews((previous) => ({ ...previous, [kind]: previewMarks })), []);
    const [menu, setMenu] = useState<MenuRequest | null>(null);

    // The data changes on every edit; the history stack on every command, undo and redo.
    const version = useEventCounter(data, 'change');
    const { canUndo, canRedo } = useHistoryState(history);

    /** Builds the graph from the data and lays it out; the sizes come from what React measured (see `shapes/`). */
    const build = useCallback(() => {
        buildGraph(graph, data.getData());
        runLayout(graph, graph.getCell(data.getRootId()) as dia.Element);
        // A selected element that the edit removed, or hid, leaves the selection.
        const kept = selection.filter((cell) => graph.getCell(cell.id) === cell && isCellVisible(cell));
        if (kept.length < selection.length) selection.reset(kept);
        paper?.updateCellsVisibility();
    }, [graph, data, paper, selection]);

    /**
     * The build after a command of the history. A move whose element the
     * command removed - an undo, a redo, `Delete` - is off: the build keeps
     * a cell that stands for the same node, another instance means the node
     * was gone in between. One that goes on gets its marks again, on the
     * rebuilt graph.
     */
    const rebuild = useCallback(() => {
        build();
        setMove((current) => (current && graph.getCell(current.element.id) === current.element ? getMoveState(current.element) : null));
    }, [build, graph, getMoveState]);

    // The first build - no move is on yet; then one after every command of the history.
    useEffect(() => {
        if (graph.getCells().length === 0) build();
    }, [graph, build]);
    const subscribeToCommands = useEmitter(history, 'stack:push stack:undo stack:redo');
    useEffect(() => subscribeToCommands(rebuild), [subscribeToCommands, rebuild]);

    const moved = move?.element ?? null;

    // The marks on the cells: the move in progress and, over it, the previews.
    const marks = useMemo<Marks>(() => {
        const all = [move?.marks ?? NO_MARKS, previews.deletion, previews.collapse, previews.move].filter((set) => set.size > 0);
        return all.length <= 1 ? (all[0] ?? NO_MARKS) : new Map(all.flatMap((set) => [...set]));
    }, [move, previews]);

    const fit = useCallback(() => {
        const bbox = getVisibleBBox(graph);
        if (!bbox || !paperScroller) return;
        // The widest part of the flow fills the width of the view, with a
        // margin; the flow is read from the top down by scrolling. Not closer
        // than 1:1 - a flow that is a mere line stays its size. Centered, and
        // at the top, where the flow starts - even when it is short.
        const { width } = paperScroller.getClientSize();
        const scale = Math.min(FIT_MAX_ZOOM, Math.max(MIN_ZOOM, (width - 2 * PAPER_PADDING) / bbox.width));
        paperScroller.zoom(scale, { absolute: true });
        paperScroller.positionRect(bbox, 'top', { padding: PAPER_PADDING });
    }, [graph, paperScroller]);

    /** The whole visible content in the view, centered - the toolbar's "zoom to fit". Not closer than 1:1 either. */
    const zoomToFit = useCallback(() => {
        const bbox = getVisibleBBox(graph);
        if (bbox) paperScroller?.zoomToRect(bbox, { padding: PAPER_PADDING, minScale: MIN_ZOOM, maxScale: FIT_MAX_ZOOM });
    }, [graph, paperScroller]);

    const editor = useMemo<EditorApi>(() => {
        const movedId = (): Id => getId(moved!);
        const endMove = (): string => {
            const id = movedId();
            setMove(null);
            return id;
        };
        return {
            data,
            graph,
            version,
            moved,
            canMove: (element) => hasMoveTarget(graph, data, getId(element)),
            startMove: (element) => setMove(getMoveState(element)),
            cancelMove: () => setMove(null),
            canDropBelow: (parent) => moved !== null && canMoveBelow(graph, data, movedId(), parent),
            canDropOnLink: (link) => moved !== null && canMoveOnLink(graph, data, movedId(), link),
            dropBelow: (parent) => moveBelow(data, endMove(), parent),
            dropOnLink: (link) => moveOnLink(data, endMove(), link),
            addBelow: (parent, choice) => addBelow(data, parent, choice),
            insertOnLink: (link, choice) => insertOnLink(data, link, choice),
            remove: (target) => {
                preview('deletion', NO_MARKS);
                if (!canDelete(graph, target)) return;
                // The selection goes with what is removed: an undo brings the element back, not the selection.
                selectCells([]);
                deleteElement(graph, data, target);
            },
            toggleGroup: (group) => {
                preview('collapse', NO_MARKS);
                toggleGroup(data, group);
            },
            previewDeletion: (target) => preview('deletion', target ? getDeletionMarks(graph, target) : NO_MARKS),
            previewCollapse: (group) => preview('collapse', group ? getCollapseMarks(graph, group) : NO_MARKS),
            previewMove: (target) => preview('move', target ? getMoveMarks(getMovedCells(graph, data, getId(target))) : NO_MARKS),
            marks,
            menu,
            openMenu: setMenu,
            closeMenu: () => setMenu(null),
            undo: () => history.undo(),
            redo: () => history.redo(),
            canUndo,
            canRedo,
            reset: () => {
                setMove(null);
                selectCells([]);
                data.reset();
                fit();
            },
            zoomIn: () => setZoom((zoom) => Math.min(MAX_ZOOM, zoom + ZOOM_STEP)),
            zoomOut: () => setZoom((zoom) => Math.max(MIN_ZOOM, zoom - ZOOM_STEP)),
            zoomToFit,
            fit
        };
    }, [data, graph, setZoom, version, selectCells, moved, marks, menu, history, canUndo, canRedo, zoomToFit, fit, getMoveState, preview]);

    return <EditorContext.Provider value={editor}>{children}</EditorContext.Provider>;
}
