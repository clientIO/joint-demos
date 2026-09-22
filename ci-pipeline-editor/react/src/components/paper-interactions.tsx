import { useGraph, useOnKeyboardEvents, useOnPaperEvents, usePaperScroller } from '@joint/react-plus';

import { canRemoveBranch, getActionTarget } from '../actions';
import { useEditor } from '../editor-context';
import { getElementMenu } from '../shapes/buttons';

/**
 * What the pointer and the keys do on the paper, rendered inside `<Paper>`
 * (and inside `<PaperScroller>`), where the hooks on the paper's events
 * live: a right click opens the menu of an element, a drag of the blank
 * area pans, a click on it ends a move, and `Ctrl+Z` / `Ctrl+Shift+Z` go
 * through the history. The selection is `<DiagramSelection>`'s and the
 * layout `<DiagramLayout>`'s (`components/`).
 */
export function PaperInteractions(): null {
    const editor = useEditor();
    const { startPaperPan } = usePaperScroller();
    const { graph } = useGraph();

    useOnPaperEvents({
        onBlankPointerClick: () => editor.cancelMove(),
        // A right click on an element opens the menu of its "more" button, at the pointer.
        onElementContextMenu: ({ model, event }) => {
            event.preventDefault();
            if (editor.moved || !model.isElement()) return;
            const target = getActionTarget(model);
            if (!target || !canRemoveBranch(graph, target)) return;
            editor.openMenu(getElementMenu(editor, target, new DOMRect(event.clientX, event.clientY, 0, 0)));
        },
        onBlankPointerDown: ({ event }) => startPaperPan(event)
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
