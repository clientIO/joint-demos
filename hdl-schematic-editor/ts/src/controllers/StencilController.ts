import { Controller } from '../system/controllers';
// Actions
import { addDroppedNode } from '../actions/diagram-actions';
import { selectModel } from '../actions/selection-actions';

import type { dia } from '@joint/plus';
import type { App } from '../app';

/**
 * StencilController manages the shapes dragged from the stencil.
 */
export default class StencilController extends Controller<[App]> {

    startListening() {
        const { stencil } = this.context;

        this.listenTo(stencil, {
            'element:drop': onElementDrop,
        });
    }
}

/**
 * The stencil adds the dropped shape to the graph. It's turned into a node
 * of the diagram data (the source of truth), so it can be undone and exported.
 */
function onElementDrop(app: App, elementView: dia.ElementView) {
    const node = addDroppedNode(app, elementView.model);
    selectModel(app, node);
}
