import WarningEffect from './WarningEffect';
import { Attribute } from '../const';
import Theme from '../theme';

/**
 * Warning effect for Action nodes that are not properly configured.
 */
export default class ActionWarningEffect extends WarningEffect {
    tooltip = 'Action is not specified!';
    top = Theme.NodeHeight / 2 - Theme.WarningIconSize / 2;
    
    preinitialize() {
        super.preinitialize();
        this.UPDATE_ATTRIBUTES = [Attribute.ActionKey];
    }
    
    isActive(node) {
        return !node.isConfigured();
    }
}
