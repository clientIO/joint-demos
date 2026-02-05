import { inspectorOptions } from '../shared-config';

export const GroupLabels = {
    'group.Group': 'Group'
};

export enum GroupShapeTypes {
    GROUP = 'group.Group'
}

export const groupAppearanceConfig = {
    groups: {
        style: {
            label: 'Style',
            index: 1
        },
        label: {
            label: 'Text',
            index: 2
        }
    },
    inputs: {
        attrs: {
            body: {
                stroke: {
                    type: 'color',
                    label: 'Outline',
                    group: 'style',
                    index: 1
                },
            },
            label: {
                fontFamily: {
                    type: 'select-box',
                    label: 'Font style',
                    group: 'label',
                    index: 1,
                    options: inspectorOptions.fontFamily
                },
                fontSize: {
                    type: 'select-box',
                    label: 'Size',
                    group: 'label',
                    index: 2,
                    options: inspectorOptions.fontSize
                },
                fontWeight: {
                    type: 'select-box',
                    label: 'Font thickness',
                    group: 'label',
                    index: 3,
                    options: inspectorOptions.fontWeight
                },
                fill: {
                    type: 'color',
                    label: 'Color',
                    group: 'label',
                    index: 4
                }
            }
        }
    }
};
