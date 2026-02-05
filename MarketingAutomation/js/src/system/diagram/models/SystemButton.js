import { dia } from '@joint/plus';

const TYPE = 'Button';

/**
 * Abstract base class for system buttons in the diagram.
 */
export default class SystemButton extends dia.Element {
    
    static type = TYPE;
    
    defaults() {
        return {
            ...super.defaults,
            type: TYPE,
        }; // Ensure type is included
    }
    
    getDataPath() {
        throw new Error('Button is not part of the data model.');
    }
    
    /**
     * Type guard to check if the cell is a SystemButton.
     */
    static isButton(cell) {
        return cell.get('type') === TYPE;
    }
}
