import { dia } from '@joint/plus';

import type { Attribute } from '../const';
import type { SystemModel, NodeCustomPosition } from '../types';

export interface SystemNodeAttributes extends dia.Element.Attributes {
    [Attribute.CustomPosition]?: NodeCustomPosition;
    [Attribute.PartitionIndex]?: number;
    [Attribute.SourceOnly]?: boolean;
}

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

    getLabelsRelativeRects(): dia.BBox[] {
        return [];
    }
}
