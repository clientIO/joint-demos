import type { dia } from '@joint/plus';
import type { LinkType } from '../shapes-typing';
import { FlowShapeTypes } from '../flow/flow-config';
import { AnnotationShapeTypes } from '../annotation/annotation-config';
import { DataShapeTypes } from '../data/data-config';
import { MAIN_COLOR } from '../../configs/theme';

export enum PlaceholderShapeTypes {
    LINK = 'placeholder.Link'
}

const PLACEHOLDER_STROKE = MAIN_COLOR;

export interface BPMNLinkAttributes {
    router: string;
    attrs: dia.Cell.Selectors;
}

export const PlaceholderAttributes: Record<LinkType, BPMNLinkAttributes> = {
    [PlaceholderShapeTypes.LINK]: {
        router: 'normal',
        attrs: {
            line: {
                flowType: null,
                stroke: PLACEHOLDER_STROKE,
                strokeDasharray: '4',
                strokeWidth: 2
            }
        }
    },
    [AnnotationShapeTypes.LINK]: {
        router: 'normal',
        attrs: {
            line: {
                strokeDasharray: '2,5'
            }
        }
    },
    [DataShapeTypes.DATA_ASSOCIATION]: {
        router: 'normal',
        attrs: {
            line: {
                strokeDasharray: '2,5',
                targetMarker: {
                    type: 'path',
                    d: 'M 10 -7 0 0 10 7',
                    strokeWidth: 2,
                    fill: 'none'
                }
            }
        }
    },
    [FlowShapeTypes.SEQUENCE]: {
        router: 'rightAngle',
        attrs: {
            line: {
                targetMarker: {
                    type: 'path',
                    d: 'M 12 -5 0 0 12 5 z'
                }
            }
        }
    },
    [FlowShapeTypes.MESSAGE]: {
        router: 'rightAngle',
        attrs: {
            line: {
                strokeDasharray: '5,2',
                sourceMarker: {
                    type: 'circle',
                    cx: 5,
                    r: 5,
                    strokeWidth: 2,
                    fill: '#FFFFFF'
                },
                targetMarker: {
                    type: 'path',
                    d: 'M 12 -5 0 0 12 5 z',
                    strokeWidth: 2,
                    fill: '#FFFFFF'
                }
            }
        }
    },
    [FlowShapeTypes.DEFAULT]: {
        router: 'rightAngle',
        attrs: {
            line: {
                sourceMarker: {
                    d: 'M 5 -5 15 5',
                    strokeWidth: 2
                },
                targetMarker: {
                    type: 'path',
                    d: 'M 12 -5 0 0 12 5 z'
                }
            }
        }
    },
    [FlowShapeTypes.CONDITIONAL]: {
        router: 'rightAngle',
        attrs: {
            line: {
                sourceMarker: {
                    d: 'M 0 0 9 -5 18 0 9 5 Z',
                    strokeWidth: 2,
                    fill: '#FFFFFF'
                },
                targetMarker: {
                    type: 'path',
                    d: 'M 12 -5 0 0 12 5 z'
                }
            }
        }
    }
};
