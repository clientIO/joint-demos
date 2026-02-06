import { Attribute } from '../const';
import { SystemNode } from '../../system/diagram/models';

export default class Node extends SystemNode {
    
    /**
     * The maximum number of child nodes that can be added to this node.
     */
    static growthLimit = Infinity;
    
    defaults() {
        return {
            ...super.defaults(),
            // App-specific attributes
            [Attribute.Removable]: true,
            [Attribute.Selectable]: true,
            // JointJS attributes
            z: 1,
        };
    }
    
    getInspectorConfig() {
        return {
            groups: {},
            inputs: {}
        };
    }
}
