import { type dia, g, shapes } from '@joint/plus';
import type { ExportOptions } from '@joint/format-bpmn-export';
import { exportableObjects } from '@joint/format-bpmn-export';
import type { ImportOptions } from '@joint/format-bpmn-import';
import { ActivityShapeTypes } from './activity/activity-config';
import { AnnotationShapeTypes } from './annotation/annotation-config';
import { DataShapeTypes } from './data/data-config';
import { EventShapeTypes } from './event/event-config';
import { FlowShapeTypes } from './flow/flow-config';
import { GatewayShapeTypes } from './gateway/gateway-config';
import { GroupShapeTypes } from './group/group-config';
import { Task, Send, Receive, Service, User, Script, Manual, BusinessRule, CallActivity, SubProcess, EventSubProcess } from './activity/activity-shapes';
import {
    Start,
    MessageStart,
    TimerStart,
    ConditionalStart,
    SignalStart,
    IntermediateThrowing,
    MessageIntermediateThrowing,
    LinkIntermediateThrowing,
    SignalIntermediateThrowing,
    EscalationIntermediateThrowing,
    CompensationIntermediateThrowing,
    MessageIntermediateCatching,
    TimerIntermediateCatching,
    ConditionalIntermediateCatching,
    LinkIntermediateCatching,
    SignalIntermediateCatching,
    IntermediateBoundary,
    MessageIntermediateBoundary,
    TimerIntermediateBoundary,
    ConditionalIntermediateBoundary,
    SignalIntermediateBoundary,
    ErrorIntermediateBoundary,
    EscalationIntermediateBoundary,
    CompensationIntermediateBoundary,
    CancelIntermediateBoundary,
    MessageIntermediateBoundaryNonInterrupting,
    TimerIntermediateBoundaryNonInterrupting,
    ConditionalIntermediateBoundaryNonInterrupting,
    SignalIntermediateBoundaryNonInterrupting,
    EscalationIntermediateBoundaryNonInterrupting,
    End,
    MessageEnd,
    SignalEnd,
    ErrorEnd,
    EscalationEnd,
    TerminationEnd,
    CompensationEnd
} from './event/event-shapes';
import { Exclusive, Inclusive, EventBased, Parallel, Complex } from './gateway/gateway-shapes';
import { Sequence, Conditional, Message } from './flow/flow-shapes';
import { DataObject, DataAssociation, DataStore } from './data/data-shapes';
import { Annotation, AnnotationLink } from './annotation/annotation-shapes';
import { MarkerNames } from './shapes-typing';
import { PoolShapeTypes } from './pool/pool-config';
import { HorizontalPool, HorizontalSwimlane, VerticalPool, VerticalSwimlane } from './pool/pool-shapes';

class ExportableActivity extends exportableObjects.Activity {

    isSubProcess() {
        return false;
    }
}

class ExportableSubProcess extends ExportableActivity {

    eventTriggered: boolean;

    constructor(cellView: any, type?: string, markers?: string[], label?: string, eventTriggered: boolean = false) {
        super(cellView, type, markers, label);
        this.eventTriggered = eventTriggered;
    }

    isSubProcess() {
        return true;
    }

    toTaskXMLElement() {
        const taskXMLElement = super.toTaskXMLElement();

        if (this.eventTriggered) {
            taskXMLElement.setAttribute('triggeredByEvent', 'true');
        }

        return taskXMLElement;
    }

    toShapeXMLElement(): Element {
        const shapeXMLElement = super.toShapeXMLElement();
        shapeXMLElement.setAttribute('isExpanded', 'false');
        return shapeXMLElement;
    }
}

class ExportableFlow extends exportableObjects.Flow {

    constructor(cellView: any, label: string, type: string) {
        super(cellView, label, type);
    }

    toFlowXMLElement() {

        const flowXMLElement = super.toFlowXMLElement();

        // Determine the BPMN model namespace (same as parent element)
        const modelNamespace = flowXMLElement.namespaceURI || 'http://www.omg.org/spec/BPMN/20100524/MODEL';

        // Create the conditionExpression element in the BPMN namespace
        const conditionalElement = document.createElementNS(modelNamespace, 'bpmn:conditionExpression');

        // Add xsi:type attribute using the proper XML Schema Instance namespace
        conditionalElement.setAttributeNS(
            'http://www.w3.org/2001/XMLSchema-instance',
            'xsi:type',
            'bpmn:tFormalExpression'
        );

        flowXMLElement.appendChild(conditionalElement);

        return flowXMLElement;
    }
}

export const bpmnExportOptions: ExportOptions = {
    exportableObjectFactories: {
        // Activity
        [ActivityShapeTypes.TASK]: (cellView) => {
            return new ExportableActivity(cellView);
        },
        [ActivityShapeTypes.SEND]: (cellView) => {
            return new ExportableActivity(cellView);
        },
        [ActivityShapeTypes.BUSINESS_RULE]: (cellView) => {
            return new ExportableActivity(cellView);
        },
        [ActivityShapeTypes.RECEIVE]: (cellView) => {
            return new ExportableActivity(cellView);
        },
        [ActivityShapeTypes.SERVICE]: (cellView) => {
            return new ExportableActivity(cellView);
        },
        [ActivityShapeTypes.USER]: (cellView) => {
            return new ExportableActivity(cellView);
        },
        [ActivityShapeTypes.SCRIPT]: (cellView) => {
            return new ExportableActivity(cellView);
        },
        [ActivityShapeTypes.MANUAL]: (cellView) => {
            return new ExportableActivity(cellView);
        },
        [ActivityShapeTypes.CALL_ACTIVITY]: (cellView) => {
            return new ExportableActivity(cellView);
        },
        [ActivityShapeTypes.SUB_PROCESS]: (cellView) => {
            const markers = cellView.model.attr(['markers', 'iconTypes']);
            return new ExportableSubProcess(cellView, 'subProcess', markers, cellView.model.attr('label/text'));
        },
        [ActivityShapeTypes.EVENT_SUB_PROCESS]: (cellView) => {
            const markers = cellView.model.attr(['markers', 'iconTypes']);
            return new ExportableSubProcess(cellView, 'subProcess', markers, cellView.model.attr('label/text'), true);
        },
        // Annotation
        [AnnotationShapeTypes.ANNOTATION]: (cellView) => {
            return new exportableObjects.Annotation(cellView);
        },
        [AnnotationShapeTypes.LINK]: (cellView) => {
            return new exportableObjects.AnnotationLink(cellView as dia.LinkView);
        },
        // Data
        [DataShapeTypes.DATA_OBJECT]: (cellView) => {
            return new exportableObjects.DataObject(cellView);
        },
        [DataShapeTypes.DATA_INPUT]: (cellView) => {
            return new exportableObjects.DataObject(cellView);
        },
        [DataShapeTypes.DATA_OUTPUT]: (cellView) => {
            return new exportableObjects.DataObject(cellView);
        },
        [DataShapeTypes.DATA_STORE]: (cellView) => {
            return new exportableObjects.DataStore(cellView);
        },
        [DataShapeTypes.DATA_ASSOCIATION]: (cellView) => {
            return new exportableObjects.DataAssociation(cellView as dia.LinkView);
        },
        // Events - start
        [EventShapeTypes.START]: (cellView) => {
            return new exportableObjects.Event(cellView, 'start', undefined, true);
        },
        [EventShapeTypes.MESSAGE_START]: (cellView) => {
            return new exportableObjects.Event(cellView, 'start', 'message', true);
        },
        [EventShapeTypes.TIMER_START]: (cellView) => {
            return new exportableObjects.Event(cellView, 'start', 'timer', true);
        },
        [EventShapeTypes.CONDITIONAL_START]: (cellView) => {
            return new exportableObjects.Event(cellView, 'start', 'conditional', true);
        },
        [EventShapeTypes.SIGNAL_START]: (cellView) => {
            return new exportableObjects.Event(cellView, 'start', 'signal', true);
        },
        // Events - intermediate catching
        [EventShapeTypes.MESSAGE_INTERMEDIATE_CATCHING]: (cellView) => {
            return new exportableObjects.Event(cellView, 'intermediateCatch', 'message', true);
        },
        [EventShapeTypes.TIMER_INTERMEDIATE_CATCHING]: (cellView) => {
            return new exportableObjects.Event(cellView, 'intermediateCatch', 'timer', true);
        },
        [EventShapeTypes.CONDITIONAL_INTERMEDIATE_CATCHING]: (cellView) => {
            return new exportableObjects.Event(cellView, 'intermediateCatch', 'conditional', true);
        },
        [EventShapeTypes.LINK_INTERMEDIATE_CATCHING]: (cellView) => {
            return new exportableObjects.Event(cellView, 'intermediateCatch', 'link', true);
        },
        [EventShapeTypes.SIGNAL_INTERMEDIATE_CATCHING]: (cellView) => {
            return new exportableObjects.Event(cellView, 'intermediateCatch', 'signal', true);
        },
        // Events - intermediate boundary
        [EventShapeTypes.INTERMEDIATE_BOUNDARY]: (cellView) => {
            return new exportableObjects.Event(cellView, 'boundary', undefined, true);
        },
        [EventShapeTypes.MESSAGE_INTERMEDIATE_BOUNDARY]: (cellView) => {
            return new exportableObjects.Event(cellView, 'boundary', 'message', true);
        },
        [EventShapeTypes.TIMER_INTERMEDIATE_BOUNDARY]: (cellView) => {
            return new exportableObjects.Event(cellView, 'boundary', 'timer', true);
        },
        [EventShapeTypes.CONDITIONAL_INTERMEDIATE_BOUNDARY]: (cellView) => {
            return new exportableObjects.Event(cellView, 'boundary', 'conditional', true);
        },
        [EventShapeTypes.SIGNAL_INTERMEDIATE_BOUNDARY]: (cellView) => {
            return new exportableObjects.Event(cellView, 'boundary', 'signal', true);
        },
        [EventShapeTypes.ERROR_INTERMEDIATE_BOUNDARY]: (cellView) => {
            return new exportableObjects.Event(cellView, 'boundary', 'error', true);
        },
        [EventShapeTypes.ESCALATION_INTERMEDIATE_BOUNDARY]: (cellView) => {
            return new exportableObjects.Event(cellView, 'boundary', 'escalation', true);
        },
        [EventShapeTypes.COMPENSATION_INTERMEDIATE_BOUNDARY]: (cellView) => {
            return new exportableObjects.Event(cellView, 'boundary', 'compensate', true);
        },
        [EventShapeTypes.CANCEL_INTERMEDIATE_BOUNDARY]: (cellView) => {
            return new exportableObjects.Event(cellView, 'boundary', 'cancel', true);
        },
        // Events - intermediate boundary non-interrupting
        [EventShapeTypes.MESSAGE_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING]: (cellView) => {
            return new exportableObjects.Event(cellView, 'boundary', 'message', false);
        },
        [EventShapeTypes.TIMER_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING]: (cellView) => {
            return new exportableObjects.Event(cellView, 'boundary', 'timer', false);
        },
        [EventShapeTypes.CONDITIONAL_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING]: (cellView) => {
            return new exportableObjects.Event(cellView, 'boundary', 'conditional', false);
        },
        [EventShapeTypes.SIGNAL_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING]: (cellView) => {
            return new exportableObjects.Event(cellView, 'boundary', 'signal', false);
        },
        [EventShapeTypes.ESCALATION_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING]: (cellView) => {
            return new exportableObjects.Event(cellView, 'boundary', 'escalation', false);
        },
        // Events - intermediate throwing
        [EventShapeTypes.INTERMEDIATE_THROWING]: (cellView) => {
            return new exportableObjects.Event(cellView, 'intermediateThrow', undefined, true);
        },
        [EventShapeTypes.MESSAGE_INTERMEDIATE_THROWING]: (cellView) => {
            return new exportableObjects.Event(cellView, 'intermediateThrow', 'message', true);
        },
        [EventShapeTypes.LINK_INTERMEDIATE_THROWING]: (cellView) => {
            return new exportableObjects.Event(cellView, 'intermediateThrow', 'link', true);
        },
        [EventShapeTypes.SIGNAL_INTERMEDIATE_THROWING]: (cellView) => {
            return new exportableObjects.Event(cellView, 'intermediateThrow', 'signal', true);
        },
        [EventShapeTypes.ESCALATION_INTERMEDIATE_THROWING]: (cellView) => {
            return new exportableObjects.Event(cellView, 'intermediateThrow', 'escalation', true);
        },
        [EventShapeTypes.COMPENSATION_INTERMEDIATE_THROWING]: (cellView) => {
            return new exportableObjects.Event(cellView, 'intermediateThrow', 'compensate', true);
        },
        // Events - end
        [EventShapeTypes.END]: (cellView) => {
            return new exportableObjects.Event(cellView, 'end', undefined, true);
        },
        [EventShapeTypes.MESSAGE_END]: (cellView) => {
            return new exportableObjects.Event(cellView, 'end', 'message', true);
        },
        [EventShapeTypes.SIGNAL_END]: (cellView) => {
            return new exportableObjects.Event(cellView, 'end', 'signal', true);
        },
        [EventShapeTypes.ERROR_END]: (cellView) => {
            return new exportableObjects.Event(cellView, 'end', 'error', true);
        },
        [EventShapeTypes.ESCALATION_END]: (cellView) => {
            return new exportableObjects.Event(cellView, 'end', 'escalation', true);
        },
        [EventShapeTypes.TERMINATION_END]: (cellView) => {
            return new exportableObjects.Event(cellView, 'end', 'terminate', true);
        },
        [EventShapeTypes.COMPENSATION_END]: (cellView) => {
            return new exportableObjects.Event(cellView, 'end', 'compensate', true);
        },
        [EventShapeTypes.CANCEL_END]: (cellView) => {
            return new exportableObjects.Event(cellView, 'end', 'cancel', true);
        },
        // Flow
        [FlowShapeTypes.SEQUENCE]: (cellView) => {
            return new exportableObjects.Flow(cellView as dia.LinkView, cellView.model.prop('labels/0/attrs/label/text'));
        },
        [FlowShapeTypes.DEFAULT]: (cellView) => {
            // Export Default Flow as sequence
            return new exportableObjects.Flow(cellView as dia.LinkView, cellView.model.prop('labels/0/attrs/label/text'));
        },
        [FlowShapeTypes.CONDITIONAL]: (cellView) => {
            return new ExportableFlow(cellView, cellView.model.prop('labels/0/attrs/label/text'), 'conditional');
        },
        [FlowShapeTypes.MESSAGE]: (cellView) => {
            return new exportableObjects.Flow(cellView as dia.LinkView, cellView.model.prop('labels/0/attrs/label/text'), 'message');
        },
        // Gateway
        [GatewayShapeTypes.EXCLUSIVE]: (cellView) => {
            return new exportableObjects.Gateway(cellView, 'exclusive');
        },
        [GatewayShapeTypes.INCLUSIVE]: (cellView) => {
            return new exportableObjects.Gateway(cellView, 'inclusive');
        },
        [GatewayShapeTypes.EVENT_BASED]: (cellView) => {
            return new exportableObjects.Gateway(cellView, 'eventBased');
        },
        [GatewayShapeTypes.PARALLEL]: (cellView) => {
            return new exportableObjects.Gateway(cellView, 'parallel');
        },
        // Group
        [GroupShapeTypes.GROUP]: (cellView) => {
            return new exportableObjects.Group(cellView);
        },
        // Pool
        [PoolShapeTypes.HORIZONTAL_POOL]: (cellView) => {
            return new exportableObjects.HorizontalPool(cellView);
        },
        [PoolShapeTypes.VERTICAL_POOL]: (cellView) => {
            return new exportableObjects.VerticalPool(cellView);
        }
    }
};

function getEventType(xmlNode: Element) {
    const eventDefinition = Array.from(xmlNode.childNodes).find((node) => node.nodeName.includes('EventDefinition'));
    return eventDefinition?.nodeName.replace('EventDefinition', '').split(':').pop();
}

function getActivityMarkers(xmlNode: Element): MarkerNames[] {

    const markers = [];

    const multiInstanceLoopCharacteristics = xmlNode.querySelector('multiInstanceLoopCharacteristics');

    if (multiInstanceLoopCharacteristics) {
        const isSequential = multiInstanceLoopCharacteristics.getAttribute('isSequential') === 'true';
        markers.push(isSequential ? MarkerNames.SEQUENTIAL : MarkerNames.PARALLEL);
    }

    const loopCharacteristics = xmlNode.querySelector('standardLoopCharacteristics');

    if (loopCharacteristics) {
        markers.push(MarkerNames.LOOP);
    }

    if (xmlNode.getAttribute('isForCompensation') === 'true') {
        markers.push(MarkerNames.COMPENSATION);
    }

    return markers;
}

function simplifyLinkWaypoints(xmlDoc: Document, linkId: dia.Cell.ID): g.Point[] {
    const waypoints = Array.from(xmlDoc
        .querySelectorAll(`BPMNEdge[id$="${linkId}"] waypoint`))
        .map((waypoint: Element) => ({ x: Number(waypoint.getAttribute('x')), y: Number(waypoint.getAttribute('y')) }));

    const vertices = new g.Polyline(waypoints).simplify().points;

    // Remove first and last waypoints - they are anchors
    vertices.shift();
    vertices.pop();

    return vertices;
}

export const bpmnImportOptions: ImportOptions = {
    bpmn2Shapes: {
        ...shapes.bpmn2,
        HeaderedHorizontalPool: HorizontalPool,
        HeaderedVerticalPool: VerticalPool,
        HorizontalSwimlane: HorizontalSwimlane,
        VerticalSwimlane: VerticalSwimlane,
        DataAssociation: DataAssociation,
        Activity: Task,
        Event: IntermediateThrowing,
        Gateway: Exclusive,
        Flow: Sequence,
        DataObject: DataObject,
        DataStore: DataStore,
        Annotation: Annotation,
        AnnotationLink: AnnotationLink
    },
    useLegacyPool: false,
    cellFactories: {
        task: (xmlNode, _xmlDoc, _shapeClass, defaultFactory) => {
            const defaultElement = defaultFactory() as dia.Element;
            const appElement = new Task({ id: defaultElement.id });
            appElement.setMarkers(getActivityMarkers(xmlNode));
            appElement.copyFrom(defaultElement);
            return appElement;
        },
        serviceTask: (xmlNode, _xmlDoc, _shapeClass, defaultFactory) => {
            const defaultElement = defaultFactory() as dia.Element;
            const appElement = new Service({ id: defaultElement.id });
            appElement.setMarkers(getActivityMarkers(xmlNode));
            appElement.copyFrom(defaultElement);
            return appElement;
        },
        sendTask: (xmlNode, _xmlDoc, _shapeClass, defaultFactory) => {
            const defaultElement = defaultFactory() as dia.Element;
            const appElement = new Send({ id: defaultElement.id });
            appElement.setMarkers(getActivityMarkers(xmlNode));
            appElement.copyFrom(defaultElement);
            return appElement;
        },
        receiveTask: (xmlNode, _xmlDoc, _shapeClass, defaultFactory) => {
            const defaultElement = defaultFactory() as dia.Element;
            const appElement = new Receive({ id: defaultElement.id });
            appElement.setMarkers(getActivityMarkers(xmlNode));
            appElement.copyFrom(defaultElement);
            return appElement;
        },
        userTask: (xmlNode, _xmlDoc, _shapeClass, defaultFactory) => {
            const defaultElement = defaultFactory() as dia.Element;
            const appElement = new User({ id: defaultElement.id });
            appElement.setMarkers(getActivityMarkers(xmlNode));
            appElement.copyFrom(defaultElement);
            return appElement;
        },
        manualTask: (xmlNode, _xmlDoc, _shapeClass, defaultFactory) => {
            const defaultElement = defaultFactory() as dia.Element;
            const appElement = new Manual({ id: defaultElement.id });
            appElement.setMarkers(getActivityMarkers(xmlNode));
            appElement.copyFrom(defaultElement);
            return appElement;
        },
        businessRuleTask: (xmlNode, _xmlDoc, _shapeClass, defaultFactory) => {
            const defaultElement = defaultFactory() as dia.Element;
            const appElement = new BusinessRule({ id: defaultElement.id });
            appElement.setMarkers(getActivityMarkers(xmlNode));
            appElement.copyFrom(defaultElement);
            return appElement;
        },
        scriptTask: (xmlNode, _xmlDoc, _shapeClass, defaultFactory) => {
            const defaultElement = defaultFactory() as dia.Element;
            const appElement = new Script({ id: defaultElement.id });
            appElement.setMarkers(getActivityMarkers(xmlNode));
            appElement.copyFrom(defaultElement);
            return appElement;
        },
        subProcess: (xmlNode, _xmlDoc, _shapeClass, defaultFactory) => {
            const defaultElement = defaultFactory() as dia.Element;
            const triggeredByEvent = xmlNode.getAttribute('triggeredByEvent') === 'true';
            const appElement = triggeredByEvent ? new EventSubProcess({ id: defaultElement.id }) : new SubProcess({ id: defaultElement.id });
            appElement.setMarkers(getActivityMarkers(xmlNode));
            appElement.copyFrom(defaultElement);
            return appElement;
        },
        callActivity: (xmlNode, _xmlDoc, _shapeClass, defaultFactory) => {
            const defaultElement = defaultFactory() as dia.Element;
            const appElement = new CallActivity({ id: defaultElement.id });
            appElement.setMarkers(getActivityMarkers(xmlNode));
            appElement.copyFrom(defaultElement);
            return appElement;
        },
        startEvent: (xmlNode: Element, _xmlDoc, _shapeClass, defaultFactory) => {

            const defaultElement = defaultFactory() as dia.Element;
            const eventType = getEventType(xmlNode);

            let appElement;

            switch (eventType) {
                case 'message':
                    appElement = new MessageStart({ id: defaultElement.id });
                    break;
                case 'timer':
                    appElement = new TimerStart({ id: defaultElement.id });
                    break;
                case 'conditional':
                    appElement = new ConditionalStart({ id: defaultElement.id });
                    break;
                case 'signal':
                    appElement = new SignalStart({ id: defaultElement.id });
                    break;
                default:
                    appElement = new Start({ id: defaultElement.id });
                    break;
            }

            appElement.copyFrom(defaultElement);

            return appElement;
        },
        intermediateThrowEvent: (xmlNode: Element, _xmlDoc, _shapeClass, defaultFactory) => {

            const defaultElement = defaultFactory() as dia.Element;
            const eventType = getEventType(xmlNode);

            let appElement;

            switch (eventType) {
                case 'message':
                    appElement = new MessageIntermediateThrowing({ id: defaultElement.id });
                    break;
                case 'link':
                    appElement = new LinkIntermediateThrowing({ id: defaultElement.id });
                    break;
                case 'signal':
                    appElement = new SignalIntermediateThrowing({ id: defaultElement.id });
                    break;
                case 'escalation':
                    appElement = new EscalationIntermediateThrowing({ id: defaultElement.id });
                    break;
                case 'compensate':
                    appElement = new CompensationIntermediateThrowing({ id: defaultElement.id });
                    break;
                default:
                    appElement = new IntermediateThrowing({ id: defaultElement.id });
                    break;
            }

            appElement.copyFrom(defaultElement);

            return appElement;
        },
        intermediateCatchEvent: (xmlNode: Element, _xmlDoc, _shapeClass, defaultFactory) => {

            const defaultElement = defaultFactory() as dia.Element;
            const eventType = getEventType(xmlNode);

            let appElement;

            switch (eventType) {
                case 'message':
                    appElement = new MessageIntermediateCatching({ id: defaultElement.id });
                    break;
                case 'timer':
                    appElement = new TimerIntermediateCatching({ id: defaultElement.id });
                    break;
                case 'conditional':
                    appElement = new ConditionalIntermediateCatching({ id: defaultElement.id });
                    break;
                case 'link':
                    appElement = new LinkIntermediateCatching({ id: defaultElement.id });
                    break;
                case 'signal':
                    appElement = new SignalIntermediateCatching({ id: defaultElement.id });
                    break;
                default:
                    appElement = new IntermediateThrowing({ id: defaultElement.id });
                    break;
            }

            appElement.copyFrom(defaultElement);

            return appElement;
        },
        boundaryEvent: (xmlNode: Element, _xmlDoc, _shapeClass, defaultFactory) => {

            const defaultElement = defaultFactory() as dia.Element;
            const eventType = getEventType(xmlNode);
            const isNonInterrupting = xmlNode.getAttribute('cancelActivity') === 'false';

            let appElement;

            switch(eventType) {
                case 'message':
                    appElement = isNonInterrupting ?
                        new MessageIntermediateBoundaryNonInterrupting({ id: defaultElement.id }) :
                        new MessageIntermediateBoundary({ id: defaultElement.id });
                    break;
                case 'timer':
                    appElement = isNonInterrupting ?
                        new TimerIntermediateBoundaryNonInterrupting({ id: defaultElement.id }) :
                        new TimerIntermediateBoundary({ id: defaultElement.id });
                    break;
                case 'conditional':
                    appElement = isNonInterrupting ?
                        new ConditionalIntermediateBoundaryNonInterrupting({ id: defaultElement.id }) :
                        new ConditionalIntermediateBoundary({ id: defaultElement.id });
                    break;
                case 'signal':
                    appElement = isNonInterrupting ?
                        new SignalIntermediateBoundaryNonInterrupting({ id: defaultElement.id }) :
                        new SignalIntermediateBoundary({ id: defaultElement.id });
                    break;
                case 'escalation':
                    appElement = isNonInterrupting ?
                        new EscalationIntermediateBoundaryNonInterrupting({ id: defaultElement.id }) :
                        new EscalationIntermediateBoundary({ id: defaultElement.id });
                    break;
                case 'error':
                    appElement = new ErrorIntermediateBoundary({ id: defaultElement.id });
                    break;
                case 'compensate':
                    appElement = new CompensationIntermediateBoundary({ id: defaultElement.id });
                    break;
                case 'cancel':
                    appElement = new CancelIntermediateBoundary({ id: defaultElement.id });
                    break;
                default:
                    appElement = new IntermediateBoundary({ id: defaultElement.id });
                    break;
            }

            appElement.copyFrom(defaultElement);

            return appElement;
        },
        endEvent: (xmlNode: Element, _xmlDoc, _shapeClass, defaultFactory) => {

            const defaultElement = defaultFactory() as dia.Element;
            const eventType = getEventType(xmlNode);

            let appElement;

            switch (eventType) {
                case 'message':
                    appElement = new MessageEnd({ id: defaultElement.id });
                    break;
                case 'signal':
                    appElement = new SignalEnd({ id: defaultElement.id });
                    break;
                case 'error':
                    appElement = new ErrorEnd({ id: defaultElement.id });
                    break;
                case 'escalation':
                    appElement = new EscalationEnd({ id: defaultElement.id });
                    break;
                case 'terminate':
                    appElement = new TerminationEnd({ id: defaultElement.id });
                    break;
                case 'compensate':
                    appElement = new CompensationEnd({ id: defaultElement.id });
                    break;
                default:
                    appElement = new End({ id: defaultElement.id });
                    break;
            }

            appElement.copyFrom(defaultElement);

            return appElement;
        },
        parallelGateway: (_xmlNode, _xmlDoc, _shapeClass, defaultFactory) => {
            const defaultElement = defaultFactory() as dia.Element;
            const appElement = new Parallel({ id: defaultElement.id });
            appElement.copyFrom(defaultElement);
            return appElement;
        },
        inclusiveGateway: (_xmlNode, _xmlDoc, _shapeClass, defaultFactory) => {
            const defaultElement = defaultFactory() as dia.Element;
            const appElement = new Inclusive({ id: defaultElement.id });
            appElement.copyFrom(defaultElement);
            return appElement;
        },
        complexGateway: (_xmlNode, _xmlDoc, _shapeClass, defaultFactory) => {
            const defaultElement = defaultFactory() as dia.Element;
            const appElement = new Complex({ id: defaultElement.id });
            appElement.copyFrom(defaultElement);
            return appElement;
        },
        eventBasedGateway: (_xmlNode, _xmlDoc, _shapeClass, defaultFactory) => {
            const defaultElement = defaultFactory() as dia.Element;
            const appElement = new EventBased({ id: defaultElement.id });
            appElement.copyFrom(defaultElement);
            return appElement;
        },
        exclusiveGateway: (_xmlNode, _xmlDoc, _shapeClass, defaultFactory) => {
            const defaultElement = defaultFactory() as dia.Element;
            const appElement = new Exclusive({ id: defaultElement.id });
            appElement.copyFrom(defaultElement);
            return appElement;
        },
        sequenceFlow: (xmlNode: Element, xmlDoc: Document, _shapeClass, defaultFactory) => {
            const defaultLink = defaultFactory() as dia.Link;
            const isConditional = xmlNode.firstElementChild?.tagName.includes('conditionExpression');

            const appLink = isConditional ? new Conditional({ id: defaultLink.id }) : new Sequence({ id: defaultLink.id });

            appLink.copyFrom(defaultLink);

            if (appLink.vertices().length > 0) {
                appLink.vertices(simplifyLinkWaypoints(xmlDoc, appLink.id));
            }

            return appLink;
        },
        messageFlow: (_xmlNode, xmlDoc, _shapeClass, defaultFactory) => {
            const defaultLink = defaultFactory() as dia.Link;
            const appLink = new Message({ id: defaultLink.id });
            appLink.copyFrom(defaultLink);

            if (appLink.vertices().length > 0) {
                appLink.vertices(simplifyLinkWaypoints(xmlDoc, appLink.id));
            }

            return appLink;
        },
        dataObject: (xmlNode: Element, _xmlDoc, _shapeClass, defaultFactory) => {
            const appElement = defaultFactory() as DataObject;
            const isCollection = xmlNode.getAttribute('isCollection') === 'true';
            appElement.setMarkers(isCollection ? [MarkerNames.COLLECTION] : []);
            return appElement;
        }
    }
};
