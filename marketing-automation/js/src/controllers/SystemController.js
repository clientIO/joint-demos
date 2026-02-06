import { Attribute } from '../diagram/const';
import { Controller, BuildController, UIController } from '../system/controllers';
import { applicationModelNamespace } from '../diagram/namespaces';

/**
 * SystemController manages essential diagram functionality.
 */
export default class SystemController extends Controller {
    
    buildController;
    uiController;
    
    constructor(app) {
        super(app);
        // System build controller
        this.buildController = new BuildController(app, {
            buildNode: (node, id) => buildNodeFromData(node, id),
            growthLimit: (node) => getNodeGrowthLimit(node),
        });
        // System UI controller
        this.uiController = new UIController(app);
    }
    
    startListening() {
        this.buildController.startListening();
        this.uiController.startListening();
    }
    
    stopListening() {
        super.stopListening();
        this.buildController.stopListening();
        this.uiController.stopListening();
    }
}

/**
 * For a given node data, retrieve its growth limit from the Model specification.
 * Note: return =1 to hide all buttons.
 */
function getNodeGrowthLimit(node) {
    const { type } = node;
    if (type in applicationModelNamespace) {
        return applicationModelNamespace[type].growthLimit;
    }
    return Infinity;
}

/**
 * Create a shape instance (or shape JSON) based on the node type and properties.
 */
function buildNodeFromData(node, id) {
    // Validate if the incoming node data requires a defined model
    if (!(node.type in applicationModelNamespace)) {
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
    };
}
