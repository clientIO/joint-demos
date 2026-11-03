import { dia } from '@joint/plus';
import { Attribute } from '../const';

import type { SystemModel } from '../types';

const TYPE = 'Edge';

/**
 * Edge model attributes interface.
 */
export interface SystemEdgeAttributes extends dia.Link.Attributes {
    [Attribute.SourceIndex]: number;
}

/**
 * Abstract base class for system edges in the diagram.
 */
export default abstract class SystemEdge<
    A extends SystemEdgeAttributes = SystemEdgeAttributes,
> extends dia.Link implements SystemModel {

    static type = TYPE;

    defaults(): Partial<A> {
        return {
            ...super.defaults,
            type: TYPE,
        } as Partial<A> & { type: string }; // Ensure type is included
    }

    /**
     * Get the data path for this link in the diagram data structure.
     */
    getDataPath(): string {
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
    static isEdge(cell: dia.Cell): cell is SystemEdge {
        return cell.get('type') === TYPE;
    }
}

