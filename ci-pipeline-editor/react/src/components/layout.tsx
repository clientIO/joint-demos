import type { dia } from '@joint/plus';
import { useGraph, useOnElementsMeasured, useOnPaperEvents } from '@joint/react-plus';
import { useEffect, useRef } from 'react';

import { useEditor } from '../editor-context';
import { runLayout } from '../layout';
import { GroupModel } from '../shapes';

/**
 * The layout of the diagram, rendered inside `<Paper>`, where the hooks on
 * the paper live: the sizes of the elements come from what React renders
 * (see `shapes/`), so the diagram is laid out once they are measured - and
 * fitted into the view the first time. The store reports every change of a
 * size, the layout's own included - the groups are sized around their
 * content - so the layout runs only when a measured size changed since the
 * last one. The paper mounts the views in batches, so the sizes land over
 * several passes: the view is fitted after each of them, until the first
 * edit or the first move of the view - the user has taken over then.
 * The graph itself is built and laid out by the editor after every edit
 * (see `editor-provider.tsx`); this is the pass the measurements ask for.
 */
export function DiagramLayout(): null {
    const editor = useEditor();
    const { graph } = useGraph();
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
