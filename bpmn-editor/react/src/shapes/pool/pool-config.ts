import { inspectorOptions } from '../shared-config';

import type { dia, shapes } from '@joint/plus';
import type { AppearanceConfig } from '../shapes-typing';

export const PoolLabels = {
    'pool.HorizontalPool': 'Horizontal Pool',
    'pool.VerticalPool': 'Vertical Pool',
    'pool.HorizontalSwimlane': 'Horizontal Lane',
    'pool.VerticalSwimlane': 'Vertical Lane'
};

export enum PoolShapeTypes {
    HORIZONTAL_POOL = 'pool.HorizontalPool',
    VERTICAL_POOL = 'pool.VerticalPool',
    HORIZONTAL_SWIMLANE = 'pool.HorizontalSwimlane',
    VERTICAL_SWIMLANE = 'pool.VerticalSwimlane'
}

// The icons pools and lanes are shown with — the same glyphs the stencil
// uses, as a class, so `getShapeMeta()` can hand them to anything listing
// shapes (the link targets, the inspector).
export const poolIconClasses = {
    HORIZONTAL_POOL: 'jj-bpmn-icon-horizontal-pool',
    VERTICAL_POOL: 'jj-bpmn-icon-vertical-pool',
    HORIZONTAL_SWIMLANE: 'jj-bpmn-icon-horizontal-swimlane'
} as const;

export const LANE_CONTENT_MARGIN = 20;
const MIN_LANE_SIZE = 60;
export const DEFAULT_LANE_HEIGHT = 100;
export const SWIMLANE_HEADER_SIZE = 30;

export const DEFAULT_HORIZONTAL_POOL_SIZE = {
    width: 600,
    height: 250,
};

export const DEFAULT_VERTICAL_POOL_SIZE = {
    width: 250,
    height: 600,
};

export const HORIZONTAL_POOL_PADDING = {
    left: 30
};

export const VERTICAL_POOL_PADDING = {
    top: 30
};

export const poolAttributes: Partial<shapes.bpmn2.CompositePool.Attributes<dia.Cell.Selectors>> = {
    headerTextMargin: 5,
    contentMargin: LANE_CONTENT_MARGIN,
    minimumLaneSize: MIN_LANE_SIZE
};

export const swimlaneAttributes: Partial<shapes.bpmn2.Swimlane.Attributes<dia.Cell.Selectors>> = {
    headerSize: SWIMLANE_HEADER_SIZE,
    headerTextMargin: 5,
    contentMargin: LANE_CONTENT_MARGIN,
};

export const poolAppearanceConfig: AppearanceConfig = [
    {
        label: 'Header Style',
        fields: [
            { type: 'color', path: 'attrs/header/fill', label: 'Fill' },
            { type: 'color', path: 'attrs/header/stroke', label: 'Outline' }
        ]
    },
    {
        label: 'Body Style',
        fields: [
            { type: 'color', path: 'attrs/body/fill', label: 'Fill' },
            { type: 'color', path: 'attrs/body/stroke', label: 'Outline' }
        ]
    },
    {
        label: 'Text',
        fields: [
            { type: 'select-box', path: 'attrs/headerText/fontFamily', label: 'Font style', options: inspectorOptions.fontFamily },
            { type: 'select-box', path: 'attrs/headerText/fontWeight', label: 'Font thickness', options: inspectorOptions.fontWeight },
            { type: 'color', path: 'attrs/headerText/fill', label: 'Color' }
        ]
    }
];

export const swimlaneAppearanceConfig: AppearanceConfig = [
    {
        label: 'Body Style',
        fields: [
            { type: 'color', path: 'attrs/body/fill', label: 'Fill' },
            { type: 'color', path: 'attrs/body/stroke', label: 'Outline' }
        ]
    },
    {
        label: 'Text',
        fields: [
            { type: 'select-box', path: 'attrs/headerText/fontFamily', label: 'Font style', options: inspectorOptions.fontFamily },
            { type: 'select-box', path: 'attrs/headerText/fontWeight', label: 'Font thickness', options: inspectorOptions.fontWeight },
            { type: 'color', path: 'attrs/headerText/fill', label: 'Color' }
        ]
    }
];
