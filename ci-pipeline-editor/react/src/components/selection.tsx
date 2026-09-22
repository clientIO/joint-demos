import { useOnKeyboardEvents, useOnPaperEvents, useSelectionCollection } from '@joint/react-plus';

import { canRemoveBranch, canRemoveNode } from '../actions';
import { isSelectable, useEditor } from '../editor-context';
import { GroupStartModel } from '../shapes';

/**
 * The selection of the diagram, wired inside `<Paper>`: one element at a
 * time, in the selection collection of `<Diagram>` (read anywhere with
 * `useSelectionCollection()`; the selected element draws its own frame,
 * see `shapes/selection-frame.tsx`). The clicks are the editor's own
 * (`selection: false` in the interactions of the diagram): a click selects
 * an element with a picture (see `isSelectable()`), a click on the blank
 * area or `Escape` clears the selection - unless a move is on, which
 * `Escape` cancels first - and `Delete` removes the selected element as
 * the "remove" item of its menu would.
 */
export function DiagramSelection(): null {
    const editor = useEditor();
    const { collection: selection, selectCells } = useSelectionCollection();

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
            if (!target?.isElement() || !canRemoveBranch(editor.graph, target)) return;
            // What the menu's first "remove" item would do: the element alone where its children can move up, the branch below it where they cannot.
            editor.remove(target, canRemoveNode(editor.graph, target) ? 'node' : 'branch');
        }
    });

    return null;
}
