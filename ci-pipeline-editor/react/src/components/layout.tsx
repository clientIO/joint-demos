import type { dia } from '@joint/plus';
import { useGraph, useOnElementsMeasured, useOnPaperEvents } from '@joint/react-plus';
import { useEffect, useRef } from 'react';

import { useEditor } from '../editor-context';
import { layoutIfDirty } from '../layout-tracker';

/**
 * The layout of the diagram, rendered inside `<Paper>`, where the hooks on
 * the paper live: the sizes of the elements come from what React renders
 * (see `shapes/`), so the diagram is laid out once they are measured - and
 * fitted into the view the first time. The hook fires once per settled
 * change, when no element waits to be measured - also after a build that
 * already laid out what it changed (an element removed), so the layout runs
 * only if the graph changed since (`layoutIfDirty()`). The view is fitted
 * after each of them until the first edit or the first move of the view -
 * the user has taken over then.
 * The graph itself is built and laid out by the editor after every edit
 * (see `editor-provider.tsx`); this is the pass the measurements ask for.
 */
export function DiagramLayout(): null {
    const editor = useEditor();
    const { graph } = useGraph();
    const fitPending = useRef(true);

    useEffect(() => {
        if (editor.version > 0) fitPending.current = false;
    }, [editor.version]);

    useOnElementsMeasured(() => {
        const root = graph.getCell(editor.data.getRootId());
        if (root) layoutIfDirty(graph, root as dia.Element);
        if (fitPending.current) editor.fit();
    });

    // The view is the user's from the first click, drag or wheel: it is not fitted again.
    useOnPaperEvents({
        onElementPointerClick: () => {
            fitPending.current = false;
        },
        onBlankPointerDown: () => {
            fitPending.current = false;
        },
        onPaperMouseWheel: () => {
            fitPending.current = false;
        }
    });

    return null;
}
