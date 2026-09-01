import { inspectorOptions } from '../shared-config';
import type { AppearanceConfig } from '../shapes-typing';

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

export enum ActivityShapeTypes {
    TASK = 'activity.Task',
    SEND = 'activity.Send',
    SERVICE = 'activity.Service',
    MANUAL = 'activity.Manual',
    BUSINESS_RULE = 'activity.BusinessRule',
    RECEIVE = 'activity.Receive',
    USER = 'activity.User',
    SCRIPT = 'activity.Script',
    SUB_PROCESS = 'activity.SubProcess',
    CALL_ACTIVITY = 'activity.CallActivity',
    EVENT_SUB_PROCESS = 'activity.EventSubProcess'
}

// The size a task is created at. Exported because a lane is sized to hold
// one (see `DEFAULT_LANE_HEIGHT`).
export const DEFAULT_ACTIVITY_SIZE = {
    width: 100,
    height: 80
};

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

export const activityAppearanceConfig: AppearanceConfig = [
    {
        label: 'Style',
        fields: [
            { type: 'color', role: 'fill', path: 'attrs/background/fill', label: 'Fill' },
            { type: 'color', role: 'outline', path: 'attrs/border/stroke', label: 'Outline' }
        ]
    },
    {
        label: 'Text',
        fields: [
            { type: 'select-box', path: 'attrs/label/fontFamily', label: 'Font style', options: inspectorOptions.fontFamily },
            { type: 'select-box', path: 'attrs/label/fontSize', label: 'Size', options: inspectorOptions.fontSize },
            { type: 'select-box', path: 'attrs/label/fontWeight', label: 'Font thickness', options: inspectorOptions.fontWeight },
            { type: 'color', role: 'text', path: 'attrs/label/fill', label: 'Color' }
        ]
    }
];
