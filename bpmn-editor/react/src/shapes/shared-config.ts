import type { MarkerNames } from './shapes-typing';
import type { AppearanceSelectOption } from './shapes-typing';

const FONT_FAMILY = 'Open Sans';
const FONT_SIZE = 12;
const FONT_WEIGHT = 'normal';
const TEXT_FILL = 'var(--bpmn-palette-ink)';

export const defaultAttrs = {
    labelBody: {
        ref: 'label',
        fill: 'var(--bpmn-palette-surface)',
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

export const inspectorOptions: Record<string, AppearanceSelectOption[]> = {
    fontFamily: [
        { value: 'Open Sans', label: 'Open Sans' },
        { value: 'DM Sans', label: 'DM Sans' },
        { value: 'Roboto Flex', label: 'Roboto Flex' }
    ],
    fontSize: [
        { value: 8, label: '8' },
        { value: 10, label: '10' },
        { value: 12, label: '12' },
        { value: 14, label: '14' }
    ],
    fontWeight: [
        { value: '300', label: 'Light' },
        { value: 'normal', label: 'Normal' },
        { value: 'bold', label: 'Bold' }
    ]
};

export const markerClasses: Omit<Record<keyof typeof MarkerNames, string>, 'SUB_PROCESS'> = {
    PARALLEL: 'jj-bpmn-icon-marker-parallel',
    SEQUENTIAL: 'jj-bpmn-icon-marker-sequential',
    COMPENSATION: 'jj-bpmn-icon-marker-compensation',
    AD_HOC: 'jj-bpmn-icon-marker-ad-hoc',
    LOOP: 'jj-bpmn-icon-marker-loop',
    COLLECTION: 'jj-bpmn-icon-marker-parallel'
};

export const labelEditorWrapperStyles: Partial<CSSStyleDeclaration> = {
    borderWidth: '2px',
};
