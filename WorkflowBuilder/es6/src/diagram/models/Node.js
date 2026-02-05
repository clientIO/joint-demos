import { Attribute } from '../const';
import { SystemNode } from '../../system/diagram/models';

class Node extends SystemNode {
    
    defaults() {
        return Object.assign(Object.assign({}, super.defaults()), { 
            // App-specific attributes
            [Attribute.Removable]: true, [Attribute.Selectable]: true, 
            // JointJS attributes
            z: 1 });
    }
    
    getInspectorConfig() {
        return {
            groups: {},
            inputs: {}
        };
    }
}

/**
 * The maximum number of child nodes that can be added to this node.
 */
Node.growthLimit = Infinity;
export default Node;
