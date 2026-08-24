import { useEffect } from 'react';
import { useGraph, usePaperScroller, useGraphHistory } from '@joint/react-plus';
import { importFile } from '../../actions/import-actions';
import carWashProcess from './car-wash-process.json';

/**
 * Renders nothing. Loads the example diagram into the empty graph via the
 * regular file-import pipeline (which also fits it into the viewport).
 */
export function ExampleDiagram() {

    const { graph } = useGraph();
    const { paperScroller } = usePaperScroller();
    const { commandManager } = useGraphHistory();

    useEffect(() => {
        // The graph outlives the effect (StrictMode double-mount) — only
        // load the example into an empty graph.
        if (!paperScroller || graph.getCells().length > 0) return;

        const file = new File([JSON.stringify(carWashProcess)], 'car-wash-process.json', { type: 'application/json' });
        importFile(paperScroller, commandManager, file);
    }, [graph, paperScroller, commandManager]);

    return null;
}
