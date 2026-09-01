import { createShape } from '../shapes/create-shape';
import { getHaloDefaultHandle } from '@joint/react-plus';
import { Trash2, Unlink } from 'lucide-react';
import { eventIconClasses, EventShapeTypes } from '../shapes/event/event-config';
import { gatewayIconClasses, GatewayShapeTypes } from '../shapes/gateway/gateway-config';
import { activityIconClasses, ActivityShapeTypes } from '../shapes/activity/activity-config';
import { annotationIconClasses, AnnotationShapeTypes } from '../shapes/annotation/annotation-config';
import { flowIconClasses } from '../shapes/flow/flow-config';
import { linkTypeStyles, PlaceholderShapeTypes } from '../shapes/link-config';
import { Sequence } from '../shapes/flow/flow-shapes';

import type { ui, shapes } from '@joint/plus';
import type { HaloHandle } from '@joint/react-plus';
import type { BpmnElement } from '../shapes/shapes-typing';

export const GroupNames = {
    ActionTools: 'action-tools',
    BPMNTools: 'bpmn-tools',
    HorizontalSwimlaneTools: 'horizontal-swimlane-tools',
    VerticalSwimlaneTools: 'vertical-swimlane-tools'
} as const;

type GroupType = typeof GroupNames[keyof typeof GroupNames];

const ICON_SIZE = 20;
const OFFSET = 10;
const GAP = 4;

export const groups: Record<GroupType, ui.Halo.HandleGroup> = {
    [GroupNames.ActionTools]: {
        left: `calc(-${ICON_SIZE}px - ${OFFSET}px)`,
        trackDirection: 'row',
        trackCount: 2,
        className: GroupNames.ActionTools,
        gap: `${GAP}px`,
    },
    [GroupNames.BPMNTools]: {
        left: `calc(100% + ${OFFSET}px)`,
        trackDirection: 'row',
        trackCount: 4,
        className: GroupNames.BPMNTools,
        gap: `${GAP}px`,
    },
    [GroupNames.HorizontalSwimlaneTools]: {
        left: `calc(100% + ${OFFSET}px)`,
        trackDirection: 'column',
        trackCount: 1,
        className: GroupNames.HorizontalSwimlaneTools,
        gap: `${GAP}px`,
    },
    [GroupNames.VerticalSwimlaneTools]: {
        top: `calc(100% + ${OFFSET}px)`,
        trackDirection: 'row',
        trackCount: 1,
        className: GroupNames.VerticalSwimlaneTools,
        gap: `${GAP}px`,
    }
};

type HandleType =
    'ConnectEndEvent' |
    'ConnectIntermediateThrowingEvent' |
    'ConnectGateway' |
    'ConnectTask' |
    'ConnectAnnotation' |
    'Link' |
    'RemoveHorizontalSwimlane' |
    'RemoveVerticalSwimlane';

// The link created when dragging from a `link`/`fork` handle — a dashed
// placeholder that is replaced with the resolved flow type on connect.
function makePlaceholderLink() {
    const { attrs, router } = linkTypeStyles[PlaceholderShapeTypes.LINK];

    const link = new Sequence();

    link.attr(attrs);
    link.router(router);
    link.set('replace', true);

    return link;
}

// A `fork` handle that creates and connects a new element of the given type.
function makeConnectHandle(name: string, iconClass: string, elementType: string): HaloHandle {
    return {
        ...getHaloDefaultHandle('fork'),
        name,
        group: GroupNames.BPMNTools,
        content: <span className={iconClass} />,
        // `fork` is read by the element drag handlers (`isForkEvent`); the
        // type lets the keyboard offer the same set without a halo — see
        // `getConnectableTypes()`.
        data: {
            fork: true,
            elementType
        },
        hideOnDrag: true,
        makeElement: ({ graph }) => createShape<BpmnElement>(graph, elementType),
        makeLink: makePlaceholderLink
    };
}

const removeSwimlaneEvents: HaloHandle['events'] = {
    pointerup: ({ model }) => {
        const swimlane = model as shapes.bpmn2.Swimlane;
        const pool = swimlane.getParentCell() as shapes.bpmn2.CompositePool;
        pool.removeSwimlane(swimlane);
    }
};

export const handles: Record<HandleType, HaloHandle> = {
    ConnectEndEvent: makeConnectHandle('connect-end-event', eventIconClasses.END, EventShapeTypes.END),
    ConnectIntermediateThrowingEvent: makeConnectHandle(
        'connect-intermediate-throwing-event',
        eventIconClasses.INTERMEDIATE_THROWING,
        EventShapeTypes.INTERMEDIATE_THROWING
    ),
    ConnectGateway: makeConnectHandle('connect-gateway', gatewayIconClasses.EMPTY, GatewayShapeTypes.EXCLUSIVE),
    ConnectTask: makeConnectHandle('connect-task', activityIconClasses.TASK, ActivityShapeTypes.TASK),
    ConnectAnnotation: makeConnectHandle(
        'connect-annotation',
        annotationIconClasses.ANNOTATION,
        AnnotationShapeTypes.ANNOTATION
    ),
    Link: {
        ...getHaloDefaultHandle('link'),
        name: 'link-sequence',
        group: GroupNames.BPMNTools,
        content: <span className={flowIconClasses.SEQUENCE} />,
        hideOnDrag: true,
        makeLink: makePlaceholderLink
    },
    RemoveHorizontalSwimlane: {
        name: 'remove-swimlane',
        group: GroupNames.HorizontalSwimlaneTools,
        content: <Trash2 size={16} />,
        events: removeSwimlaneEvents
    },
    RemoveVerticalSwimlane: {
        name: 'remove-swimlane',
        group: GroupNames.VerticalSwimlaneTools,
        content: <Trash2 size={16} />,
        events: removeSwimlaneEvents
    }
} as const;

// Default handles shown on every element that does not opt out via
// `omitDefaultHaloHandles` (built-in icons, repositioned).
export const defaultHandles: HaloHandle[] = [
    {
        ...getHaloDefaultHandle('remove'),
        group: GroupNames.ActionTools,
        content: <Trash2 size={18} />
    },
    {
        ...getHaloDefaultHandle('unlink'),
        group: GroupNames.ActionTools,
        content: <Unlink size={18} />
    }
];
