import { Zoom } from './app-config';
import { SimplifiedNodeView } from '../diagram/views';

import type { NavigatorOptions } from '../features/Navigator';
import type { dia } from '@joint/plus';

export const zoom: NavigatorOptions['zoom'] = {
    min: Zoom.Min,
    max: Zoom.Max,
    step: Zoom.Step
};

export const paperOptions: NavigatorOptions['paperOptions'] = {
    // Use simplified element view for the navigator minimap
    elementView: () => SimplifiedNodeView as typeof dia.ElementView,
    defaultConnector: {
        name: 'straight',
        args: {
            cornerType: 'cubic',
            cornerRadius: 30,
        }
    }
};
