import WarningEffect from './WarningEffect';
import { Attribute } from '../const';

import type Action from '../models/Action';

export default class ActionWarningEffect extends WarningEffect {
    tooltip: string = 'Action is not specified!';
    top: number = 24;

    preinitialize(): void {
        super.preinitialize();
        this.UPDATE_ATTRIBUTES = [Attribute.ActionKey];
    }

    isActive(node: Action): boolean {
        return !node.isConfigured();
    }
}
