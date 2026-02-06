import { dia } from '@joint/core';

const TYPE = 'Placeholder';

/**
 * Abstract base class for system placeholders in the diagram.
 */
export default class SystemPlaceholder extends dia.Element {
    
    static type = TYPE;
    
    defaults() {
        return {
            ...super.defaults,
            type: TYPE,
        }; // Ensure type is included
    }
    
    getDataPath() {
        throw new Error('Placeholder is not part of the data model.');
    }
    
    /**
     * Type guard to check if the cell is a SystemPlaceholder.
     */
    static isPlaceholder(cell) {
        return cell.get('type') === TYPE;
    }
}
