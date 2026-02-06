import { V } from '@joint/plus';
import { Attribute } from '../const';
import { SystemNode } from '../../system/diagram/models';
import Theme from '../theme';

export default class Node extends SystemNode {
    
    /**
     * The maximum number of child nodes that can be added to this node.
     */
    static growthLimit = Infinity;
    
    minimapBackground = Theme.NodeMinimapBackgroundColor;
    
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
    
    /**
     * @returns Inspector config for the node.
     * @see {@link InspectorConfig}
     */
    getInspectorConfig() {
        return {
            groups: {},
            inputs: {}
        };
    }
    
    /**
     * @returns the node outline path data.
     */
    getOutlinePathData(options = {}) {
        const { padding = 0, radius = 12 } = options;
        const { width, height } = this.size();
        return V.rectToPath({
            x: -padding,
            y: -padding,
            width: width + 2 * padding,
            height: height + 2 * padding,
            rx: radius + padding,
            ry: radius + padding
        });
    }
    
    getMinimapBackground() {
        return this.minimapBackground;
    }
}
