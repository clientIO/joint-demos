import { g, shapes, util, V } from '@joint/plus';
import { ShapeTypes } from '../shapes-typing';
import { eventAppearanceConfig, eventIconClasses, EventLabels, EventShapeTypes } from './event-config';
import { ActivityShapeTypes } from '../activity/activity-config';
import { GatewayShapeTypes } from '../gateway/gateway-config';
import { DataShapeTypes } from '../data/data-config';
import { defaultAttrs, labelEditorWrapperStyles } from '../shared-config';
import { AnnotationShapeTypes } from '../annotation/annotation-config';
import { PoolShapeTypes } from '../pool/pool-config';
import { handles } from '../../configs/halo-config';
import { getPoolParent, isPoolShared } from '../../utils';

const LABEL_Y_OFFSET = 14;

export class Event extends shapes.bpmn2.Event {
    constructor() {
        super(...arguments);
        
        this.isResizable = false;
        this.labelPath = 'label/text';
        this.labelSelector = 'labelGroup';
    }
    
    defaults() {
        return util.defaultsDeep({
            shapeType: ShapeTypes.EVENT,
            outputMappings: [],
            attrs: {
                label: Object.assign(Object.assign({}, defaultAttrs.shapeLabel), { text: 'Event', refDy: null, refX: null, x: 'calc(w/2)', y: `calc(h+${LABEL_Y_OFFSET})`, textWrap: {
                        width: '200%'
                    } }),
                labelBody: defaultAttrs.labelBody
            }
        }, super.defaults);
    }

    getContentConfig() {
        return {
            groups: {
                outputMapping: {
                    label: 'Output Mapping',
                    index: 1
                }
            },
            inputs: {
                outputMappings: {
                    type: 'list',
                    group: 'outputMapping',
                    index: 1,
                    item: {
                        type: 'object',
                        properties: {
                            target: {
                                type: 'text',
                                label: 'Result Variable',
                                index: 1
                            },
                            source: {
                                type: 'text',
                                label: 'Result Expression',
                                index: 2
                            }
                        }
                    }
                }
            }
        };
    }
    
    preinitialize(...args) {
        super.preinitialize(...args);
        // Add `labelBody` to markup
        this.markup = util.svg /* xml */ `
            <ellipse @selector="background"/>
            <image @selector="icon"/>
            <path @selector="border"/>
            <g @selector="labelGroup">
                <rect @selector="labelBody"/>
                <text @selector="label"/>
            </g>
        `;
    }
    
    copyFrom(element) {
        const { x, y, width, height } = element.getBBox();
        const label = element.attr(['label', 'text']) || '';
        this.prop({
            position: { x, y },
            size: { width, height },
            attrs: {
                background: {
                    fill: element.attr(['background', 'fill'])
                },
                border: {
                    stroke: element.attr(['border', 'stroke'])
                },
                label: {
                    text: label,
                    fontFamily: element.attr(['label', 'fontFamily']),
                    fontSize: element.attr(['label', 'fontSize']),
                    fontWeight: element.attr(['label', 'fontWeight']),
                    fill: element.attr(['label', 'fill']),
                }
            }
        });
    }
    
    getShapeList() {
        return [];
    }
    
    getAppearanceConfig() {
        return eventAppearanceConfig;
    }
    
    getHaloHandles() {
        return [
            handles.ConnectEndEvent,
            handles.ConnectIntermediateThrowingEvent,
            handles.ConnectGateway,
            handles.ConnectServiceTask,
            handles.ConnectHttpRequest,
            handles.ConnectAnnotation,
            handles.Link
        ];
    }
    
    validateConnection(targetModel) {
        return !!targetModel;
    }
    
    validateEmbedding(parent) {
        return parent.get('shapeType') === ShapeTypes.SWIMLANE;
    }
    
    getLabelEditorStyles(paper) {
        const labelAttrs = this.attr(['label']) || {};
        
        const padding = 4;
        
        const bbox = this.getBBox();
        
        const { x: bottomMiddleX, y: bottomMiddleY } = bbox.bottomMiddle();
        
        const borderWidth = parseFloat(labelEditorWrapperStyles.borderWidth);
        
        const labelEditorWidth = 2 * bbox.width + 2 * padding;
        const x = bottomMiddleX - labelEditorWidth / 2;
        const y = bottomMiddleY + LABEL_Y_OFFSET - padding - borderWidth;
        
        return {
            padding: `${padding}px`,
            transform: V.matrixToTransformString(paper.matrix().translate(x, y)),
            transformOrigin: '0 0',
            width: `${labelEditorWidth}px`,
            fontFamily: labelAttrs.fontFamily,
            fontSize: `${labelAttrs.fontSize}px`,
            fontWeight: labelAttrs.fontWeight,
            color: labelAttrs.fill
        };
    }
    
    getClosestBoundaryPoint(bbox, point) {
        const ellipse = g.Ellipse.fromRect(bbox);
        return ellipse.intersectionWithLineFromCenterToPoint(point);
    }
}

// Start normal
export class Start extends Event {

    defaults() {
        return util.defaultsDeep({
            type: EventShapeTypes.START,
            attrs: {
                label: { text: 'Start Event' }
            }
        }, super.defaults());
    }
    
    getShapeList() {
        const shapes = [
            EventShapeTypes.START,
            EventShapeTypes.INTERMEDIATE_THROWING,
            EventShapeTypes.END,
            EventShapeTypes.MESSAGE_START,
            EventShapeTypes.TIMER_START,
            EventShapeTypes.CONDITIONAL_START,
            EventShapeTypes.SIGNAL_START
        ];
        
        return shapes.filter((shape) => shape !== this.get('type'));
    }
    
    validateConnection(targetModel) {
        
        const targetParent = targetModel === null || targetModel === void 0 ? void 0 : targetModel.parent();
        
        const availableShapes = [
            DataShapeTypes.DATA_STORE,
            DataShapeTypes.DATA_OBJECT,
            DataShapeTypes.DATA_INPUT,
            DataShapeTypes.DATA_OUTPUT,
            AnnotationShapeTypes.ANNOTATION
        ];
        
        // Start event and target share the same pool or the target does not have a parent at the moment (forked) (forked)
        if (isPoolShared(this, targetModel) || !targetParent) {
            // Exclude start events, boundary events and link intermediate catching events
            const validEventTypes = Object.values(EventShapeTypes).filter((type) => {
                const lowerType = type.toLowerCase();
                return !lowerType.includes('start') && !lowerType.includes('boundary') && type !== EventShapeTypes.LINK_INTERMEDIATE_CATCHING;
            });
            
            availableShapes.push(...Object.values(ActivityShapeTypes).filter((type) => type !== ActivityShapeTypes.EVENT_SUB_PROCESS), ...Object.values(GatewayShapeTypes), ...validEventTypes);
        }
        
        return availableShapes.includes(targetModel === null || targetModel === void 0 ? void 0 : targetModel.get('type'));
    }
}

Start.label = EventLabels['event.Start'];
Start.icon = eventIconClasses.START;

export class MessageStart extends Start {
    
    defaults() {
        return util.defaultsDeep({
            type: EventShapeTypes.MESSAGE_START,
            attrs: {
                icon: { iconType: 'message1' }
            }
        }, super.defaults());
    }
}

MessageStart.label = EventLabels['event.MessageStart'];
MessageStart.icon = eventIconClasses.MESSAGE_START;

export class TimerStart extends Start {
    
    defaults() {
        return util.defaultsDeep({
            type: EventShapeTypes.TIMER_START,
            attrs: {
                icon: { iconType: 'timer1' }
            }
        }, super.defaults());
    }
}

TimerStart.label = EventLabels['event.TimerStart'];
TimerStart.icon = eventIconClasses.TIMER_START;

export class ConditionalStart extends Start {
    
    defaults() {
        return util.defaultsDeep({
            type: EventShapeTypes.CONDITIONAL_START,
            attrs: {
                icon: { iconType: 'conditional1' }
            }
        }, super.defaults());
    }
}

ConditionalStart.label = EventLabels['event.ConditionalStart'];
ConditionalStart.icon = eventIconClasses.CONDITIONAL_START;

export class SignalStart extends Start {
    
    defaults() {
        return util.defaultsDeep({
            type: EventShapeTypes.SIGNAL_START,
            attrs: {
                icon: { iconType: 'signal1' }
            }
        }, super.defaults());
    }
}

SignalStart.label = EventLabels['event.SignalStart'];
SignalStart.icon = eventIconClasses.SIGNAL_START;

// Intermediate Catching

class IntermediateCatching extends Event {
    
    defaults() {
        return util.defaultsDeep({
            type: EventShapeTypes.INTERMEDIATE_CATCHING,
            attrs: {
                border: { borderType: 'double' }
            },
        }, super.defaults());
    }
    
    getShapeList() {
        const shapes = [
            EventShapeTypes.START,
            EventShapeTypes.INTERMEDIATE_THROWING,
            EventShapeTypes.END,
            EventShapeTypes.MESSAGE_INTERMEDIATE_CATCHING,
            EventShapeTypes.MESSAGE_INTERMEDIATE_THROWING,
            EventShapeTypes.TIMER_INTERMEDIATE_CATCHING,
            EventShapeTypes.ESCALATION_INTERMEDIATE_THROWING,
            EventShapeTypes.CONDITIONAL_INTERMEDIATE_CATCHING,
            EventShapeTypes.LINK_INTERMEDIATE_CATCHING,
            EventShapeTypes.LINK_INTERMEDIATE_THROWING,
            EventShapeTypes.COMPENSATION_INTERMEDIATE_THROWING,
            EventShapeTypes.SIGNAL_INTERMEDIATE_CATCHING,
            EventShapeTypes.SIGNAL_INTERMEDIATE_THROWING
        ];
        
        return shapes.filter((shape) => shape !== this.get('type'));
    }
    
    validateConnection(targetModel) {
        const targetParent = targetModel === null || targetModel === void 0 ? void 0 : targetModel.parent();
        
        const availableShapes = [
            DataShapeTypes.DATA_STORE,
            DataShapeTypes.DATA_OBJECT,
            DataShapeTypes.DATA_INPUT,
            DataShapeTypes.DATA_OUTPUT,
            AnnotationShapeTypes.ANNOTATION
        ];
        
        // Intermediate catching event and target share the same pool or the target does not have a parent at the moment (forked)
        if (isPoolShared(this, targetModel) || !targetParent) {
            // Exclude start events, boundary events and link intermediate catching events
            const validEventTypes = Object.values(EventShapeTypes).filter((type) => {
                const lowerType = type.toLowerCase();
                return !lowerType.includes('start') && !lowerType.includes('boundary') && type !== EventShapeTypes.LINK_INTERMEDIATE_CATCHING;
            });
            
            availableShapes.push(...Object.values(ActivityShapeTypes).filter((type) => type !== ActivityShapeTypes.EVENT_SUB_PROCESS), ...Object.values(GatewayShapeTypes), ...validEventTypes);
        }
        
        return availableShapes.includes(targetModel === null || targetModel === void 0 ? void 0 : targetModel.get('type'));
    }
}

IntermediateCatching.label = EventLabels['event.IntermediateCatching'];
IntermediateCatching.icon = eventIconClasses.INTERMEDIATE_CATCHING;

export class MessageIntermediateCatching extends IntermediateCatching {
    
    defaults() {
        return util.defaultsDeep({
            type: EventShapeTypes.MESSAGE_INTERMEDIATE_CATCHING,
            attrs: {
                icon: { iconType: 'message1' }
            }
        }, super.defaults());
    }
}

MessageIntermediateCatching.label = EventLabels['event.MessageIntermediateCatching'];
MessageIntermediateCatching.icon = eventIconClasses.MESSAGE_INTERMEDIATE_CATCHING;

export class TimerIntermediateCatching extends IntermediateCatching {
    
    defaults() {
        return util.defaultsDeep({
            type: EventShapeTypes.TIMER_INTERMEDIATE_CATCHING,
            attrs: {
                icon: { iconType: 'timer1' }
            }
        }, super.defaults());
    }
}

TimerIntermediateCatching.label = EventLabels['event.TimerIntermediateCatching'];
TimerIntermediateCatching.icon = eventIconClasses.TIMER_INTERMEDIATE_CATCHING;

export class ConditionalIntermediateCatching extends IntermediateCatching {
    
    defaults() {
        return util.defaultsDeep({
            type: EventShapeTypes.CONDITIONAL_INTERMEDIATE_CATCHING,
            attrs: {
                icon: { iconType: 'conditional1' }
            }
        }, super.defaults());
    }
}

ConditionalIntermediateCatching.label = EventLabels['event.ConditionalIntermediateCatching'];
ConditionalIntermediateCatching.icon = eventIconClasses.CONDITIONAL_INTERMEDIATE_CATCHING;

export class LinkIntermediateCatching extends IntermediateCatching {
    
    defaults() {
        return util.defaultsDeep({
            type: EventShapeTypes.LINK_INTERMEDIATE_CATCHING,
            attrs: {
                icon: { iconType: 'link1' }
            }
        }, super.defaults());
    }
}

LinkIntermediateCatching.label = EventLabels['event.LinkIntermediateCatching'];
LinkIntermediateCatching.icon = eventIconClasses.LINK_INTERMEDIATE_CATCHING;

export class SignalIntermediateCatching extends IntermediateCatching {
    
    defaults() {
        return util.defaultsDeep({
            type: EventShapeTypes.SIGNAL_INTERMEDIATE_CATCHING,
            attrs: {
                icon: { iconType: 'signal1' }
            }
        }, super.defaults());
    }
}

SignalIntermediateCatching.label = EventLabels['event.SignalIntermediateCatching'];
SignalIntermediateCatching.icon = eventIconClasses.SIGNAL_INTERMEDIATE_CATCHING;

// Intermediate boundary

export class IntermediateBoundary extends Event {
    
    defaults() {
        return util.defaultsDeep({
            type: EventShapeTypes.INTERMEDIATE_BOUNDARY,
            attrs: {
                border: { borderType: 'double' }
            }
        }, super.defaults());
    }
    
    getShapeList() {
        
        const shapes = [
            EventShapeTypes.MESSAGE_INTERMEDIATE_BOUNDARY,
            EventShapeTypes.TIMER_INTERMEDIATE_BOUNDARY,
            EventShapeTypes.ESCALATION_INTERMEDIATE_BOUNDARY,
            EventShapeTypes.CONDITIONAL_INTERMEDIATE_BOUNDARY,
            EventShapeTypes.ERROR_INTERMEDIATE_BOUNDARY,
            EventShapeTypes.SIGNAL_INTERMEDIATE_BOUNDARY,
            EventShapeTypes.COMPENSATION_INTERMEDIATE_BOUNDARY,
            EventShapeTypes.MESSAGE_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING,
            EventShapeTypes.TIMER_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING,
            EventShapeTypes.ESCALATION_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING,
            EventShapeTypes.CONDITIONAL_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING,
            EventShapeTypes.SIGNAL_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING,
        ];
        
        return shapes.filter((shape) => shape !== this.get('type'));
    }
    
    validateEmbedding(parent) {
        return parent.get('shapeType') === ShapeTypes.ACTIVITY && parent.get('type') !== ActivityShapeTypes.EVENT_SUB_PROCESS;
    }
    
    validateUnembedding() {
        return false;
    }
    
    validateConnection(targetModel) {
        const targetParent = targetModel === null || targetModel === void 0 ? void 0 : targetModel.parent();
        
        const availableShapes = [
            DataShapeTypes.DATA_STORE,
            DataShapeTypes.DATA_OBJECT,
            DataShapeTypes.DATA_INPUT,
            DataShapeTypes.DATA_OUTPUT,
            AnnotationShapeTypes.ANNOTATION
        ];
        
        // Intermediate boundary event and target share the same pool or the target does not have a parent at the moment (forked)
        if (isPoolShared(this, targetModel) || !targetParent) {
            // Exclude start events, boundary events and link intermediate catching events
            const validEventTypes = Object.values(EventShapeTypes).filter((type) => {
                const lowerType = type.toLowerCase();
                return !lowerType.includes('start') && !lowerType.includes('boundary') && type !== EventShapeTypes.LINK_INTERMEDIATE_CATCHING;
            });
            
            availableShapes.push(...Object.values(ActivityShapeTypes).filter((type) => type !== ActivityShapeTypes.EVENT_SUB_PROCESS).filter((type) => type !== ActivityShapeTypes.EVENT_SUB_PROCESS), ...Object.values(GatewayShapeTypes), ...validEventTypes);
        }
        
        return availableShapes.includes(targetModel === null || targetModel === void 0 ? void 0 : targetModel.get('type'));
    }
}

export class MessageIntermediateBoundary extends IntermediateBoundary {
    
    defaults() {
        return util.defaultsDeep({
            type: EventShapeTypes.MESSAGE_INTERMEDIATE_BOUNDARY,
            attrs: {
                icon: { iconType: 'message1' }
            }
        }, super.defaults());
    }
}

MessageIntermediateBoundary.label = EventLabels['event.MessageIntermediateBoundary'];
MessageIntermediateBoundary.icon = eventIconClasses.MESSAGE_INTERMEDIATE_BOUNDARY;

export class TimerIntermediateBoundary extends IntermediateBoundary {

    defaults() {
        return util.defaultsDeep({
            type: EventShapeTypes.TIMER_INTERMEDIATE_BOUNDARY,
            attrs: {
                icon: { iconType: 'timer1' },
                label: { text: 'Timer Event' }
            }
        }, super.defaults());
    }
}

TimerIntermediateBoundary.label = EventLabels['event.TimerIntermediateBoundary'];
TimerIntermediateBoundary.icon = eventIconClasses.TIMER_INTERMEDIATE_BOUNDARY;

export class ConditionalIntermediateBoundary extends IntermediateBoundary {
    
    defaults() {
        return util.defaultsDeep({
            type: EventShapeTypes.CONDITIONAL_INTERMEDIATE_BOUNDARY,
            attrs: {
                icon: { iconType: 'conditional1' }
            }
        }, super.defaults());
    }
}

ConditionalIntermediateBoundary.label = EventLabels['event.ConditionalIntermediateBoundary'];
ConditionalIntermediateBoundary.icon = eventIconClasses.CONDITIONAL_INTERMEDIATE_BOUNDARY;

export class SignalIntermediateBoundary extends IntermediateBoundary {
    
    defaults() {
        return util.defaultsDeep({
            type: EventShapeTypes.SIGNAL_INTERMEDIATE_BOUNDARY,
            attrs: {
                icon: { iconType: 'signal1' }
            }
        }, super.defaults());
    }
}

SignalIntermediateBoundary.label = EventLabels['event.SignalIntermediateBoundary'];
SignalIntermediateBoundary.icon = eventIconClasses.SIGNAL_INTERMEDIATE_BOUNDARY;

export class ErrorIntermediateBoundary extends IntermediateBoundary {

    defaults() {
        return util.defaultsDeep({
            type: EventShapeTypes.ERROR_INTERMEDIATE_BOUNDARY,
            attrs: {
                icon: { iconType: 'error1' },
                label: { text: 'Error Event' }
            }
        }, super.defaults());
    }
}

ErrorIntermediateBoundary.label = EventLabels['event.ErrorIntermediateBoundary'];
ErrorIntermediateBoundary.icon = eventIconClasses.ERROR_INTERMEDIATE_BOUNDARY;

export class EscalationIntermediateBoundary extends IntermediateBoundary {
    
    defaults() {
        return util.defaultsDeep({
            type: EventShapeTypes.ESCALATION_INTERMEDIATE_BOUNDARY,
            attrs: {
                icon: { iconType: 'escalation1' }
            }
        }, super.defaults());
    }
}

EscalationIntermediateBoundary.label = EventLabels['event.EscalationIntermediateBoundary'];
EscalationIntermediateBoundary.icon = eventIconClasses.ESCALATION_INTERMEDIATE_BOUNDARY;

export class CompensationIntermediateBoundary extends IntermediateBoundary {
    
    defaults() {
        return util.defaultsDeep({
            type: EventShapeTypes.COMPENSATION_INTERMEDIATE_BOUNDARY,
            attrs: {
                icon: { iconType: 'compensation1' }
            }
        }, super.defaults());
    }
    
    validateConnection(targetModel) {
        const targetParent = targetModel === null || targetModel === void 0 ? void 0 : targetModel.parent();
        
        const availableShapes = [
            DataShapeTypes.DATA_STORE,
            DataShapeTypes.DATA_OBJECT,
            DataShapeTypes.DATA_INPUT,
            DataShapeTypes.DATA_OUTPUT,
            AnnotationShapeTypes.ANNOTATION
        ];
        
        // Compensation intermediate boundary event and target share the same pool or the target does not have a parent at the moment (forked)
        if (isPoolShared(this, targetModel) || !targetParent) {
            availableShapes.push(...Object.values(ActivityShapeTypes).filter((type) => type !== ActivityShapeTypes.EVENT_SUB_PROCESS));
        }
        
        return availableShapes.includes(targetModel === null || targetModel === void 0 ? void 0 : targetModel.get('type'));
    }
}

CompensationIntermediateBoundary.label = EventLabels['event.CompensationIntermediateBoundary'];
CompensationIntermediateBoundary.icon = eventIconClasses.COMPENSATION_INTERMEDIATE_BOUNDARY;

export class CancelIntermediateBoundary extends IntermediateBoundary {
    
    defaults() {
        return util.defaultsDeep({
            type: EventShapeTypes.CANCEL_INTERMEDIATE_BOUNDARY,
            attrs: {
                icon: { iconType: 'cancel1' }
            }
        }, super.defaults());
    }
}

CancelIntermediateBoundary.label = EventLabels['event.CancelIntermediateBoundary'];
CancelIntermediateBoundary.icon = eventIconClasses.CANCEL_INTERMEDIATE_BOUNDARY;

// Intermediate boundary non-interrupting

class IntermediateBoundaryNonInterrupting extends IntermediateBoundary {
    
    defaults() {
        return util.defaultsDeep({
            attrs: {
                border: {
                    borderType: 'double',
                    borderStyle: 'dashed'
                }
            }
        }, super.defaults());
    }
}

export class MessageIntermediateBoundaryNonInterrupting extends IntermediateBoundaryNonInterrupting {
    
    defaults() {
        return util.defaultsDeep({
            type: EventShapeTypes.MESSAGE_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING,
            attrs: {
                icon: { iconType: 'message1' }
            }
        }, super.defaults());
    }
}

MessageIntermediateBoundaryNonInterrupting.label = EventLabels['event.MessageIntermediateBoundaryNonInterrupting'];
MessageIntermediateBoundaryNonInterrupting.icon = eventIconClasses.MESSAGE_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING;

export class TimerIntermediateBoundaryNonInterrupting extends IntermediateBoundaryNonInterrupting {
    
    defaults() {
        return util.defaultsDeep({
            type: EventShapeTypes.TIMER_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING,
            attrs: {
                icon: { iconType: 'timer1' }
            }
        }, super.defaults());
    }
}

TimerIntermediateBoundaryNonInterrupting.label = EventLabels['event.TimerIntermediateBoundaryNonInterrupting'];
TimerIntermediateBoundaryNonInterrupting.icon = eventIconClasses.TIMER_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING;

export class ConditionalIntermediateBoundaryNonInterrupting extends IntermediateBoundaryNonInterrupting {
    
    defaults() {
        return util.defaultsDeep({
            type: EventShapeTypes.CONDITIONAL_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING,
            attrs: {
                icon: { iconType: 'conditional1' }
            }
        }, super.defaults());
    }
}

ConditionalIntermediateBoundaryNonInterrupting.label = EventLabels['event.ConditionalIntermediateBoundaryNonInterrupting'];
ConditionalIntermediateBoundaryNonInterrupting.icon = eventIconClasses.CONDITIONAL_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING;

export class SignalIntermediateBoundaryNonInterrupting extends IntermediateBoundaryNonInterrupting {
    
    defaults() {
        return util.defaultsDeep({
            type: EventShapeTypes.SIGNAL_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING,
            attrs: {
                icon: { iconType: 'signal1' }
            }
        }, super.defaults());
    }
}

SignalIntermediateBoundaryNonInterrupting.label = EventLabels['event.SignalIntermediateBoundaryNonInterrupting'];
SignalIntermediateBoundaryNonInterrupting.icon = eventIconClasses.SIGNAL_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING;

export class EscalationIntermediateBoundaryNonInterrupting extends IntermediateBoundaryNonInterrupting {
    
    defaults() {
        return util.defaultsDeep({
            type: EventShapeTypes.ESCALATION_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING,
            attrs: {
                icon: { iconType: 'escalation1' }
            }
        }, super.defaults());
    }
}

EscalationIntermediateBoundaryNonInterrupting.label = EventLabels['event.EscalationIntermediateBoundaryNonInterrupting'];
EscalationIntermediateBoundaryNonInterrupting.icon = eventIconClasses.ESCALATION_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING;

// Intermediate throwing

export class IntermediateThrowing extends Event {
    
    defaults() {
        return util.defaultsDeep({
            type: EventShapeTypes.INTERMEDIATE_THROWING,
            attrs: {
                border: { borderType: 'double' }
            },
        }, super.defaults());
    }
    
    getShapeList() {
        const shapes = [
            EventShapeTypes.START,
            EventShapeTypes.INTERMEDIATE_THROWING,
            EventShapeTypes.END,
            EventShapeTypes.MESSAGE_INTERMEDIATE_CATCHING,
            EventShapeTypes.MESSAGE_INTERMEDIATE_THROWING,
            EventShapeTypes.TIMER_INTERMEDIATE_CATCHING,
            EventShapeTypes.ESCALATION_INTERMEDIATE_THROWING,
            EventShapeTypes.CONDITIONAL_INTERMEDIATE_CATCHING,
            EventShapeTypes.LINK_INTERMEDIATE_CATCHING,
            EventShapeTypes.LINK_INTERMEDIATE_THROWING,
            EventShapeTypes.COMPENSATION_INTERMEDIATE_THROWING,
            EventShapeTypes.SIGNAL_INTERMEDIATE_CATCHING,
            EventShapeTypes.SIGNAL_INTERMEDIATE_THROWING
        ];
        
        return shapes.filter((shape) => shape !== this.get('type'));
    }
    
    validateEmbedding(parent, inGraph) {
        
        if (inGraph && parent.get('shapeType') === ShapeTypes.SWIMLANE)
            return true;
        
        return !inGraph &&
            (parent.get('shapeType') === ShapeTypes.SWIMLANE || parent.get('shapeType') === ShapeTypes.ACTIVITY) &&
            parent.get('type') !== ActivityShapeTypes.EVENT_SUB_PROCESS;
    }
    
    validateConnection(targetModel) {
        
        if (getPoolParent(this) === targetModel)
            return false;
        
        const availableShapes = [
            AnnotationShapeTypes.ANNOTATION,
            PoolShapeTypes.HORIZONTAL_POOL,
            PoolShapeTypes.VERTICAL_POOL
        ];
        
        const targetParent = targetModel === null || targetModel === void 0 ? void 0 : targetModel.parent();
        
        // Intermediate throwing event and target share the same pool or the target does not have a parent at the moment (forked)
        if (isPoolShared(this, targetModel) || !targetParent) {
            // Exclude start events, boundary events and link intermediate catching events
            const validEventTypes = Object.values(EventShapeTypes).filter((type) => {
                const lowerType = type.toLowerCase();
                return !lowerType.includes('start') && !lowerType.includes('boundary') && type !== EventShapeTypes.LINK_INTERMEDIATE_CATCHING;
            });
            
            availableShapes.push(...Object.values(ActivityShapeTypes).filter((type) => type !== ActivityShapeTypes.EVENT_SUB_PROCESS), ...Object.values(GatewayShapeTypes), ...validEventTypes);
        }
        else {
            availableShapes.push(EventShapeTypes.START, EventShapeTypes.MESSAGE_START, EventShapeTypes.MESSAGE_INTERMEDIATE_CATCHING, EventShapeTypes.MESSAGE_INTERMEDIATE_BOUNDARY, EventShapeTypes.MESSAGE_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING);
        }
        
        return availableShapes.includes(targetModel === null || targetModel === void 0 ? void 0 : targetModel.get('type'));
    }
}

IntermediateThrowing.label = EventLabels['event.IntermediateThrowing'];
IntermediateThrowing.icon = eventIconClasses.INTERMEDIATE_THROWING;

export class MessageIntermediateThrowing extends IntermediateThrowing {
    
    defaults() {
        return util.defaultsDeep({
            type: EventShapeTypes.MESSAGE_INTERMEDIATE_THROWING,
            attrs: {
                icon: { iconType: 'message2' }
            }
        }, super.defaults());
    }
    
    validateConnection(targetModel) {
        const targetParent = targetModel === null || targetModel === void 0 ? void 0 : targetModel.parent();
        
        const availableShapes = [
            ...Object.values(ActivityShapeTypes).filter((type) => type !== ActivityShapeTypes.EVENT_SUB_PROCESS),
            AnnotationShapeTypes.ANNOTATION
        ];
        
        // Message intermediate throwing event and target share the same pool or the target does not have a parent at the moment (forked)
        if (isPoolShared(this, targetModel) || !targetParent) {
            // Exclude start events, boundary events and link intermediate catching events
            const validEventTypes = Object.values(EventShapeTypes).filter((type) => {
                const lowerType = type.toLowerCase();
                return !lowerType.includes('start') && !lowerType.includes('boundary') && type !== EventShapeTypes.LINK_INTERMEDIATE_CATCHING;
            });
            
            availableShapes.push(...Object.values(GatewayShapeTypes), ...validEventTypes);
        }
        else {
            availableShapes.push(EventShapeTypes.START, EventShapeTypes.MESSAGE_START, EventShapeTypes.MESSAGE_INTERMEDIATE_CATCHING, EventShapeTypes.MESSAGE_INTERMEDIATE_BOUNDARY, EventShapeTypes.MESSAGE_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING);
        }
        
        // Target is not a pool parent of the end event
        if (getPoolParent(this) !== targetModel) {
            availableShapes.push(PoolShapeTypes.HORIZONTAL_POOL, PoolShapeTypes.VERTICAL_POOL);
        }
        
        return availableShapes.includes(targetModel === null || targetModel === void 0 ? void 0 : targetModel.get('type'));
    }
}

MessageIntermediateThrowing.label = EventLabels['event.MessageIntermediateThrowing'];
MessageIntermediateThrowing.icon = eventIconClasses.MESSAGE_INTERMEDIATE_THROWING;

export class LinkIntermediateThrowing extends IntermediateThrowing {
    
    defaults() {
        return util.defaultsDeep({
            type: EventShapeTypes.LINK_INTERMEDIATE_THROWING,
            attrs: {
                icon: { iconType: 'link2' }
            }
        }, super.defaults());
    }
    
    validateConnection(_) {
        return false;
    }
}

LinkIntermediateThrowing.label = EventLabels['event.LinkIntermediateThrowing'];
LinkIntermediateThrowing.icon = eventIconClasses.LINK_INTERMEDIATE_THROWING;

export class SignalIntermediateThrowing extends IntermediateThrowing {
    
    defaults() {
        return util.defaultsDeep({
            type: EventShapeTypes.SIGNAL_INTERMEDIATE_THROWING,
            attrs: {
                icon: { iconType: 'signal2' }
            }
        }, super.defaults());
    }
}

SignalIntermediateThrowing.label = EventLabels['event.SignalIntermediateThrowing'];
SignalIntermediateThrowing.icon = eventIconClasses.SIGNAL_INTERMEDIATE_THROWING;

export class EscalationIntermediateThrowing extends IntermediateThrowing {
    
    defaults() {
        return util.defaultsDeep({
            type: EventShapeTypes.ESCALATION_INTERMEDIATE_THROWING,
            attrs: {
                icon: { iconType: 'escalation2' }
            }
        }, super.defaults());
    }
}

EscalationIntermediateThrowing.label = EventLabels['event.EscalationIntermediateThrowing'];
EscalationIntermediateThrowing.icon = eventIconClasses.ESCALATION_INTERMEDIATE_THROWING;

export class CompensationIntermediateThrowing extends IntermediateThrowing {
    
    defaults() {
        return util.defaultsDeep({
            type: EventShapeTypes.COMPENSATION_INTERMEDIATE_THROWING,
            attrs: {
                icon: { iconType: 'compensation2' }
            }
        }, super.defaults());
    }
}

CompensationIntermediateThrowing.label = EventLabels['event.CompensationIntermediateThrowing'];
CompensationIntermediateThrowing.icon = eventIconClasses.COMPENSATION_INTERMEDIATE_THROWING;

// End

export class End extends Event {

    defaults() {
        return util.defaultsDeep({
            type: EventShapeTypes.END,
            attrs: {
                border: { borderType: 'thick' },
                label: { text: 'End Event' }
            },
        }, super.defaults());
    }
    
    getShapeList() {
        const shapes = [
            EventShapeTypes.START,
            EventShapeTypes.MESSAGE_INTERMEDIATE_THROWING,
            EventShapeTypes.END,
            EventShapeTypes.MESSAGE_END,
            EventShapeTypes.ESCALATION_END,
            EventShapeTypes.ERROR_END,
            EventShapeTypes.COMPENSATION_END,
            EventShapeTypes.SIGNAL_END,
            EventShapeTypes.TERMINATION_END
        ];
        
        return shapes.filter((shape) => shape !== this.get('type'));
    }
    
    getHaloHandles() {
        return [
            handles.ConnectAnnotation,
            handles.Link
        ];
    }
    
    validateConnection(targetModel) {
        
        const targetType = targetModel === null || targetModel === void 0 ? void 0 : targetModel.get('type');
        
        // Always enable connection to annotation
        if (targetType === AnnotationShapeTypes.ANNOTATION)
            return true;
        
        const targetParent = targetModel === null || targetModel === void 0 ? void 0 : targetModel.parent();
        
        // If the end event does not have a parent, connection can't be valid
        if (!this.parent())
            return false;
        
        if (isPoolShared(this, targetModel) && targetParent)
            return false;
        
        const availableShapes = [
            EventShapeTypes.START,
            EventShapeTypes.MESSAGE_START,
            EventShapeTypes.MESSAGE_INTERMEDIATE_CATCHING,
            EventShapeTypes.MESSAGE_INTERMEDIATE_BOUNDARY,
            EventShapeTypes.MESSAGE_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING,
            ...Object.values(ActivityShapeTypes).filter((type) => type !== ActivityShapeTypes.EVENT_SUB_PROCESS),
        ];
        
        // Target is not a pool parent of the end event
        if (getPoolParent(this) !== targetModel) {
            availableShapes.push(PoolShapeTypes.HORIZONTAL_POOL, PoolShapeTypes.VERTICAL_POOL);
        }
        
        return availableShapes.includes(targetType);
    }
}

End.label = EventLabels['event.End'];
End.icon = eventIconClasses.END;

export class MessageEnd extends End {
    
    defaults() {
        return util.defaultsDeep({
            type: EventShapeTypes.MESSAGE_END,
            attrs: {
                icon: { iconType: 'message2' }
            }
        }, super.defaults());
    }
}

MessageEnd.label = EventLabels['event.MessageEnd'];
MessageEnd.icon = eventIconClasses.MESSAGE_END;

export class SignalEnd extends End {
    
    defaults() {
        return util.defaultsDeep({
            type: EventShapeTypes.SIGNAL_END,
            attrs: {
                icon: { iconType: 'signal2' }
            }
        }, super.defaults());
    }
    
    validateConnection(targetModel) {
        return (targetModel === null || targetModel === void 0 ? void 0 : targetModel.get('type')) === AnnotationShapeTypes.ANNOTATION;
    }
}

SignalEnd.label = EventLabels['event.SignalEnd'];
SignalEnd.icon = eventIconClasses.SIGNAL_END;

export class ErrorEnd extends End {
    
    defaults() {
        return util.defaultsDeep({
            type: EventShapeTypes.ERROR_END,
            attrs: {
                icon: { iconType: 'error2' }
            }
        }, super.defaults());
    }
    
    validateConnection(targetModel) {
        return (targetModel === null || targetModel === void 0 ? void 0 : targetModel.get('type')) === AnnotationShapeTypes.ANNOTATION;
    }
}

ErrorEnd.label = EventLabels['event.ErrorEnd'];
ErrorEnd.icon = eventIconClasses.ERROR_END;

export class EscalationEnd extends End {
    
    defaults() {
        return util.defaultsDeep({
            type: EventShapeTypes.ESCALATION_END,
            attrs: {
                icon: { iconType: 'escalation2' }
            }
        }, super.defaults());
    }
    
    validateConnection(targetModel) {
        return (targetModel === null || targetModel === void 0 ? void 0 : targetModel.get('type')) === AnnotationShapeTypes.ANNOTATION;
    }
}

EscalationEnd.label = EventLabels['event.EscalationEnd'];
EscalationEnd.icon = eventIconClasses.ESCALATION_END;

export class TerminationEnd extends End {
    
    defaults() {
        return util.defaultsDeep({
            type: EventShapeTypes.TERMINATION_END,
            attrs: {
                icon: { iconType: 'termination2' }
            }
        }, super.defaults());
    }
    
    validateConnection(targetModel) {
        return (targetModel === null || targetModel === void 0 ? void 0 : targetModel.get('type')) === AnnotationShapeTypes.ANNOTATION;
    }
}

TerminationEnd.label = EventLabels['event.TerminationEnd'];
TerminationEnd.icon = eventIconClasses.TERMINATION_END;

export class CompensationEnd extends End {
    
    defaults() {
        return util.defaultsDeep({
            type: EventShapeTypes.COMPENSATION_END,
            attrs: {
                icon: { iconType: 'compensation2' }
            }
        }, super.defaults());
    }
    
    validateConnection(targetModel) {
        return (targetModel === null || targetModel === void 0 ? void 0 : targetModel.get('type')) === AnnotationShapeTypes.ANNOTATION;
    }
}

CompensationEnd.label = EventLabels['event.CompensationEnd'];
CompensationEnd.icon = eventIconClasses.COMPENSATION_END;

Object.assign(shapes, {
    event: {
        // Start
        Start,
        MessageStart,
        TimerStart,
        ConditionalStart,
        SignalStart,
        // Intermediate Catching
        IntermediateCatching,
        MessageIntermediateCatching,
        TimerIntermediateCatching,
        ConditionalIntermediateCatching,
        LinkIntermediateCatching,
        SignalIntermediateCatching,
        // Intermediate boundary
        IntermediateBoundary,
        MessageIntermediateBoundary,
        TimerIntermediateBoundary,
        ConditionalIntermediateBoundary,
        SignalIntermediateBoundary,
        ErrorIntermediateBoundary,
        EscalationIntermediateBoundary,
        CompensationIntermediateBoundary,
        CancelIntermediateBoundary,
        // Intermediate boundary non-interrupting
        MessageIntermediateBoundaryNonInterrupting,
        TimerIntermediateBoundaryNonInterrupting,
        ConditionalIntermediateBoundaryNonInterrupting,
        SignalIntermediateBoundaryNonInterrupting,
        EscalationIntermediateBoundaryNonInterrupting,
        // Intermediate throwing
        IntermediateThrowing,
        MessageIntermediateThrowing,
        LinkIntermediateThrowing,
        SignalIntermediateThrowing,
        EscalationIntermediateThrowing,
        CompensationIntermediateThrowing,
        // End
        End,
        MessageEnd,
        SignalEnd,
        ErrorEnd,
        EscalationEnd,
        TerminationEnd,
        CompensationEnd
    }
});
