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
            { type: 'select-box', path: 'attrs/label/fontFamily', label: 'Font style', options: inspectorOptions.fontFamily },
            { type: 'select-box', path: 'attrs/label/fontSize', label: 'Size', options: inspectorOptions.fontSize },
            { type: 'select-box', path: 'attrs/label/fontWeight', label: 'Font thickness', options: inspectorOptions.fontWeight },
            { type: 'color', role: 'text', path: 'attrs/label/fill', label: 'Color' }
        ]
    }
];

// No roles: a link is edited on its own. It has a line where an element
// has a fill, and its label colour only exists once it has a label.
export const annotationLinkAppearanceConfig: AppearanceConfig = [
    {
        label: 'Style',
        fields: [
            { type: 'color', path: 'attrs/line/stroke', label: 'Color' }
        ]
    }
];
