import { dia } from '@joint/plus';

import type { SystemModel } from '../types';

const TYPE = 'ButtonLine';

/**
 * Abstract base class for system button lines in the diagram.
 */
export default abstract class SystemButtonLine<
    A extends dia.Link.Attributes = dia.Link.Attributes
> extends dia.Link implements SystemModel {

    static type = TYPE;

    defaults(): Partial<A> {
        return {
            ...super.defaults,
            type: TYPE,
        } as Partial<A> & { type: string }; // Ensure type is included
    }

    getDataPath(): string {
        throw new Error('ButtonLine is not part of the data model.');
    }

    /**
     * Type guard to check if the cell is a SystemButtonLine.
     */
    static isButtonLine(cell: dia.Cell): cell is SystemButtonLine {
        return cell.get('type') === TYPE;
    }
}
