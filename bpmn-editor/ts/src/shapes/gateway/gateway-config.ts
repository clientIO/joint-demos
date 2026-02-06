import { inspectorOptions } from '../shared-config';

export const GatewayLabels = {
    'gateway.Exclusive': 'Exclusive Gateway',
    'gateway.Inclusive': 'Inclusive Gateway',
    'gateway.EventBased': 'Event based Gateway',
    'gateway.Parallel': 'Parallel Gateway',
    'gateway.Complex': 'Complex Gateway'
};

export enum GatewayShapeTypes {
    EXCLUSIVE = 'gateway.Exclusive',
    INCLUSIVE = 'gateway.Inclusive',
    EVENT_BASED = 'gateway.EventBased',
    PARALLEL = 'gateway.Parallel',
    COMPLEX = 'gateway.Complex'
}

export const gatewayIconClasses = {
    EMPTY: 'jj-bpmn-icon-gateway-none',
    EXCLUSIVE: 'jj-bpmn-icon-gateway-xor',
    INCLUSIVE: 'jj-bpmn-icon-gateway-or',
    EVENT_BASED: 'jj-bpmn-icon-gateway-eventbased',
    PARALLEL: 'jj-bpmn-icon-gateway-parallel',
    COMPLEX: 'jj-bpmn-icon-gateway-complex'
};

export const gatewayAppearanceConfig = {
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
            body: {
                fill: {
                    type: 'color',
                    label: 'Fill',
                    group: 'style',
                    index: 1
                },
                stroke: {
                    type: 'color',
                    label: 'Outline',
                    group: 'style',
                    index: 2
                },
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
                    label: 'Fill',
                    group: 'text',
                    index: 4
                }
            }
        }
    }
};
