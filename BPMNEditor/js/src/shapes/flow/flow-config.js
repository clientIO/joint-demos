import { defaultAttrs, inspectorOptions } from '../shared-config';

export const FlowLabels = {
    'flow.Sequence': 'Sequence Flow',
    'flow.Default': 'Default Flow',
    'flow.Conditional': 'Conditional Flow',
    'flow.Message': 'Message Flow'
};

export var FlowShapeTypes;
(function (FlowShapeTypes) {
    FlowShapeTypes["SEQUENCE"] = "flow.Sequence";
    FlowShapeTypes["DEFAULT"] = "flow.Default";
    FlowShapeTypes["CONDITIONAL"] = "flow.Conditional";
    FlowShapeTypes["MESSAGE"] = "flow.Message";
})(FlowShapeTypes || (FlowShapeTypes = {}));

export const flowIconClasses = {
    SEQUENCE: 'jj-bpmn-icon-sequence-flow',
    DEFAULT: 'jj-bpmn-icon-default-flow',
    CONDITIONAL: 'jj-bpmn-icon-condition-flow'
};

export const flowAppearanceConfig = {
    groups: {
        style: {
            label: 'Style',
            index: 1
        },
        label: {
            label: 'Label',
            index: 2
        }
    },
    inputs: {
        attrs: {
            line: {
                stroke: {
                    type: 'color',
                    label: 'Color',
                    group: 'style',
                    index: 1
                }
            }
        },
        labels: {
            0: {
                type: 'object',
                group: 'label',
                when: { ne: { 'labels/0': null } },
                properties: {
                    attrs: {
                        body: {
                            fill: {
                                type: 'color',
                                label: 'Background',
                                group: 'label',
                                defaultValue: defaultAttrs.labelBody.fill,
                                index: 1
                            },
                            stroke: {
                                type: 'color',
                                label: 'Outline',
                                group: 'label',
                                defaultValue: defaultAttrs.labelBody.stroke,
                                index: 2
                            }
                        },
                        label: {
                            fontFamily: {
                                type: 'select-box',
                                label: 'Font style',
                                group: 'text',
                                index: 3,
                                defaultValue: defaultAttrs.linkLabel.fontFamily,
                                options: inspectorOptions.fontFamily
                            },
                            fontSize: {
                                type: 'select-box',
                                label: 'Size',
                                group: 'text',
                                index: 4,
                                defaultValue: defaultAttrs.linkLabel.fontSize,
                                options: inspectorOptions.fontSize
                            },
                            fontWeight: {
                                type: 'select-box',
                                label: 'Font thickness',
                                group: 'text',
                                index: 5,
                                defaultValue: defaultAttrs.linkLabel.fontWeight,
                                options: inspectorOptions.fontWeight
                            },
                            fill: {
                                type: 'color',
                                label: 'Text Color',
                                index: 6
                            }
                        }
                    }
                }
            }
        }
    }
};
