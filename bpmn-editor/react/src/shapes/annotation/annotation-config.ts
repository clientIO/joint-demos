import { inspectorOptions } from '../shared-config';
import type { AppearanceConfig } from '../shapes-typing';

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

export const annotationAppearanceConfig: AppearanceConfig = [
    {
        label: 'Style',
        fields: [
            { type: 'color', role: 'outline', path: 'attrs/border/stroke', label: 'Outline' }
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

export const annotationLinkAppearanceConfig: AppearanceConfig = [
    {
        label: 'Style',
        fields: [
            { type: 'color', role: 'outline', path: 'attrs/line/stroke', label: 'Color' }
        ]
    }
];
