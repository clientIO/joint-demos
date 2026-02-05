import { getCustomPosition } from '../../system/diagram/custom-positions';
// Diagram
import { Control, Action, Note, Trigger } from '../models';
import { Attribute } from '../const';

export function getDefaultNoteData(graph, position) {
    const customPosition = getCustomPosition(graph, position);
    
    return {
        type: Note.type,
        [Attribute.CustomPosition]: customPosition,
        [Attribute.Markdown]: ''
    };
}

export function getDefaultTriggerData() {
    return {
        type: Trigger.type,
        [Attribute.TriggerKey]: null,
    };
}

export function getDefaultActionData() {
    return {
        type: Action.type,
        [Attribute.ActionKey]: null
    };
}

export function getDefaultControlData() {
    return {
        type: Control.type,
        [Attribute.ControlKey]: null
    };
}
