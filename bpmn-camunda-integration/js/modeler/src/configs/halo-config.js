import { ui } from '@joint/plus';
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
};

const ICON_SIZE = 20;
const OFFSET = 10;
const GAP = 4;

export const groups = {
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

const removeSwimlaneEvents = {
    'pointerup': function (_evt, _x, _y) {
        const element = this.options.cellView.model;
        const pool = element.getParentCell();
        pool.removeSwimlane(element);
    }
};

export const handles = {
    ConnectEndEvent: Object.assign(Object.assign({}, ui.Halo.getDefaultHandle('fork')), { name: 'connect-end-event', position: GroupNames.BPMNTools, content: `<span class="${eventIconClasses.END}"></span>`, data: {
            elementType: EventShapeTypes.END,
            fork: true
        }, hideOnDrag: true }),
    ConnectIntermediateThrowingEvent: Object.assign(Object.assign({}, ui.Halo.getDefaultHandle('fork')), { name: 'connect-intermediate-throwing-event', position: GroupNames.BPMNTools, content: `<span class="${eventIconClasses.INTERMEDIATE_THROWING}"></span>`, data: {
            elementType: EventShapeTypes.INTERMEDIATE_THROWING,
            fork: true
        }, hideOnDrag: true }),
    ConnectGateway: Object.assign(Object.assign({}, ui.Halo.getDefaultHandle('fork')), { name: 'connect-gateway', position: GroupNames.BPMNTools, content: `<span class="${gatewayIconClasses.EMPTY}"></span>`, data: {
            elementType: GatewayShapeTypes.EXCLUSIVE,
            fork: true
        }, hideOnDrag: true }),
    ConnectServiceTask: Object.assign(Object.assign({}, ui.Halo.getDefaultHandle('fork')), { name: 'connect-service-task', position: GroupNames.BPMNTools, content: `<span class="${activityIconClasses.SERVICE}"></span>`, data: {
            elementType: ActivityShapeTypes.SERVICE,
            fork: true
        }, hideOnDrag: true }),
    ConnectHttpRequest: Object.assign(Object.assign({}, ui.Halo.getDefaultHandle('fork')), { name: 'connect-http-request', position: GroupNames.BPMNTools, content: `<span class="${activityIconClasses.HTTP_CONNECTOR}"></span>`, data: {
            elementType: ActivityShapeTypes.HTTP_CONNECTOR,
            fork: true
        }, hideOnDrag: true }),
    ConnectAnnotation: Object.assign(Object.assign({}, ui.Halo.getDefaultHandle('fork')), { name: 'connect-annotation', position: GroupNames.BPMNTools, content: `<span class="${annotationIconClasses.ANNOTATION}"></span>`, data: {
            elementType: AnnotationShapeTypes.ANNOTATION,
            fork: true
        }, hideOnDrag: true }),
    Link: Object.assign(Object.assign({}, ui.Halo.getDefaultHandle('link')), { name: 'link-sequence', position: GroupNames.BPMNTools, content: `<span class="${flowIconClasses.SEQUENCE}"></span>`, hideOnDrag: true }),
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
};
