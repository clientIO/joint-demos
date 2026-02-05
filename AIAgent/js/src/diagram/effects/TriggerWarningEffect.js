import WarningEffect from './WarningEffect';
import { Attribute } from '../const';

export default class TriggerWarningEffect extends WarningEffect {
    tooltip = 'Trigger is not specified!';
    top = 16;
    
    preinitialize() {
        super.preinitialize();
        this.UPDATE_ATTRIBUTES = [Attribute.TriggerKey];
    }
    
    isActive(node) {
        return !node.isConfigured();
    }
}
