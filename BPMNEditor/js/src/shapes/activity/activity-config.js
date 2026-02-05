import { inspectorOptions } from '../shared-config';

export const ActivityLabels = {
    'activity.Task': 'Task',
    'activity.Send': 'Send Task',
    'activity.Service': 'Service Task',
    'activity.Manual': 'Manual Task',
    'activity.BusinessRule': 'Business Rule Task',
    'activity.Receive': 'Receive Task',
    'activity.User': 'User Task',
    'activity.Script': 'Script Task',
    'activity.SubProcess': 'Sub-Process',
    'activity.CallActivity': 'Call Activity',
    'activity.EventSubProcess': 'Event Sub-Process'
};

export var ActivityShapeTypes;
(function (ActivityShapeTypes) {
    ActivityShapeTypes["TASK"] = "activity.Task";
    ActivityShapeTypes["SEND"] = "activity.Send";
    ActivityShapeTypes["SERVICE"] = "activity.Service";
    ActivityShapeTypes["MANUAL"] = "activity.Manual";
    ActivityShapeTypes["BUSINESS_RULE"] = "activity.BusinessRule";
    ActivityShapeTypes["RECEIVE"] = "activity.Receive";
    ActivityShapeTypes["USER"] = "activity.User";
    ActivityShapeTypes["SCRIPT"] = "activity.Script";
    ActivityShapeTypes["SUB_PROCESS"] = "activity.SubProcess";
    ActivityShapeTypes["CALL_ACTIVITY"] = "activity.CallActivity";
    ActivityShapeTypes["EVENT_SUB_PROCESS"] = "activity.EventSubProcess";
})(ActivityShapeTypes || (ActivityShapeTypes = {}));

export const activityIconClasses = {
    TASK: 'jj-bpmn-icon-task',
    SEND: 'jj-bpmn-icon-send-task',
    SERVICE: 'jj-bpmn-icon-service-task',
    MANUAL: 'jj-bpmn-icon-manual-task',
    BUSINESS_RULE: 'jj-bpmn-icon-business-rule-task',
    RECEIVE: 'jj-bpmn-icon-receive-task',
    USER: 'jj-bpmn-icon-user-task',
    SCRIPT: 'jj-bpmn-icon-script-task',
    SUB_PROCESS: 'jj-bpmn-icon-subprocess-collapsed',
    CALL_ACTIVITY: 'jj-bpmn-icon-call-activity',
    EVENT_SUB_PROCESS: 'jj-bpmn-icon-event-subprocess-collapsed'
};

export const activityAppearanceConfig = {
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
