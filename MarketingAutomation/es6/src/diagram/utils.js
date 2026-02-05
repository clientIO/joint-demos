import { LAYOUT_BATCH_NAME } from './const';

import { mvc } from '@joint/plus';

/**
 * Runs the given callback after the layout is finished.
 * Layout is finished when the batch:stop event is triggered with the name 'layout'.
 * @see {@link LAYOUT_BATCH_NAME}
 * @param graph - The graph instance.
 * @param callback - The callback to run.
 */
export function runAfterLayout(graph, callback) {
    const listener = new mvc.Listener();
    
    listener.listenTo(graph, 'batch:stop', ({ batchName }) => {
        if (batchName === LAYOUT_BATCH_NAME) {
            callback();
            listener.stopListening();
        }
    });
}
