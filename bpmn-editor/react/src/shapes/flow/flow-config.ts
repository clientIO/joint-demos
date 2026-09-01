import { defaultAttrs, inspectorOptions } from '../shared-config';
import type { AppearanceConfig } from '../shapes-typing';

export const FlowLabels = {
    'flow.Sequence': 'Sequence Flow',
    'flow.Default': 'Default Flow',
    'flow.Conditional': 'Conditional Flow',
    'flow.Message': 'Message Flow'
};

export enum FlowShapeTypes {
    SEQUENCE = 'flow.Sequence',
    DEFAULT = 'flow.Default',
    CONDITIONAL = 'flow.Conditional',
    MESSAGE = 'flow.Message'
}

export const flowIconClasses = {
    SEQUENCE: 'jj-bpmn-icon-sequence-flow',
    DEFAULT: 'jj-bpmn-icon-default-flow',
    CONDITIONAL: 'jj-bpmn-icon-condition-flow'
};

export const flowAppearanceConfig: AppearanceConfig = [
    {
        label: 'Style',
        fields: [
            { type: 'color', role: 'outline', path: 'attrs/line/stroke', label: 'Color' }
        ]
    },
    {
        label: 'Label',
        // The label styles only make sense once the link has a label
        visibleWhen: (cell) => cell.prop('labels/0') != null,
        fields: [
            { type: 'color', path: 'labels/0/attrs/body/fill', label: 'Background', defaultValue: defaultAttrs.labelBody.fill },
            { type: 'color', path: 'labels/0/attrs/body/stroke', label: 'Outline', defaultValue: defaultAttrs.labelBody.stroke },
            { type: 'select-box', role: 'font-family', path: 'labels/0/attrs/label/fontFamily', label: 'Font style', options: inspectorOptions.fontFamily, defaultValue: defaultAttrs.linkLabel.fontFamily },
            { type: 'select-box', role: 'font-size', path: 'labels/0/attrs/label/fontSize', label: 'Size', options: inspectorOptions.fontSize, defaultValue: defaultAttrs.linkLabel.fontSize },
            { type: 'select-box', role: 'font-weight', path: 'labels/0/attrs/label/fontWeight', label: 'Font thickness', options: inspectorOptions.fontWeight, defaultValue: defaultAttrs.linkLabel.fontWeight },
            { type: 'color', role: 'text', path: 'labels/0/attrs/label/fill', label: 'Text Color' }
        ]
    }
];
