import type { dia } from '@joint/plus';
import { useGraph, useOnElementsMeasured, useOnPaperEvents } from '@joint/react-plus';
import { useEffect, useRef } from 'react';

import { useEditor } from '../editor-context';
import { runLayout } from '../layout';

/**
 * The layout of the diagram, rendered inside `<Paper>`, where the hooks on
 * the paper live: the sizes of the elements come from what React renders
 * (see `shapes/`), so the diagram is laid out each time they are measured -
 * and fitted into the view until the first edit or the first move of the
 * view: the user has taken over then. The hook fires once per change, after
 * every element of it is measured; the sizes the layout writes itself (the
 * groups are sized around their content) are not measurements.
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
        if (root) runLayout(graph, root as dia.Element);
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
