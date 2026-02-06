import { inspectorOptions } from '../shared-config';

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

export const dataObjectAppearanceConfig = {
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

export const dataStoreAppearanceConfig = {
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
            top: {
                fill: {
                    type: 'color',
                    label: 'Top fill',
                    group: 'style',
                    index: 1
                },
                stroke: {
                    type: 'color',
                    label: 'Top outline',
                    group: 'style',
                    index: 2
                }
            },
            body: {
                fill: {
                    type: 'color',
                    label: 'Body fill',
                    group: 'style',
                    index: 3
                },
                stroke: {
                    type: 'color',
                    label: 'Body outline',
                    group: 'style',
                    index: 4
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

export const dataAssociationAppearanceConfig = {
    groups: {
        style: {
            label: 'Style',
            index: 1
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
