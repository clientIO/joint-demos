import WarningEffect from './WarningEffect';
import { Attribute } from '../const';
import Theme from '../theme';

import type Action from '../models/Action';

/**
 * Warning effect for Action nodes that are not properly configured.
 */
export default class ActionWarningEffect extends WarningEffect {
    tooltip: string = 'Action is not specified!';
    top: number = Theme.NodeHeight / 2 - Theme.WarningIconSize / 2;

    preinitialize(): void {
        super.preinitialize();
        this.UPDATE_ATTRIBUTES = [Attribute.ActionKey];
    }

    isActive(node: Action): boolean {
        return !node.isConfigured();
    }
}
