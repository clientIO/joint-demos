import { dia } from '@joint/plus';

import { GroupModel, cellNamespace } from './shapes';

/**
 * The graph of the app. Its `dirty` marks a layout that waits for React to
 * measure: set by an element added and by a size React measured - the
 * layout resizes the groups only, which React does not measure - and
 * cleared by `<DiagramLayout>` once it laid out. Set silently:
 * the store of `@joint/react` takes a `change` of the graph for one of a cell.
 */
export function createGraph(): dia.Graph {
    const graph = new dia.Graph({}, { cellNamespace });
    graph.on('add', (cell: dia.Cell) => {
        if (cell.isElement()) graph.set('dirty', true, { silent: true });
    });
    graph.on('change:size', (cell: dia.Cell) => {
        if (!GroupModel.isGroup(cell)) graph.set('dirty', true, { silent: true });
    });
    return graph;
}
