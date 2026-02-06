import { util } from '@joint/plus';
import { getCustomPosition } from '../../system/diagram/custom-positions';
// Diagram
import { Agent, Condition, Action, Note, Trigger } from '../models';
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
        [Attribute.TriggerKey]: null
    };
}

export function getDefaultActionData(): NodeData {
    return {
        type: Action.type,
        [Attribute.ActionKey]: null
    };
}

export function getDefaultConditionData(): NodeData {
    return {
        type: Condition.type,
        [Attribute.Label]: 'Condition',
        to: [{
            // Add an extra branch to the existing one
            [Attribute.EdgePrompt]: '',
            id: util.uuid()
        }]
    };
}

export function getDefaultAgentData(): NodeData {
    return {
        type: Agent.type,
        skills: {},
        to: [{
            // Add an extra branch to the existing one
            [Attribute.EdgePrompt]: '',
            id: util.uuid()
        }]
    };
}

