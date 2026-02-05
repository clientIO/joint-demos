import { Attribute } from '../diagram/const';
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

    // If you need to transform the node data before creating the shape,
    // you can do it here.
    // e.g., mapping data attributes to model attributes.
    // { ...node, modelName: node.dataName }
    return {
        id,
        // If the `node` does not have an explicit label,
        // we make sure to pass `null` to reset any previous label set on the model.
        // Note: we can do it only for LabeledNode types, but for simplicity,
        // we do it for all types here.
        [Attribute.Label]: null,
        ...node,
    } as dia.Cell.JSON;
}
