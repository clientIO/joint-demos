import { inspectorOptions } from '../shared-config';

export const AnnotationLabels = {
    'annotation.Annotation': 'Annotation',
    'annotation.AnnotationLink': 'Annotation Link'
};

export enum AnnotationShapeTypes {
    ANNOTATION = 'annotation.Annotation',
    LINK = 'annotation.AnnotationLink',
}

export const annotationIconClasses = {
    ANNOTATION: 'jj-bpmn-icon-text-annotation'
};

export const annotationAppearanceConfig = {
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

export const annotationLinkAppearanceConfig = {
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
        }
    }
};
