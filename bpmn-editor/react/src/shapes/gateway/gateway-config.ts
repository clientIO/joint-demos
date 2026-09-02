import { inspectorOptions } from '../shared-config';
import type { AppearanceConfig } from '../shapes-typing';

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

export const gatewayAppearanceConfig: AppearanceConfig = [
    {
        label: 'Style',
        fields: [
            { type: 'color', role: 'fill', path: 'attrs/body/fill', label: 'Fill' },
            { type: 'color', role: 'outline', path: 'attrs/body/stroke', label: 'Outline' }
        ]
    },
    {
        label: 'Text',
        fields: [
            { type: 'select-box', role: 'font-family', path: 'attrs/label/fontFamily', label: 'Font style', options: inspectorOptions.fontFamily },
            { type: 'select-box', role: 'font-size', path: 'attrs/label/fontSize', label: 'Size', options: inspectorOptions.fontSize },
            { type: 'select-box', role: 'font-weight', path: 'attrs/label/fontWeight', label: 'Font thickness', options: inspectorOptions.fontWeight },
            { type: 'color', role: 'text', path: 'attrs/label/fill', label: 'Color' }
        ]
    }
];
