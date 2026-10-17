import { Controller, BuildController, UIController } from '../system/controllers';
import { applicationModelNamespace } from '../diagram/namespaces';

import type { dia } from '@joint/plus';
import type { TypedNodeData } from '../diagram/types';
import type { App } from '../app';

/**
 * SystemController manages essential diagram functionality.
 */
export default class SystemController extends Controller<[App]> {

    buildController: BuildController;
    uiController: UIController;

    constructor(app: App) {
        super(app);
        // System build controller
        this.buildController = new BuildController(app, {
            buildNode: (node: TypedNodeData, id: dia.Cell.ID) => buildNodeFromData(node, id),
            // The nodes are positioned freely by the user (the positions are stored in the data).
            // The layout is run on demand (see `layoutDiagram()`).
            autoLayout: false,
        });
        // System UI controller
        this.uiController = new UIController(app);
    }

    startListening(): void {
        this.buildController.startListening();
        this.uiController.startListening();
    }

    stopListening(): void {
        super.stopListening();
        this.buildController.stopListening();
        this.uiController.stopListening();
    }
}

/**
 * Create a shape instance (or shape JSON) based on the node type and properties.
 */
function buildNodeFromData(node: TypedNodeData, id: dia.Cell.ID): dia.Cell.JSON {
    // Validate if the incoming node data requires a defined model
    if (!(node.type! in applicationModelNamespace)) {
        throw new Error(`Unknown element type: ${node.type}`);
    }

    // The data attributes are used as the model attributes as they are.
    return {
        id,
        ...node,
    } as dia.Cell.JSON;
}
