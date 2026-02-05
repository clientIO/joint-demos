import WarningEffect from './WarningEffect';
import { Attribute } from '../const';

import type Trigger from '../models/Trigger';

export default class TriggerWarningEffect extends WarningEffect {
    tooltip: string = 'Trigger is not specified!';
    top: number = 16;

    preinitialize(): void {
        super.preinitialize();
        this.UPDATE_ATTRIBUTES = [Attribute.TriggerKey];
    }

    isActive(node: Trigger): boolean {
        return !node.isConfigured();
    }
}
