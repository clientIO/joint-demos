import { Attribute } from '../const';
import { SystemNode } from '../../system/diagram/models';

import type { InspectorConfig } from '../../types';
import type { SystemNodeAttributes } from '../../system/diagram/models';

export interface NodeAttributes extends SystemNodeAttributes {
    [Attribute.Removable]?: boolean;
    [Attribute.Selectable]?: boolean;
    [Attribute.ContextMenu]?: { x: number | string; y: number | string; };
}

export default abstract class Node<A extends NodeAttributes = NodeAttributes> extends SystemNode<A> {

    /**
     * The maximum number of child nodes that can be added to this node.
     */
    static growthLimit = Infinity;

    defaults(): Partial<A> {
        return {
            ...super.defaults(),
            // App-specific attributes
            [Attribute.Removable]: true,
            [Attribute.Selectable]: true,
            // JointJS attributes
            z: 1,
        };
    }

    getInspectorConfig(): InspectorConfig {
        return {
            groups: {},
            inputs: {}
        };
    }
}
