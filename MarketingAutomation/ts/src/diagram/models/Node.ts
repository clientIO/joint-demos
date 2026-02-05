import { V } from '@joint/plus';
import { Attribute } from '../const';
import { SystemNode } from '../../system/diagram/models';

import type { InspectorConfig } from '../../types';
import type { SystemNodeAttributes } from '../../system/diagram/models';
import Theme from '../theme';

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

    minimapBackground: string = Theme.NodeMinimapBackgroundColor;

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

    /**
     * @returns Inspector config for the node.
     * @see {@link InspectorConfig}
     */
    getInspectorConfig(): InspectorConfig {
        return {
            groups: {},
            inputs: {}
        };
    }

    /**
     * @returns the node outline path data.
     */
    getOutlinePathData(options: { padding?: number, radius?: number } = {}): string {
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

    getMinimapBackground(): string {
        return this.minimapBackground;
    }
}
