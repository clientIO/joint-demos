import type { dia } from '@joint/plus';
import { useCells, useGraph, useOnKeyboardEvents, useOnPaperEvents, usePaperScroller } from '@joint/react-plus';
import type { Computed, ElementRecord } from '@joint/react-plus';
import { useEffect, useRef } from 'react';

import { canDelete, getActionTarget } from '../actions';
import { useEditor } from '../editor-context';
import { runLayout } from '../layout';
import { GROUP_TYPE, LINK_TYPE } from '../shapes';
import { getElementMenu } from '../shapes/buttons';

/**
 * The measured sizes of the nodes as one string, from the records of the
 * cells - what React rendered and the store measured. It changes only when
 * the rounded size of a node changes: a drag moves a position, the layout
 * sizes the groups (`GROUP_TYPE`), and neither is in it. A module-level
 * selector, so `useCells` keeps one subscription; the walk is O(n) per store
 * commit, for a few dozen nodes.
 */
const selectNodeSizes = (cells: ReadonlyArray<Computed<ElementRecord>>): string => {
    let signature = '';
    for (const cell of cells) {
        // The records are typed as the built-in `'element'`; the diagram's cells are `shapes/`' types.
        const type: string = cell.type;
        if (type === GROUP_TYPE || type === LINK_TYPE) continue;
        signature += `${cell.id}:${Math.round(cell.size.width)}x${Math.round(cell.size.height)} `;
    }
    return signature;
};

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
    // view the first time. `nodeSizes` is the sizes of the nodes as the store
    // holds them, and this re-renders only when one of them changed - the
    // layout's own writes (the groups are sized around their content) leave it
    // alone - so the layout runs once per change of a measured size. The paper
    // mounts the views in batches, so the sizes land over several passes: the
    // view is fitted after each of them, until the user takes over.
    const nodeSizes = useCells<ElementRecord, string>(selectNodeSizes);
    const fitPending = useRef(true);
    useEffect(() => {
        if (editor.version > 0) fitPending.current = false;
    }, [editor.version]);
    // The editor is rebuilt on every edit; the layout must not re-run for that,
    // only for `nodeSizes`, so it reads the latest editor through a ref.
    const latestEditor = useRef(editor);
    useEffect(() => {
        latestEditor.current = editor;
    }, [editor]);
    useEffect(() => {
        const { current } = latestEditor;
        const root = graph.getCell(current.data.getRootId());
        if (root) runLayout(graph, root as dia.Element);
        if (fitPending.current) current.fit();
    }, [nodeSizes, graph]);

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
