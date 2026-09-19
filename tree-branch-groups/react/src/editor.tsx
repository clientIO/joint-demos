import { dia } from '@joint/plus';
import { useGraph, useOnElementsMeasured, useOnKeyboardEvents, useOnPaperEvents, usePaper, usePaperScroller } from '@joint/react-plus';
import { useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';

import { addBelow, canDelete, canMoveBelow, canMoveOnLink, deleteElement, getMovedCells, hasMoveTarget, insertOnLink, moveBelow, moveOnLink, toggleGroup } from './actions';
import type { MenuRequest } from './choices';
import { buildGraph } from './data/build';
import { DiagramData } from './data/DiagramData';
import { EditorContext, MAX_ZOOM, MIN_ZOOM, ViewContext, isSelectable, useEditor } from './editor-context';
import type { EditorApi, View } from './editor-context';
import { isCellVisible, runLayout } from './layout';
import { pipeline } from './pipeline';
import { Group, GroupStart } from './shapes';
import { clearDeletionHighlight, highlightDeletion, markMove } from './tools';

const PAPER_PADDING = 40;
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
        model.fromJSON(pipeline);
        return model;
    });
    const [history] = useState(() => new dia.CommandManager({ model: data }));
    const viewRef = useRef<View | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [moved, setMoved] = useState<dia.Element | null>(null);
    const [menu, setMenu] = useState<MenuRequest | null>(null);

    // The data changes on every edit; the history stack on every command, undo and redo.
    const version = useEventCounter(data, 'change');
    const stackVersion = useEventCounter(history, 'stack');
    const canUndo = history.hasUndo();
    const canRedo = history.hasRedo();

    /** Builds the graph from the data and lays it out; the sizes come from what React measured (see `cells/`). */
    const rebuild = useCallback(() => {
        const paper = viewRef.current?.paper;
        paper?.freeze();
        buildGraph(graph, data.getData());
        runLayout(graph, graph.getCell(data.getRootId()) as dia.Element);
        paper?.unfreeze();
        paper?.updateCellsVisibility();
    }, [graph, data]);

    // The first build; then one after every command of the history.
    useEffect(() => {
        if (graph.getCells().length === 0) rebuild();
        history.on('stack:push stack:undo stack:redo', rebuild);
        return () => {
            history.off('stack:push stack:undo stack:redo', rebuild);
        };
    }, [graph, history, rebuild]);

    // A selected element that an edit removed, or hid, is not selected any more.
    const selectedCell = selectedId === null ? undefined : graph.getCell(selectedId);
    const effectiveSelectedId = selectedCell && isCellVisible(selectedCell) ? selectedId : null;

    // The marks of a move: the dimmed subtree, the buttons that cannot take it.
    useEffect(() => {
        const paper = viewRef.current?.paper;
        if (!paper) return;
        const movedCells = moved ? getMovedCells(graph, data, String(moved.id)) : null;
        markMove(paper, movedCells, (parent) => moved !== null && canMoveBelow(graph, data, String(moved.id), parent));
    }, [graph, data, moved, stackVersion]);

    const fit = useCallback(() => {
        const view = viewRef.current;
        if (!view) return;
        const bbox = graph.getCellsBBox(graph.getElements().filter(isCellVisible));
        if (!bbox) return;
        view.scroller.zoomToFit({ contentArea: bbox, padding: PAPER_PADDING, minScale: MIN_ZOOM, maxScale: 1, useModelGeometry: true });
        // Centered, and at the top, where the flow starts - even when it is short.
        view.scroller.paperScroller?.positionRect(bbox, 'top', { padding: PAPER_PADDING });
    }, [graph]);

    const setView = useCallback((view: View | null) => {
        viewRef.current = view;
    }, []);

    const editor = useMemo<EditorApi>(() => {
        const movedId = (): string => String(moved!.id);
        const endMove = (): string => {
            const id = movedId();
            setMoved(null);
            return id;
        };
        return {
            data,
            graph,
            version,
            selectedId: effectiveSelectedId,
            select: setSelectedId,
            moved,
            canMove: (element) => hasMoveTarget(graph, data, String(element.id)),
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
                setSelectedId(null);
                deleteElement(graph, data, target);
            },
            toggleGroup: (group) => toggleGroup(data, group),
            previewDeletion: (target) => {
                const paper = viewRef.current?.paper;
                if (target && paper) highlightDeletion(paper, target); else clearDeletionHighlight();
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
                setSelectedId(null);
                data.reset();
                fit();
            },
            zoomIn: () => viewRef.current?.scroller.setZoom((zoom) => Math.min(MAX_ZOOM, zoom + ZOOM_STEP)),
            zoomOut: () => viewRef.current?.scroller.setZoom((zoom) => Math.max(MIN_ZOOM, zoom - ZOOM_STEP)),
            fit
        };
    }, [data, graph, version, effectiveSelectedId, moved, menu, history, canUndo, canRedo, fit]);

    return (
        <ViewContext.Provider value={setView}>
            <EditorContext.Provider value={editor}>{children}</EditorContext.Provider>
        </ViewContext.Provider>
    );
}

/**
 * The wiring on the paper side, rendered inside `<Paper>` (and inside
 * `<PaperScroller>`): hands the paper and the scroller to the provider, lays
 * the diagram out once the sizes of the elements are measured, selects on a
 * click, pans on a drag of the blank area, and binds the keys.
 */
export function EditorWiring(): null {
    const setView = useContext(ViewContext)!;
    const editor = useEditor();
    const { paper } = usePaper();
    const scroller = usePaperScroller();
    const { graph } = useGraph();

    useEffect(() => {
        if (!paper) return;
        setView({ paper, scroller });
        return () => setView(null);
    }, [paper, scroller, setView]);

    // The sizes of the elements come from what React renders (see `cells/`):
    // once they are measured, the diagram is laid out - and fitted into the
    // view the first time. The store reports every change of a size, the
    // layout's own included - the groups are sized around their content -
    // so the layout runs only when a measured size changed since the last.
    const laidOut = useRef('');
    useOnElementsMeasured(({ isInitial }) => {
        const signature = graph.getElements()
            .filter((element) => !Group.isGroup(element))
            .map((element) => `${element.id}:${Math.round(element.size().width)}x${Math.round(element.size().height)}`)
            .join(' ');
        if (signature === laidOut.current) return;
        laidOut.current = signature;
        const root = graph.getCell(editor.data.getRootId());
        if (root) runLayout(graph, root as dia.Element);
        if (isInitial) editor.fit();
    });

    useOnPaperEvents({
        onElementPointerClick: ({ model }) => {
            if (isSelectable(model)) editor.select(String(model.id));
        },
        onBlankPointerClick: () => {
            editor.select(null);
            editor.cancelMove();
        },
        onBlankPointerDown: ({ event }) => scroller.startPaperPan(event)
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
        escape: () => {
            if (editor.moved) editor.cancelMove(); else editor.select(null);
        },
        // `Delete` on the selected element does what the "remove" item of its menu does.
        'delete backspace': (evt) => {
            if (!editor.selectedId) return;
            evt.preventDefault();
            const selected = graph.getCell(editor.selectedId);
            if (!selected?.isElement()) return;
            const target = GroupStart.isGroupStart(selected) ? selected.getParentCell() : selected;
            if (target?.isElement()) editor.remove(target);
        }
    });

    return null;
}
