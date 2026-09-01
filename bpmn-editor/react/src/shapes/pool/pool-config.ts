import { inspectorOptions } from '../shared-config';
import { DEFAULT_ACTIVITY_SIZE } from '../activity/activity-config';

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
export const SWIMLANE_HEADER_SIZE = 30;

// A lane is created big enough to hold a task with the content margin clear
// on both sides. The library's own default is 60, which a task overflows on
// the way in — the pool then has to grow to take it, and a lane that cannot
// hold one shape is no use as a starting size.
export const DEFAULT_LANE_HEIGHT = DEFAULT_ACTIVITY_SIZE.height + 2 * LANE_CONTENT_MARGIN;
export const DEFAULT_LANE_WIDTH = DEFAULT_ACTIVITY_SIZE.width + 2 * LANE_CONTENT_MARGIN;

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

// A pool always has at least one lane — one is created with it and the last
// one cannot be removed — so its lanes cover its body and the header is the
// only part of the pool anyone sees. The header therefore carries the roles,
// which is what lets a pool be recoloured beside a lane or an ordinary shape.
export const poolAppearanceConfig: AppearanceConfig = [
    {
        label: 'Header Style',
        fields: [
            { type: 'color', role: 'fill', path: 'attrs/header/fill', label: 'Fill' },
            { type: 'color', role: 'outline', path: 'attrs/header/stroke', label: 'Outline' }
        ]
    },
    {
        // No roles: behind the lanes, so nothing shows.
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
            { type: 'color', role: 'text', path: 'attrs/headerText/fill', label: 'Color' }
        ]
    }
];

export const swimlaneAppearanceConfig: AppearanceConfig = [
    {
        label: 'Body Style',
        fields: [
            { type: 'color', role: 'fill', path: 'attrs/body/fill', label: 'Fill' },
            { type: 'color', role: 'outline', path: 'attrs/body/stroke', label: 'Outline' }
        ]
    },
    {
        label: 'Text',
        fields: [
            { type: 'select-box', path: 'attrs/headerText/fontFamily', label: 'Font style', options: inspectorOptions.fontFamily },
            { type: 'select-box', path: 'attrs/headerText/fontWeight', label: 'Font thickness', options: inspectorOptions.fontWeight },
            { type: 'color', role: 'text', path: 'attrs/headerText/fill', label: 'Color' }
        ]
    }
];
