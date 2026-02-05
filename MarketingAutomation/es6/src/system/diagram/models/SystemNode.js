import { dia } from '@joint/plus';

/**
 * Abstract base class for system nodes in the diagram.
 */
export default class SystemNode extends dia.Element {
    
    defaults() {
        // Make sure the defaults are defined for
        // easy ES class extension.
        return Object.assign({}, super.defaults);
    }
    
    getDataPath() {
        return `${this.id}`;
    }
    
    /**
     * Type guard to check if the cell is a SystemNode.
     */
    isNode() {
        return this instanceof SystemNode;
    }
}
