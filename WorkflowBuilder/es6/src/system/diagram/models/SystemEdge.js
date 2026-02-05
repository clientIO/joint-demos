import { dia } from '@joint/plus';
import { Attribute } from '../const';

const TYPE = 'Edge';

/**
 * Abstract base class for system edges in the diagram.
 */
class SystemEdge extends dia.Link {
    
    defaults() {
        return Object.assign(Object.assign({}, super.defaults), { type: TYPE }); // Ensure type is included
    }
    
    /**
     * Get the data path for this link in the diagram data structure.
     */
    getDataPath() {
        const { id: sourceId } = this.source();
        const sourceIndex = this.get(Attribute.SourceIndex);
        if (sourceId == null || sourceIndex == null) {
            throw new Error('Cannot get data path for link with undefined source ID or source index');
        }
        return `${sourceId}/to/${sourceIndex}`;
    }
    
    /**
     * Type guard to check if the cell is a SystemEdge.
     */
    static isEdge(cell) {
        return cell.get('type') === TYPE;
    }
}

SystemEdge.type = TYPE;
export default SystemEdge;

