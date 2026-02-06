import { dia } from '@joint/plus';
import type { Attribute } from '../const';

import type { SystemModel, NodeCustomPosition } from '../types';

/**
 * Node model attributes interface.
 */
export interface SystemNodeAttributes extends dia.Element.Attributes {
    [Attribute.CustomPosition]?: NodeCustomPosition;
    [Attribute.SourceOnly]?: boolean;
}

/**
 * Abstract base class for system nodes in the diagram.
 */
export default abstract class SystemNode<
    A extends SystemNodeAttributes = SystemNodeAttributes,
    S extends dia.Cell.Options = dia.Cell.Options
> extends dia.Element<A, S> implements SystemModel {

    static type: string;

    defaults(): Partial<A> {
        // Make sure the defaults are defined for
        // easy ES class extension.
        return {
            ...super.defaults,
        };
    }

    getDataPath(): string {
        return `${this.id}`;
    }

    /**
     * Type guard to check if the cell is a SystemNode.
     */
    isNode(): this is SystemNode {
        return this instanceof SystemNode;
    }
}
