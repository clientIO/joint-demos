import { inspectorOptions } from '../shared-config';
import type { AppearanceConfig } from '../shapes-typing';

export const DataLabels =  {
    'data.DataStore': 'Data Store',
    'data.DataObject': 'Data Object',
    'data.DataInput': 'Data Input',
    'data.DataOutput': 'Data Output',
    'data.DataAssociation': 'Data Association'
};

export enum DataShapeTypes {
    DATA_STORE = 'data.DataStore',
    DATA_OBJECT = 'data.DataObject',
    DATA_INPUT = 'data.DataInput',
    DATA_OUTPUT = 'data.DataOutput',
    DATA_ASSOCIATION = 'data.DataAssociation'
}

export const dataIconClasses = {
    DATA_STORE: 'jj-bpmn-icon-data-store',
    DATA_OBJECT: 'jj-bpmn-icon-data-object',
    DATA_INPUT: 'jj-bpmn-icon-data-input',
    DATA_OUTPUT: 'jj-bpmn-icon-data-output'
};

export const dataObjectAppearanceConfig: AppearanceConfig = [
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

export const dataStoreAppearanceConfig: AppearanceConfig = [
    {
        label: 'Style',
        fields: [
            // The cap has no counterpart on any other shape, so it carries
            // no role and stays out of a multi-shape form.
            { type: 'color', path: 'attrs/top/fill', label: 'Top fill' },
            { type: 'color', path: 'attrs/top/stroke', label: 'Top outline' },
            { type: 'color', role: 'fill', path: 'attrs/body/fill', label: 'Body fill' },
            { type: 'color', role: 'outline', path: 'attrs/body/stroke', label: 'Body outline' }
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

export const dataAssociationAppearanceConfig: AppearanceConfig = [
    {
        label: 'Style',
        fields: [
            { type: 'color', role: 'outline', path: 'attrs/line/stroke', label: 'Color' }
        ]
    }
];
