
const FONT_FAMILY = 'Open Sans';
const FONT_SIZE = 12;
const FONT_WEIGHT = 'normal';
const TEXT_FILL = '#333333';

export const defaultAttrs = {
    labelBody: {
        ref: 'label',
        fill: '#FFFFFF',
        stroke: 'none',
        strokeWidth: 1,
        width: 'calc(w + 10)',
        height: 'calc(h)',
        x: 'calc(x - 5)',
        y: 'calc(y)',
        rx: 5,
        ry: 5
    },
    shapeLabel: {
        fontFamily: FONT_FAMILY,
        fontWeight: FONT_WEIGHT,
        fontSize: FONT_SIZE,
        cursor: 'text',
        fill: TEXT_FILL
    },
    linkLabel: {
        fontFamily: FONT_FAMILY,
        fontWeight: FONT_WEIGHT,
        fontSize: FONT_SIZE,
        textWrap: {
            width: 100,
            height: 100,
            ellipsis: true
        },
        fill: TEXT_FILL,
        textAnchor: 'middle',
        textVerticalAnchor: 'middle'
    }
};

export const inspectorOptions = {
    fontFamily: [
        { value: 'Open Sans', content: '<span style="font-family: Open Sans">Open Sans</span>' },
        { value: 'DM Sans', content: '<span style="font-family: DM Sans">DM Sans</span>' },
        { value: 'Roboto Flex', content: '<span style="font-family: Roboto Flex">Roboto Flex</span>' }
    ],
    fontSize: [
        8,
        10,
        12,
        14
    ],
    fontWeight: [
        { value: '300', content: '<span style="font-weight: 300">Light</span>' },
        { value: 'normal', content: '<span style="font-weight: Normal">Normal</span>' },
        { value: 'bold', content: '<span style="font-weight: Bolder">Bold</span>' }
    ]
};

export const markerClasses = {
    PARALLEL: 'jj-bpmn-icon-marker-parallel',
    SEQUENTIAL: 'jj-bpmn-icon-marker-sequential',
    COMPENSATION: 'jj-bpmn-icon-marker-compensation',
    AD_HOC: 'jj-bpmn-icon-marker-ad-hoc',
    LOOP: 'jj-bpmn-icon-marker-loop',
    COLLECTION: 'jj-bpmn-icon-marker-parallel'
};

export const labelEditorWrapperStyles = {
    borderWidth: '2px',
};
