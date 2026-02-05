import { dia } from '@joint/plus';

const TYPE = 'ButtonLine';

/**
 * Abstract base class for system button lines in the diagram.
 */
class SystemButtonLine extends dia.Link {
    
    defaults() {
        return Object.assign(Object.assign({}, super.defaults), { type: TYPE }); // Ensure type is included
    }
    
    getDataPath() {
        throw new Error('ButtonLine is not part of the data model.');
    }
    
    /**
     * Type guard to check if the cell is a SystemButtonLine.
     */
    static isButtonLine(cell) {
        return cell.get('type') === TYPE;
    }
}

SystemButtonLine.type = TYPE;
export default SystemButtonLine;
