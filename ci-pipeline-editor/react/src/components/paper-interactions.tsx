import type { dia } from '@joint/plus';
import { useGraph, useOnElementsMeasured, useOnKeyboardEvents, useOnPaperEvents, usePaperScroller } from '@joint/react-plus';
import { useEffect, useRef } from 'react';

import { canDelete, getActionTarget } from '../actions';
import { useEditor } from '../editor-context';
import { runLayout } from '../layout';
import { GroupModel } from '../shapes';
import { getElementMenu } from '../shapes/buttons';

/**
 * The interactions with the paper, rendered inside `<Paper>` (and inside
 * `<PaperScroller>`), where the hooks on the paper's events live: lays the
 * diagram out once the sizes of the elements are measured, opens the menu
 * on a right click, pans on a drag of the blank area, and binds the keys
 * of the history. The selection is `<DiagramSelection>`'s (`components/`).
 */
export function PaperInteractions(): null {
    const editor = useEditor();
    const { startPaperPan } = usePaperScroller();
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
            startPaperPan(event);
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
