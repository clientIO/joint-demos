import WarningEffect from './WarningEffect';
import { Attribute } from '../const';

export default class ActionWarningEffect extends WarningEffect {
    tooltip = 'Action is not specified!';
    top = 24;
    
    preinitialize() {
        super.preinitialize();
        this.UPDATE_ATTRIBUTES = [Attribute.ActionKey];
    }
    
    isActive(node) {
        return !node.isConfigured();
    }
}
