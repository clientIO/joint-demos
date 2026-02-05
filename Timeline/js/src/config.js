import { StencilPlaceholder } from './shapes';

export const TOP_COLOR = '#DCE9FE';
export const TOP_TEXT_COLOR = '#3B5FAA';
export const TOP_LINK_COLOR = '#A7BDDD';
export const BOTTOM_COLOR = '#C4EDDE';
export const BOTTOM_TEXT_COLOR = '#0D7E54';
export const BOTTOM_LINK_COLOR = '#ACD7C8';

export const BUS_COLOR = '#7B9FD3';

// Layout config

export const BUS_MARGIN = 150;
export const BUS_TREE_MARGIN = 80;
export const MIN_BUS_ELEMENT_SPAN = 80;
export const BUS_Y = 0;

export const previewAttrs = {
    child: { rx: 10, ry: 10 }
};

// Stencil

export const stencilShapes = [
    StencilPlaceholder.create('Category'),
    StencilPlaceholder.create('Event')
];
