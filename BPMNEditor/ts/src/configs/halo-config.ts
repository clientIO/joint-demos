import { type dia, type shapes, ui } from '@joint/plus';
import { eventIconClasses, EventShapeTypes } from '../shapes/event/event-config';
import { gatewayIconClasses, GatewayShapeTypes } from '../shapes/gateway/gateway-config';
import { activityIconClasses, ActivityShapeTypes } from '../shapes/activity/activity-config';
import { annotationIconClasses, AnnotationShapeTypes } from '../shapes/annotation/annotation-config';
import { flowIconClasses } from '../shapes/flow/flow-config';

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

const removeSwimlaneEvents = {
    'pointerup': function(this: ui.Halo, _evt: dia.Event, _x: number, _y: number) {
        const element = this.options.cellView.model as shapes.bpmn2.Swimlane;
        const pool = element.getParentCell() as shapes.bpmn2.CompositePool;
        pool.removeSwimlane(element);
    }
};

export const handles: Record<HandleType, ui.Halo.Handle> = {
    ConnectEndEvent: {
        ...ui.Halo.getDefaultHandle('fork'),
        name: 'connect-end-event',
        position: GroupNames.BPMNTools,
        content: `<span class="${eventIconClasses.END}"></span>`,
        data: {
            elementType: EventShapeTypes.END,
            fork: true
        },
        hideOnDrag: true,
    },
    ConnectIntermediateThrowingEvent: {
        ...ui.Halo.getDefaultHandle('fork'),
        name: 'connect-intermediate-throwing-event',
        position: GroupNames.BPMNTools,
        content: `<span class="${eventIconClasses.INTERMEDIATE_THROWING}"></span>`,
        data: {
            elementType: EventShapeTypes.INTERMEDIATE_THROWING,
            fork: true
        },
        hideOnDrag: true,
    },
    ConnectGateway: {
        ...ui.Halo.getDefaultHandle('fork'),
        name: 'connect-gateway',
        position: GroupNames.BPMNTools,
        content: `<span class="${gatewayIconClasses.EMPTY}"></span>`,
        data: {
            elementType: GatewayShapeTypes.EXCLUSIVE,
            fork: true
        },
        hideOnDrag: true,
    },
    ConnectTask: {
        ...ui.Halo.getDefaultHandle('fork'),
        name: 'connect-task',
        position: GroupNames.BPMNTools,
        content: `<span class="${activityIconClasses.TASK}"></span>`,
        data: {
            elementType: ActivityShapeTypes.TASK,
            fork: true
        },
        hideOnDrag: true,
    },
    ConnectAnnotation: {
        ...ui.Halo.getDefaultHandle('fork'),
        name: 'connect-annotation',
        position: GroupNames.BPMNTools,
        content: `<span class="${annotationIconClasses.ANNOTATION}"></span>`,
        data: {
            elementType: AnnotationShapeTypes.ANNOTATION,
            fork: true
        },
        hideOnDrag: true,
    },
    Link: {
        ...ui.Halo.getDefaultHandle('link'),
        name: 'link-sequence',
        position: GroupNames.BPMNTools,
        content: `<span class="${flowIconClasses.SEQUENCE}"></span>`,
        hideOnDrag: true
    },
    RemoveHorizontalSwimlane: {
        name: 'remove-swimlane',
        position: GroupNames.HorizontalSwimlaneTools,
        icon: 'assets/halo/icon-trash.svg',
        events: removeSwimlaneEvents
    },
    RemoveVerticalSwimlane: {
        name: 'remove-swimlane',
        position: GroupNames.VerticalSwimlaneTools,
        icon: 'assets/halo/icon-trash.svg',
        events: removeSwimlaneEvents
    }
} as const;
