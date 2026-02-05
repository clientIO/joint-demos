import { Zoom } from './app-config';
import { SimplifiedNodeView } from '../diagram/views';

export const zoom = {
    min: Zoom.Min,
    max: Zoom.Max,
    step: Zoom.Step
};

export const paperOptions = {
    // Use simplified element view for the navigator minimap
    elementView: () => SimplifiedNodeView,
    defaultConnector: {
        name: 'straight',
        args: {
            cornerType: 'cubic',
            cornerRadius: 30,
        }
    }
};
