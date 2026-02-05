import { Zoom } from './app-config';
import SystemPlaceholder from '../system/diagram/models/SystemPlaceholder';
import { Node, Edge } from '../diagram/models';
import { SimplifiedNodeView } from '../diagram/views';

import type { dia } from '@joint/plus';
import type { NavigatorOptions } from '../features/Navigator';

export const zoom: NavigatorOptions['zoom'] = {
    min: Zoom.Min,
    max: Zoom.Max,
    step: Zoom.Step
};

export const paperOptions: NavigatorOptions['paperOptions'] = {
    // Show only nodes and edges (no buttons, placeholders, etc.)
    cellVisibility: (cell) => {
        if (cell instanceof Node) return true;
        if (cell instanceof Edge) {
            // Do not show edges connected to placeholders
            return !(cell.getTargetCell() instanceof SystemPlaceholder);
        }
        return false;
    },

    // Use simplified element view for the navigator minimap
    elementView: () => SimplifiedNodeView as typeof dia.ElementView,
};

