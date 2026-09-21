import { dia, ui } from '@joint/plus';
import { Selection, useOnKeyboardEvents, useOnPaperEvents, useSelectionCollection } from '@joint/react-plus';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { isSelectable, useEditor } from '../editor-context';
import { FrameHighlighter } from '../frame';
import { COLORS, GroupStartModel, STEP_RADIUS, StepModel } from '../shapes';

/** How far the frame of the selected element stands from its edge. */
const SELECTION_PADDING = 5;

/**
 * The frames of the selection: the selected element is framed in the layer
 * below the cells - behind the links, and behind the buttons that overhang
 * the element - a shade darker than the nodes, a little away from the
 * edge, in the shape of the element (see `frame.ts`): a step is a box with
 * small corners, everything else selectable is round by half its height -
 * a decision, the start of a group, the start and an end.
 */
function createSelectionFrames(): ui.HighlighterSelectionFrameList {
    return new ui.HighlighterSelectionFrameList({
        highlighter: FrameHighlighter,
        options: (cell: dia.Cell) => {
            const radius = StepModel.isStep(cell) ? STEP_RADIUS : (cell as dia.Element).size().height / 2;
            return { layer: dia.Paper.Layers.BACK, padding: SELECTION_PADDING, rx: radius, ry: radius, attrs: { stroke: COLORS.selection, strokeWidth: 1.5, fill: 'none' }};
        }
    });
}

/**
 * The selection of the diagram, rendered inside `<Paper>`: one element at
 * a time, in the selection collection of `<Diagram>` (read anywhere with
 * `useSelectionCollection()`), drawn by `<Selection>` - no wrapper, no
 * handles, no dragging: the layout owns the positions. The clicks are the
 * editor's own (`selection: false` in the interactions of the diagram): a
 * click selects an element with a picture (see `isSelectable()`), a click
 * on the blank area or `Escape` clears the selection - unless a move is
 * on, which `Escape` cancels first - and `Delete` removes the selected
 * element as the "remove" item of its menu would.
 */
export function DiagramSelection(): ReactNode {
    const editor = useEditor();
    const { collection: selection, selectCells } = useSelectionCollection();
    const [frames] = useState(createSelectionFrames);

    useOnPaperEvents({
        onElementPointerClick: ({ model }) => {
            if (isSelectable(model)) selectCells([model]);
        },
        onBlankPointerClick: () => selectCells([])
    });

    useOnKeyboardEvents({
        escape: () => {
            if (editor.moved) editor.cancelMove(); else selectCells([]);
        },
        'delete backspace': (evt) => {
            const selected = selection.at(0);
            if (!selected?.isElement()) return;
            evt.preventDefault();
            const target = GroupStartModel.isGroupStart(selected) ? selected.getParentCell() : selected;
            if (target?.isElement()) editor.remove(target);
        }
    });

    return <Selection frames={frames} wrapper={false} allowTranslate={false} options={{ allowCellInteraction: true }} />;
}
