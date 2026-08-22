import { validateAndReplaceConnections } from '../utils';

import type { dia } from '@joint/plus';
import type { AppShape } from '../shapes/shapes-typing';

// Swaps a cell for another shape type in place (same id), rewiring the
// connections that are no longer valid. A pure graph operation — callers are
// responsible for re-selecting the new shape.
export function replaceShape(graph: dia.Graph, oldShape: AppShape, newShape: AppShape) {
    const batchName = 'replace-shape';

    graph.startBatch(batchName);

    newShape.copyFrom(oldShape);
    graph.syncCells([newShape]);

    if (oldShape.isElement()) {
        // Validate and replace connections when we are changing the element type
        // since the new element might have different connection rules
        validateAndReplaceConnections(newShape, graph);
    }

    graph.stopBatch(batchName);
}
