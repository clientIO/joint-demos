import { dia } from '@joint/plus';

import type { SystemModel } from '../types';

const TYPE = 'Button';

/**
 * Abstract base class for system buttons in the diagram.
 */
export default abstract class SystemButton
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
        throw new Error('Button is not part of the data model.');
    }

    /**
     * Type guard to check if the cell is a SystemButton.
     */
    static isButton(cell: dia.Cell): cell is SystemButton {
        return cell.get('type') === TYPE;
    }
}
