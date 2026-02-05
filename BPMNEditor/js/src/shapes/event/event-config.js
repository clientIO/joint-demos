import { inspectorOptions } from '../shared-config';

export const EventLabels = {
    // Start
    'event.Start': 'Start Event',
    'event.MessageStart': 'Message Start Event',
    'event.TimerStart': 'Timer Start Event',
    'event.ConditionalStart': 'Conditional Start Event',
    'event.SignalStart': 'Signal Start Event',
    // Intermediate Catching
    'event.IntermediateCatching': 'Intermediate Catching Event',
    'event.MessageIntermediateCatching': 'Message Intermediate Catch Event',
    'event.TimerIntermediateCatching': 'Timer Intermediate Catch Event',
    'event.ConditionalIntermediateCatching': 'Conditional Intermediate Catch Event',
    'event.LinkIntermediateCatching': 'Link Intermediate Catch Event',
    'event.SignalIntermediateCatching': 'Signal Intermediate Catch Event',
    // Intermediate boundary
    'event.IntermediateBoundary': 'Intermediate Boundary Event',
    'event.MessageIntermediateBoundary': 'Message Intermediate Boundary Event',
    'event.TimerIntermediateBoundary': 'Timer Intermediate Boundary Event',
    'event.ConditionalIntermediateBoundary': 'Conditional Intermediate Boundary Event',
    'event.SignalIntermediateBoundary': 'Signal Intermediate Boundary Event',
    'event.ErrorIntermediateBoundary': 'Error Intermediate Boundary Event',
    'event.EscalationIntermediateBoundary': 'Escalation Intermediate Boundary Event',
    'event.CompensationIntermediateBoundary': 'Compensation Intermediate Boundary Event',
    'event.CancelIntermediateBoundary': 'Cancel Intermediate Boundary Event',
    // Intermediate boundary non-interrupting
    'event.MessageIntermediateBoundaryNonInterrupting': 'Non-Interrupting Message Intermediate Boundary Event',
    'event.TimerIntermediateBoundaryNonInterrupting': 'Non-Interrupting Timer Intermediate Boundary Event',
    'event.ConditionalIntermediateBoundaryNonInterrupting': 'Non-Interrupting Conditional Intermediate Boundary Event',
    'event.SignalIntermediateBoundaryNonInterrupting': 'Non-Interrupting Signal Intermediate Boundary Event',
    'event.EscalationIntermediateBoundaryNonInterrupting': 'Non-Interrupting Escalation Intermediate Boundary Event',
    // Intermediate throwing
    'event.IntermediateThrowing': 'Intermediate Throwing Event',
    'event.MessageIntermediateThrowing': 'Message Intermediate Throwing Event',
    'event.LinkIntermediateThrowing': 'Link Intermediate Throwing Event',
    'event.SignalIntermediateThrowing': 'Signal Intermediate Throwing Event',
    'event.EscalationIntermediateThrowing': 'Escalation Intermediate Throwing Event',
    'event.CompensationIntermediateThrowing': 'Compensation Intermediate Throwing Event',
    // End
    'event.End': 'End Event',
    'event.MessageEnd': 'Message End Event',
    'event.SignalEnd': 'Signal End Event',
    'event.ErrorEnd': 'Error End Event',
    'event.EscalationEnd': 'Escalation End Event',
    'event.TerminationEnd': 'Termination End Event',
    'event.CompensationEnd': 'Compensation End Event',
    'event.CancelEnd': 'Cancel End Event'
};

export var EventShapeTypes;
(function (EventShapeTypes) {
    // Start
    EventShapeTypes["START"] = "event.Start";
    EventShapeTypes["MESSAGE_START"] = "event.MessageStart";
    EventShapeTypes["TIMER_START"] = "event.TimerStart";
    EventShapeTypes["CONDITIONAL_START"] = "event.ConditionalStart";
    EventShapeTypes["SIGNAL_START"] = "event.SignalStart";
    // Intermediate Catching
    EventShapeTypes["INTERMEDIATE_CATCHING"] = "event.IntermediateCatching";
    EventShapeTypes["MESSAGE_INTERMEDIATE_CATCHING"] = "event.MessageIntermediateCatching";
    EventShapeTypes["TIMER_INTERMEDIATE_CATCHING"] = "event.TimerIntermediateCatching";
    EventShapeTypes["CONDITIONAL_INTERMEDIATE_CATCHING"] = "event.ConditionalIntermediateCatching";
    EventShapeTypes["LINK_INTERMEDIATE_CATCHING"] = "event.LinkIntermediateCatching";
    EventShapeTypes["SIGNAL_INTERMEDIATE_CATCHING"] = "event.SignalIntermediateCatching";
    // Intermediate boundary
    EventShapeTypes["INTERMEDIATE_BOUNDARY"] = "event.IntermediateBoundary";
    EventShapeTypes["MESSAGE_INTERMEDIATE_BOUNDARY"] = "event.MessageIntermediateBoundary";
    EventShapeTypes["TIMER_INTERMEDIATE_BOUNDARY"] = "event.TimerIntermediateBoundary";
    EventShapeTypes["CONDITIONAL_INTERMEDIATE_BOUNDARY"] = "event.ConditionalIntermediateBoundary";
    EventShapeTypes["SIGNAL_INTERMEDIATE_BOUNDARY"] = "event.SignalIntermediateBoundary";
    EventShapeTypes["ERROR_INTERMEDIATE_BOUNDARY"] = "event.ErrorIntermediateBoundary";
    EventShapeTypes["ESCALATION_INTERMEDIATE_BOUNDARY"] = "event.EscalationIntermediateBoundary";
    EventShapeTypes["COMPENSATION_INTERMEDIATE_BOUNDARY"] = "event.CompensationIntermediateBoundary";
    EventShapeTypes["CANCEL_INTERMEDIATE_BOUNDARY"] = "event.CancelIntermediateBoundary";
    // Intermediate boundary non-interrupting
    EventShapeTypes["MESSAGE_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING"] = "event.MessageIntermediateBoundaryNonInterrupting";
    EventShapeTypes["TIMER_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING"] = "event.TimerIntermediateBoundaryNonInterrupting";
    EventShapeTypes["CONDITIONAL_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING"] = "event.ConditionalIntermediateBoundaryNonInterrupting";
    EventShapeTypes["SIGNAL_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING"] = "event.SignalIntermediateBoundaryNonInterrupting";
    EventShapeTypes["ESCALATION_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING"] = "event.EscalationIntermediateBoundaryNonInterrupting";
    // Intermediate throwing
    EventShapeTypes["INTERMEDIATE_THROWING"] = "event.IntermediateThrowing";
    EventShapeTypes["MESSAGE_INTERMEDIATE_THROWING"] = "event.MessageIntermediateThrowing";
    EventShapeTypes["LINK_INTERMEDIATE_THROWING"] = "event.LinkIntermediateThrowing";
    EventShapeTypes["SIGNAL_INTERMEDIATE_THROWING"] = "event.SignalIntermediateThrowing";
    EventShapeTypes["ESCALATION_INTERMEDIATE_THROWING"] = "event.EscalationIntermediateThrowing";
    EventShapeTypes["COMPENSATION_INTERMEDIATE_THROWING"] = "event.CompensationIntermediateThrowing";
    // End
    EventShapeTypes["END"] = "event.End";
    EventShapeTypes["MESSAGE_END"] = "event.MessageEnd";
    EventShapeTypes["SIGNAL_END"] = "event.SignalEnd";
    EventShapeTypes["ERROR_END"] = "event.ErrorEnd";
    EventShapeTypes["ESCALATION_END"] = "event.EscalationEnd";
    EventShapeTypes["TERMINATION_END"] = "event.TerminationEnd";
    EventShapeTypes["COMPENSATION_END"] = "event.CompensationEnd";
    EventShapeTypes["CANCEL_END"] = "event.CancelEnd";
})(EventShapeTypes || (EventShapeTypes = {}));

export const eventIconClasses = {
    // Start
    START: 'jj-bpmn-icon-start-event-none',
    MESSAGE_START: 'jj-bpmn-icon-start-event-message',
    TIMER_START: 'jj-bpmn-icon-start-event-timer',
    CONDITIONAL_START: 'jj-bpmn-icon-start-event-condition',
    SIGNAL_START: 'jj-bpmn-icon-start-event-signal',
    // Intermediate Catching
    INTERMEDIATE_CATCHING: 'jj-bpmn-icon-intermediate-event-none',
    MESSAGE_INTERMEDIATE_CATCHING: 'jj-bpmn-icon-intermediate-event-catch-message',
    TIMER_INTERMEDIATE_CATCHING: 'jj-bpmn-icon-intermediate-event-catch-timer',
    CONDITIONAL_INTERMEDIATE_CATCHING: 'jj-bpmn-icon-intermediate-event-catch-condition',
    LINK_INTERMEDIATE_CATCHING: 'jj-bpmn-icon-intermediate-event-catch-link',
    SIGNAL_INTERMEDIATE_CATCHING: 'jj-bpmn-icon-intermediate-event-catch-signal',
    // Intermediate boundary
    INTERMEDIATE_BOUNDARY: 'jj-bpmn-icon-intermediate-event-none',
    MESSAGE_INTERMEDIATE_BOUNDARY: 'jj-bpmn-icon-intermediate-event-catch-message',
    TIMER_INTERMEDIATE_BOUNDARY: 'jj-bpmn-icon-intermediate-event-catch-timer',
    CONDITIONAL_INTERMEDIATE_BOUNDARY: 'jj-bpmn-icon-intermediate-event-catch-condition',
    SIGNAL_INTERMEDIATE_BOUNDARY: 'jj-bpmn-icon-intermediate-event-catch-signal',
    ERROR_INTERMEDIATE_BOUNDARY: 'jj-bpmn-icon-intermediate-event-catch-error',
    ESCALATION_INTERMEDIATE_BOUNDARY: 'jj-bpmn-icon-intermediate-event-catch-escalation',
    COMPENSATION_INTERMEDIATE_BOUNDARY: 'jj-bpmn-icon-intermediate-event-catch-compensation',
    CANCEL_INTERMEDIATE_BOUNDARY: 'jj-bpmn-icon-intermediate-event-catch-cancel',
    // Intermediate boundary non-interrupting
    MESSAGE_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING: 'jj-bpmn-icon-intermediate-event-catch-non-interrupting-message',
    TIMER_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING: 'jj-bpmn-icon-intermediate-event-catch-non-interrupting-timer',
    CONDITIONAL_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING: 'jj-bpmn-icon-intermediate-event-catch-non-interrupting-condition',
    SIGNAL_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING: 'jj-bpmn-icon-intermediate-event-catch-non-interrupting-signal',
    ESCALATION_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING: 'jj-bpmn-icon-intermediate-event-catch-non-interrupting-escalation',
    // Intermediate throwing
    INTERMEDIATE_THROWING: 'jj-bpmn-icon-intermediate-event-none',
    MESSAGE_INTERMEDIATE_THROWING: 'jj-bpmn-icon-intermediate-event-throw-message',
    LINK_INTERMEDIATE_THROWING: 'jj-bpmn-icon-intermediate-event-throw-link',
    SIGNAL_INTERMEDIATE_THROWING: 'jj-bpmn-icon-intermediate-event-throw-signal',
    ESCALATION_INTERMEDIATE_THROWING: 'jj-bpmn-icon-intermediate-event-throw-escalation',
    COMPENSATION_INTERMEDIATE_THROWING: 'jj-bpmn-icon-intermediate-event-throw-compensation',
    // End
    END: 'jj-bpmn-icon-end-event-none',
    MESSAGE_END: 'jj-bpmn-icon-end-event-message',
    SIGNAL_END: 'jj-bpmn-icon-end-event-signal',
    ERROR_END: 'jj-bpmn-icon-end-event-error',
    ESCALATION_END: 'jj-bpmn-icon-end-event-escalation',
    TERMINATION_END: 'jj-bpmn-icon-end-event-termination',
    COMPENSATION_END: 'jj-bpmn-icon-end-event-compensation',
    CANCEL_END: 'jj-bpmn-icon-end-event-cancel'
};

export const eventAppearanceConfig = {
    groups: {
        style: {
            label: 'Style',
            index: 1
        },
        text: {
            label: 'Text',
            index: 2
        }
    },
    inputs: {
        attrs: {
            background: {
                fill: {
                    type: 'color',
                    label: 'Fill',
                    group: 'style',
                    index: 1
                }
            },
            border: {
                stroke: {
                    type: 'color',
                    label: 'Outline',
                    group: 'style',
                    index: 2
                }
            },
            label: {
                fontFamily: {
                    type: 'select-box',
                    label: 'Font style',
                    group: 'text',
                    index: 1,
                    options: inspectorOptions.fontFamily
                },
                fontSize: {
                    type: 'select-box',
                    label: 'Size',
                    group: 'text',
                    index: 2,
                    options: inspectorOptions.fontSize
                },
                fontWeight: {
                    type: 'select-box',
                    label: 'Font thickness',
                    group: 'text',
                    index: 3,
                    options: inspectorOptions.fontWeight
                },
                fill: {
                    type: 'color',
                    label: 'Color',
                    group: 'text',
                    index: 4
                }
            }
        }
    }
};
