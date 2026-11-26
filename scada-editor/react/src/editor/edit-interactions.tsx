import { useContext, useEffect, useRef } from 'react';
import { useGraph, useOnPaperEvents, usePaperScroller, useSelectionCollection, useStencil } from '@joint/react-plus';
import { dia } from '@joint/plus';
import { isShapeData } from '../shapes/shape-data';
import { clickTarget, toggledSelection } from './group-levels';
import { nextTag, seriesOf } from './new-cells';
import { PAPER_ID } from './paper-id';
import { isDuplicateEvent, StencilDragContext } from './stencil-drag';
import { usePreferences } from './preferences';

/*
 * The pointer on the canvas while editing, beyond the diagram's own (a click selects the cell, a drag of the blank
 * canvas pans it, a drag with Shift selects a region):
 * - a click on a member of a group selects the group, a click on a member of the selected group the member (one
 *   level further in); with Cmd / Ctrl the cell of the level of the selection added or removed;
 * - *Move selected shapes only*: a press on a shape not selected (nor the group it would move) pans the canvas;
 * - a drag with Cmd / Ctrl drags a copy of the shape (or of the connection, detached from what it connected); the
 *   original stays where it is, connected.
 */

/** Hands the drag of the stencil it is in over to the canvas (see `StencilDragContext`). */
export function StencilDragBridge() {
    const { startCellDrag } = useStencil();
    const dragRef = useContext(StencilDragContext);
    useEffect(() => {
        dragRef.current = startCellDrag;
        return () => {
            dragRef.current = null;
        };
    }, [dragRef, startCellDrag]);
    return null;
}

/** The cell's data with an ID of its own: the next free one of its series (none if it had none). */
function withFreeTag(cell: dia.Cell, graph: dia.Graph): void {
    const data: unknown = cell.get('data');
    if (!isShapeData(data) || !data.tag) {
        return;
    }
    const used = graph.getCells().flatMap((each) => {
        const eachData: unknown = each.get('data');
        return isShapeData(eachData) && eachData.tag ? [eachData.tag] : [];
    });
    cell.set('data', { ...data, tag: nextTag(seriesOf(data.tag) ?? 'ID', used) });
}

/** A copy of the cell to drag: out of its group, a link detached at its ends where they are drawn. */
function copyToDrag(view: dia.CellView, graph: dia.Graph): dia.Cell {
    const copy = view.model.clone();
    copy.unset('parent');
    withFreeTag(copy, graph);
    if (view instanceof dia.LinkView && copy.isLink()) {
        copy.source(view.sourcePoint.toJSON());
        copy.target(view.targetPoint.toJSON());
    }
    return copy;
}

/** The pointer on the canvas while editing (see above). */
export function EditInteractions() {
    const { graph } = useGraph();
    const { collection, selectCells } = useSelectionCollection();
    const { startPaperPan } = usePaperScroller(PAPER_ID);
    const stencilDrag = useContext(StencilDragContext);
    const [preferences] = usePreferences();
    // The selection when the cell was pressed: what its click selects depends on it (the diagram's own click has
    // selected the cell by then).
    const selectedAtPress = useRef<readonly dia.Cell[]>([]);
    // A press with Cmd / Ctrl not moved yet: a click with it is a click (it adds to the selection).
    const duplicatePress = useRef<dia.CellView | null>(null);

    const onPress = (view: dia.CellView, event: dia.Event) => {
        selectedAtPress.current = collection.toArray();
        duplicatePress.current = null;
        if (isDuplicateEvent(event)) {
            view.preventDefaultInteraction(event);
            duplicatePress.current = view;
            return;
        }
        if (!preferences.moveSelectedOnly) {
            return;
        }
        // What the drag would move: the element or the group it is in, the link.
        const moved = view instanceof dia.ElementView ? view.getDelegatedView() : view;
        if (moved && collection.has(moved.model)) {
            return;
        }
        view.preventDefaultInteraction(event);
        startPaperPan(event);
    };

    /** The first move of a press with Cmd / Ctrl: a copy dragged from now on, selected when it is dropped. */
    const onMove = (view: dia.CellView, event: dia.Event) => {
        if (duplicatePress.current !== view) {
            return;
        }
        duplicatePress.current = null;
        stencilDrag.current?.(copyToDrag(view, graph), event, { onCellDrop: ({ model }) => selectCells([model.id]) });
    };

    // After the diagram's own `cell:pointerclick` (the core triggers `element:` / `link:pointerclick` after it).
    const onClick = (view: dia.CellView, event: dia.Event) => {
        if (event.shiftKey) {
            return;
        }
        const before = selectedAtPress.current;
        const { model } = view;
        if (event.metaKey || event.ctrlKey) {
            selectCells([...toggledSelection(before, model)]);
            return;
        }
        // Selected already (alone, or among others to move them together): the selection as it was.
        const target = clickTarget(before, model);
        selectCells(target ? [target] : [...before]);
    };

    useOnPaperEvents(PAPER_ID, {
        'element:pointerdown': onPress,
        'link:pointerdown': onPress,
        'element:pointermove': onMove,
        'link:pointermove': onMove,
        'element:pointerclick': onClick,
        'link:pointerclick': onClick,
    });
    return null;
}
