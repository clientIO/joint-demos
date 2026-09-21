import { dia } from '@joint/plus';
import { useGraph, useOnElementsMeasured, useOnKeyboardEvents, useOnPaperEvents, usePaper, usePaperScroller, useSelectionCollection } from '@joint/react-plus';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';

import { addBelow, canDelete, canMoveBelow, canMoveOnLink, deleteElement, getActionTarget, getMovedCells, hasMoveTarget, insertOnLink, moveBelow, moveOnLink, toggleGroup } from './actions';
import type { MenuRequest } from './components/menu';
import { buildGraph, getId } from './data/build';
import type { Id } from './data/types';
import { DiagramData } from './data/diagram-data';
import { EditorContext, MAX_ZOOM, MIN_ZOOM, PAPER_ID, useEditor } from './editor-context';
import { getElementMenu } from './shapes/buttons';
import type { EditorApi } from './editor-context';
import { getVisibleBBox, isCellVisible, runLayout } from './layout';
import { example } from './data/example';
import { GroupModel } from './shapes';
import { clearDeletionHighlight, clearFaded, clearMoveHighlight, highlightCollapse, highlightDeletion, highlightMove, markMove } from './highlights';

const PAPER_PADDING = 40;
/** How close the fit goes, at most: a narrow flow is shown at its size, not blown up. */
const FIT_MAX_ZOOM = 1;
const ZOOM_STEP = 0.2;

/** Subscribes to `events` of an event emitter of JointJS; a counter of them, for `useSyncExternalStore`. */
function useEventCounter(emitter: { on: (events: string, handler: () => void) => unknown; off: (events: string, handler: () => void) => unknown }, events: string): number {
    const counter = useRef(0);
    return useSyncExternalStore(
        useCallback((notify) => {
            const handler = (): void => {
                counter.current += 1;
                notify();
            };
            emitter.on(events, handler);
            return () => {
                emitter.off(events, handler);
            };
        }, [emitter, events]),
        () => counter.current
    );
}

/**
 * Holds the data, the history and the state of the editor, and provides
 * the editor to every component. The graph is rebuilt from the data after
 * every edit, undo and redo, and laid out; the paper is frozen meanwhile.
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
    // The paper and its scroller, by id: `null` until `<Paper>` has mounted.
    const { paper } = usePaper(PAPER_ID);
    const scroller = usePaperScroller(PAPER_ID);
    // The selection is `<Diagram>`'s collection, drawn by `<Selection>` (see `EditorWiring`).
    const { collection: selection, selectCells } = useSelectionCollection();
    const [movedElement, setMoved] = useState<dia.Element | null>(null);
    const [menu, setMenu] = useState<MenuRequest | null>(null);

    // The data changes on every edit; the history stack on every command, undo and redo.
    const version = useEventCounter(data, 'change');
    const stackVersion = useEventCounter(history, 'stack');
    const canUndo = history.hasUndo();
    const canRedo = history.hasRedo();

    /** Builds the graph from the data and lays it out; the sizes come from what React measured (see `shapes/`). */
    const rebuild = useCallback(() => {
        paper?.freeze();
        buildGraph(graph, data.getData());
        runLayout(graph, graph.getCell(data.getRootId()) as dia.Element);
        // A selected element that the edit removed, or hid, leaves the
        // selection - while the paper is frozen: the frame of a hidden
        // element comes off its view, which is gone once the paper hides it.
        const kept = selection.filter((cell) => graph.getCell(cell.id) === cell && isCellVisible(cell));
        if (kept.length < selection.length) selection.reset(kept);
        paper?.unfreeze();
        paper?.updateCellsVisibility();
    }, [graph, data, paper, selection]);

    // The first build; then one after every command of the history.
    useEffect(() => {
        if (graph.getCells().length === 0) rebuild();
        history.on('stack:push stack:undo stack:redo', rebuild);
        return () => {
            history.off('stack:push stack:undo stack:redo', rebuild);
        };
    }, [graph, history, rebuild]);

    // A move whose element an edit removed - an undo, a redo, `Delete` - is off. The build keeps a cell that stands for the same node; another instance means the node was gone in between.
    const moved = movedElement && graph.getCell(movedElement.id) === movedElement ? movedElement : null;

    // The marks of a move: the dimmed subtree, the buttons that cannot take it.
    useEffect(() => {
        if (!paper) return;
        const movedCells = moved ? getMovedCells(graph, data, getId(moved)) : null;
        markMove(paper, movedCells, (parent) => moved !== null && canMoveBelow(graph, data, getId(moved), parent));
    }, [graph, data, paper, moved, stackVersion]);

    const fit = useCallback(() => {
        const bbox = getVisibleBBox(graph);
        const paperScroller = scroller.paperScroller;
        if (!bbox || !paperScroller) return;
        // The widest part of the flow fills the width of the view, with a
        // margin; the flow is read from the top down by scrolling. Not closer
        // than 1:1 - a flow that is a mere line stays its size. Centered, and
        // at the top, where the flow starts - even when it is short.
        const { width } = paperScroller.getClientSize();
        const scale = Math.min(FIT_MAX_ZOOM, Math.max(MIN_ZOOM, (width - 2 * PAPER_PADDING) / bbox.width));
        paperScroller.zoom(scale, { absolute: true });
        paperScroller.positionRect(bbox, 'top', { padding: PAPER_PADDING });
    }, [graph, scroller]);

    /** The whole visible content in the view, centered - the toolbar's "zoom to fit". Not closer than 1:1 either. */
    const zoomToFit = useCallback(() => {
        const bbox = getVisibleBBox(graph);
        if (bbox) scroller.paperScroller?.zoomToRect(bbox, { padding: PAPER_PADDING, minScale: MIN_ZOOM, maxScale: FIT_MAX_ZOOM });
    }, [graph, scroller]);

    const editor = useMemo<EditorApi>(() => {
        const movedId = (): Id => getId(moved!);
        const endMove = (): string => {
            const id = movedId();
            setMoved(null);
            return id;
        };
        return {
            data,
            graph,
            version,
            moved,
            canMove: (element) => hasMoveTarget(graph, data, getId(element)),
            startMove: (element) => setMoved(element),
            cancelMove: () => setMoved(null),
            canDropBelow: (parent) => moved !== null && canMoveBelow(graph, data, movedId(), parent),
            canDropOnLink: (link) => moved !== null && canMoveOnLink(graph, data, movedId(), link),
            dropBelow: (parent) => moveBelow(data, endMove(), parent),
            dropOnLink: (link) => moveOnLink(data, endMove(), link),
            addBelow: (parent, choice) => addBelow(data, parent, choice),
            insertOnLink: (link, choice) => insertOnLink(data, link, choice),
            remove: (target) => {
                clearDeletionHighlight();
                if (!canDelete(graph, target)) return;
                // The selection goes with what is removed: an undo brings the element back, not the selection.
                selectCells([]);
                deleteElement(graph, data, target);
            },
            toggleGroup: (group) => {
                clearFaded();
                toggleGroup(data, group);
            },
            previewDeletion: (target) => {
                if (target && paper) highlightDeletion(paper, target); else clearDeletionHighlight();
            },
            previewCollapse: (group) => {
                if (group && paper) highlightCollapse(paper, group); else clearFaded();
            },
            previewMove: (target) => {
                if (target && paper) highlightMove(paper, getMovedCells(graph, data, getId(target))); else clearMoveHighlight();
            },
            menu,
            openMenu: setMenu,
            closeMenu: () => setMenu(null),
            undo: () => history.undo(),
            redo: () => history.redo(),
            canUndo,
            canRedo,
            reset: () => {
                setMoved(null);
                selectCells([]);
                data.reset();
                fit();
            },
            zoomIn: () => scroller.setZoom((zoom) => Math.min(MAX_ZOOM, zoom + ZOOM_STEP)),
            zoomOut: () => scroller.setZoom((zoom) => Math.max(MIN_ZOOM, zoom - ZOOM_STEP)),
            zoomToFit,
            fit
        };
    }, [data, graph, paper, scroller, version, selectCells, moved, menu, history, canUndo, canRedo, zoomToFit, fit]);

    return <EditorContext.Provider value={editor}>{children}</EditorContext.Provider>;
}

/**
 * The wiring on the paper side, rendered inside `<Paper>` (and inside
 * `<PaperScroller>`), where the hooks on the paper's events live: lays the
 * diagram out once the sizes of the elements are measured, opens the menu
 * on a right click, pans on a drag of the blank area, and binds the keys
 * of the history. The selection is `<DiagramSelection>`'s (`components/`).
 */
export function EditorWiring(): null {
    const editor = useEditor();
    const scroller = usePaperScroller();
    const { graph } = useGraph();

    // The sizes of the elements come from what React renders (see `shapes/`):
    // once they are measured, the diagram is laid out - and fitted into the
    // view the first time. The store reports every change of a size, the
    // layout's own included - the groups are sized around their content -
    // so the layout runs only when a measured size changed since the last.
    // The paper mounts the views in batches, so the sizes land over several
    // passes: the view is fitted after each of them, until the user takes over.
    const laidOut = useRef('');
    const fitPending = useRef(true);
    useEffect(() => {
        if (editor.version > 0) fitPending.current = false;
    }, [editor.version]);
    useOnElementsMeasured(() => {
        const signature = graph.getElements()
            .filter((element) => !GroupModel.isGroup(element))
            .map((element) => `${element.id}:${Math.round(element.size().width)}x${Math.round(element.size().height)}`)
            .join(' ');
        if (signature === laidOut.current) return;
        laidOut.current = signature;
        const root = graph.getCell(editor.data.getRootId());
        if (root) runLayout(graph, root as dia.Element);
        if (fitPending.current) editor.fit();
    });

    useOnPaperEvents({
        onElementPointerClick: () => {
            fitPending.current = false;
        },
        onBlankPointerClick: () => editor.cancelMove(),
        // A right click on an element opens the menu of its "more" button, at the pointer.
        onElementContextMenu: ({ model, event }) => {
            event.preventDefault();
            if (editor.moved || !model.isElement()) return;
            const target = getActionTarget(model);
            if (!target || !canDelete(graph, target)) return;
            editor.openMenu(getElementMenu(editor, target, new DOMRect(event.clientX, event.clientY, 0, 0)));
        },
        onBlankPointerDown: ({ event }) => {
            fitPending.current = false;
            scroller.startPaperPan(event);
        },
        onPaperMouseWheel: () => {
            fitPending.current = false;
        }
    });

    useOnKeyboardEvents({
        'ctrl+z command+z': (evt) => {
            evt.preventDefault();
            editor.undo();
        },
        'ctrl+shift+z command+shift+z ctrl+y': (evt) => {
            evt.preventDefault();
            editor.redo();
        },
    });

    return null;
}
