import { getCustomPosition } from '../../system/diagram/custom-positions';
// Diagram
import { Control, Action, Note, Trigger } from '../models';
import { Attribute } from '../const';

import type { dia } from '@joint/plus';
import type { NodeData } from '../types';

export function getDefaultNoteData(graph: dia.Graph, position: dia.Point): NodeData {
    const customPosition = getCustomPosition(graph, position);

    return {
        type: Note.type,
        [Attribute.CustomPosition]: customPosition,
        [Attribute.Markdown]: ''
    };
}

export function getDefaultTriggerData(): NodeData {
    return {
        type: Trigger.type,
        [Attribute.TriggerKey]: null,
    };
}

export function getDefaultActionData(): NodeData {
    return {
        type: Action.type,
        [Attribute.ActionKey]: null
    };
}

export function getDefaultControlData(): NodeData {
    return {
        type: Control.type,
        [Attribute.ControlKey]: null
    };
}
