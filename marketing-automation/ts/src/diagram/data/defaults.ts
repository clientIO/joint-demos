import { util } from '@joint/plus';
import { getCustomPosition } from '../../system/diagram/custom-positions';
// Diagram
import { Branch, Action, Note, Trigger, Delay } from '../models';
import { Attribute, START_NODE_ID } from '../const';

import type { dia } from '@joint/plus';
import type { NodeData } from '../types';

export function getDefaultNoteData(graph: dia.Graph, position: dia.Point): NodeData {
    const customPosition = getCustomPosition(graph, position, START_NODE_ID);

    return {
        type: Note.type,
        [Attribute.CustomPosition]: customPosition,
        [Attribute.Markdown]: ''
    };
}

export function getDefaultTriggerData(): NodeData {
    return {
        type: Trigger.type,
        [Attribute.Criteria]: []
    };
}

export function getDefaultActionData(): NodeData {
    return {
        type: Action.type,
        [Attribute.ActionKey]: null
    };
}

export function getDefaultBranchData(): NodeData {
    return {
        type: Branch.type,
        [Attribute.Label]: 'Branch',
        to: [{
            // Add an extra condition to the existing one
            [Attribute.EdgeCondition]: '',
            id: util.uuid()
        }]
    };
}

export function getDefaultDelayData(): NodeData {
    return {
        type: Delay.type,
        [Attribute.Duration]: {
            days: 0,
            hours: 0,
            minutes: 0
        }
    };
}
