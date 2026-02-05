import { dia } from '@joint/core';
import type { SystemModel } from '../types';

const TYPE = 'Placeholder';

/**
 * Abstract base class for system placeholders in the diagram.
 */
export default abstract class SystemPlaceholder
    <A extends dia.Element.Attributes = dia.Element.Attributes
> extends dia.Element implements SystemModel {

    static type = TYPE;

    defaults(): Partial<A> {
        return {
            ...super.defaults,
            type: TYPE,
        } as Partial<A> & { type: string }; // Ensure type is included
    }

    getDataPath(): string {
        throw new Error('Placeholder is not part of the data model.');
    }

    /**
     * Type guard to check if the cell is a SystemPlaceholder.
     */
    static isPlaceholder(cell: dia.Cell): cell is SystemPlaceholder {
        return cell.get('type') === TYPE;
    }
}
