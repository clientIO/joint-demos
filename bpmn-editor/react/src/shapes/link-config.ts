import { FlowShapeTypes } from './flow/flow-config';
import { AnnotationShapeTypes } from './annotation/annotation-config';
import { DataShapeTypes } from './data/data-config';
import { AnnotationLink } from './annotation/annotation-shapes';
import { DataAssociation } from './data/data-shapes';
import { Conditional, Default, Message, Sequence } from './flow/flow-shapes';

import type { dia, shapes } from '@joint/plus';
import type { AppLink, LinkType } from './shapes-typing';

export enum PlaceholderShapeTypes {
    LINK = 'placeholder.Link'
}

const PLACEHOLDER_STROKE = 'var(--bpmn-selector)';

export interface LinkStyle {
    router: string;
    attrs: dia.Cell.Selectors;
}

// The visual style (line attributes + router) of each link type. Used to
// preview the resolved type while dragging a link and by the halo's
// placeholder link.
export const linkTypeStyles: Record<LinkType, LinkStyle> = {
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
                    fill: 'var(--bpmn-palette-surface)'
                },
                targetMarker: {
                    type: 'path',
                    d: 'M 12 -5 0 0 12 5 z',
                    strokeWidth: 2,
                    fill: 'var(--bpmn-palette-surface)'
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
                    fill: 'var(--bpmn-palette-surface)'
                },
                targetMarker: {
                    type: 'path',
                    d: 'M 12 -5 0 0 12 5 z'
                }
            }
        }
    }
};

type AppLinkConstructor = new (...args: ConstructorParameters<typeof shapes.bpmn2.Flow>) => AppLink;

/** The link shape constructor of each link type. */
export const linkTypeConstructors: Record<LinkType, AppLinkConstructor> = {
    [PlaceholderShapeTypes.LINK]: Sequence,
    [AnnotationShapeTypes.LINK]: AnnotationLink,
    [DataShapeTypes.DATA_ASSOCIATION]: DataAssociation,
    [FlowShapeTypes.SEQUENCE]: Sequence,
    [FlowShapeTypes.MESSAGE]: Message,
    [FlowShapeTypes.DEFAULT]: Default,
    [FlowShapeTypes.CONDITIONAL]: Conditional
};
