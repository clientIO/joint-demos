import { useEffect } from 'react';
import { useGraph, usePaper, usePaperScroller, useGraphHistory } from '@joint/react-plus';
import { ZOOM_SETTINGS } from '../configs/paper-config';
import { useViewInteractions } from '../hooks/use-view-interactions';
import { useEditInteractions } from '../hooks/use-edit-interactions';
import { useKeyboardShortcuts } from '../hooks/use-keyboard-shortcuts';
import carWashProcess from '../data/car-wash-process.json';

// Renders nothing. Mounted inside `<Paper>`, it wires the paper and keyboard
// interactions and loads the initial diagram.
export function EditorBehavior() {

    const { graph } = useGraph();
    const { paper } = usePaper();
    const { paperScroller, zoomToFit } = usePaperScroller();
    const { commandManager } = useGraphHistory();

    useViewInteractions();
    useEditInteractions();
    useKeyboardShortcuts();

    useEffect(() => {
        if (!paper || !paperScroller) return;

        // Initial diagram — idempotent under StrictMode double-mount because
        // the graph lives at module scope.
        if (graph.getCells().length === 0) {
            graph.fromJSON(carWashProcess);
            commandManager.reset();
        }

        // The paper renders asynchronously — fit again once the initial
        // render settles.
        const fitContent = () => zoomToFit({ minScale: ZOOM_SETTINGS.min, maxScale: 1, contentMargin: 60 });
        fitContent();
        paper.once('render:done', fitContent);
    }, [graph, paper, paperScroller, zoomToFit, commandManager]);

    return null;
}
