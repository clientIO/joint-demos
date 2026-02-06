import type { dia } from '@joint/plus';
import { g, shapes, util, V } from '@joint/plus';
import type { AppElement } from '../shapes-typing';
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

export abstract class Event extends shapes.bpmn2.Event implements AppElement {

    public readonly isResizable = false;
    public readonly labelPath = 'label/text';
    public readonly labelSelector = 'labelGroup';

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            shapeType: ShapeTypes.EVENT,
            attrs: {
                label: {
                    ...defaultAttrs.shapeLabel,
                    text: 'Event',
                    refDy: null,
                    refX: null,
                    x: 'calc(w/2)',
                    y: `calc(h+${LABEL_Y_OFFSET})`,
                    textWrap: {
                        width: '200%'
                    }
                },
                labelBody: defaultAttrs.labelBody
            }
        }, super.defaults);
    }

    preinitialize(...args: any[]) {
        super.preinitialize(...args);
        // Add `labelBody` to markup
        this.markup = util.svg/* xml */ `
            <ellipse @selector="background"/>
            <image @selector="icon"/>
            <path @selector="border"/>
            <g @selector="labelGroup">
                <rect @selector="labelBody"/>
                <text @selector="label"/>
            </g>
        `;
    }

    copyFrom(element: dia.Element): void {
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

    getShapeList(): string[] {
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
            handles.ConnectTask,
            handles.ConnectAnnotation,
            handles.Link
        ];
    }

    validateConnection(targetModel?: dia.Cell): boolean {
        return !!targetModel;
    }

    validateEmbedding(parent: dia.Element): boolean {
        return parent.get('shapeType') === ShapeTypes.SWIMLANE;
    }

    getLabelEditorStyles(paper: dia.Paper): Partial<CSSStyleDeclaration> {
        const labelAttrs = this.attr(['label']) || {};

        const padding = 4;

        const bbox = this.getBBox();

        const { x: bottomMiddleX, y: bottomMiddleY } = bbox.bottomMiddle();

        const borderWidth = parseFloat(labelEditorWrapperStyles.borderWidth!);

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

    getClosestBoundaryPoint(bbox: g.Rect, point: g.Point) {
        const ellipse = g.Ellipse.fromRect(bbox);
        return ellipse.intersectionWithLineFromCenterToPoint(point);
    }
}

// Start normal
export class Start extends Event {

    static label = EventLabels['event.Start'];
    static icon = eventIconClasses.START;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: EventShapeTypes.START
        }, super.defaults());
    }

    getShapeList(): string[] {
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

    validateConnection(targetModel?: dia.Cell): boolean {

        const targetParent = targetModel?.parent();

        const availableShapes: string[] = [
            DataShapeTypes.DATA_STORE,
            DataShapeTypes.DATA_OBJECT,
            DataShapeTypes.DATA_INPUT,
            DataShapeTypes.DATA_OUTPUT,
            AnnotationShapeTypes.ANNOTATION
        ];

        // Start event and target share the same pool or the target does not have a parent at the moment (forked) (forked)
        if (isPoolShared(this, targetModel!) || !targetParent) {
            // Exclude start events, boundary events and link intermediate catching events
            const validEventTypes = Object.values(EventShapeTypes).filter((type: string) => {
                const lowerType = type.toLowerCase();
                return !lowerType.includes('start') && !lowerType.includes('boundary') && type !== EventShapeTypes.LINK_INTERMEDIATE_CATCHING;
            });

            availableShapes.push(
                ...Object.values(ActivityShapeTypes).filter((type: string) => type !== ActivityShapeTypes.EVENT_SUB_PROCESS),
                ...Object.values(GatewayShapeTypes),
                ...validEventTypes
            );
        }

        return availableShapes.includes(targetModel?.get('type'));
    }
}

export class MessageStart extends Start {

    static label = EventLabels['event.MessageStart'];
    static icon = eventIconClasses.MESSAGE_START;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: EventShapeTypes.MESSAGE_START,
            attrs: {
                icon: { iconType: 'message1' }
            }
        }, super.defaults());
    }
}

export class TimerStart extends Start {

    static label = EventLabels['event.TimerStart'];
    static icon = eventIconClasses.TIMER_START;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: EventShapeTypes.TIMER_START,
            attrs: {
                icon: { iconType: 'timer1' }
            }
        }, super.defaults());
    }
}

export class ConditionalStart extends Start {

    static label = EventLabels['event.ConditionalStart'];
    static icon = eventIconClasses.CONDITIONAL_START;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: EventShapeTypes.CONDITIONAL_START,
            attrs: {
                icon: { iconType: 'conditional1' }
            }
        }, super.defaults());
    }
}

export class SignalStart extends Start {

    static label = EventLabels['event.SignalStart'];
    static icon = eventIconClasses.SIGNAL_START;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: EventShapeTypes.SIGNAL_START,
            attrs: {
                icon: { iconType: 'signal1' }
            }
        }, super.defaults());
    }
}

// Intermediate Catching

abstract class IntermediateCatching extends Event {

    static label = EventLabels['event.IntermediateCatching'];
    static icon = eventIconClasses.INTERMEDIATE_CATCHING;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: EventShapeTypes.INTERMEDIATE_CATCHING,
            attrs: {
                border: { borderType: 'double' }
            },
        }, super.defaults());
    }

    getShapeList(): string[] {
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

    validateConnection(targetModel?: dia.Cell): boolean {
        const targetParent = targetModel?.parent();

        const availableShapes: string[] = [
            DataShapeTypes.DATA_STORE,
            DataShapeTypes.DATA_OBJECT,
            DataShapeTypes.DATA_INPUT,
            DataShapeTypes.DATA_OUTPUT,
            AnnotationShapeTypes.ANNOTATION
        ];

        // Intermediate catching event and target share the same pool or the target does not have a parent at the moment (forked)
        if (isPoolShared(this, targetModel!) || !targetParent) {
            // Exclude start events, boundary events and link intermediate catching events
            const validEventTypes = Object.values(EventShapeTypes).filter((type: string) => {
                const lowerType = type.toLowerCase();
                return !lowerType.includes('start') && !lowerType.includes('boundary') && type !== EventShapeTypes.LINK_INTERMEDIATE_CATCHING;
            });

            availableShapes.push(
                ...Object.values(ActivityShapeTypes).filter((type: string) => type !== ActivityShapeTypes.EVENT_SUB_PROCESS),
                ...Object.values(GatewayShapeTypes),
                ...validEventTypes
            );
        }

        return availableShapes.includes(targetModel?.get('type'));
    }
}

export class MessageIntermediateCatching extends IntermediateCatching {

    static label = EventLabels['event.MessageIntermediateCatching'];
    static icon = eventIconClasses.MESSAGE_INTERMEDIATE_CATCHING;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: EventShapeTypes.MESSAGE_INTERMEDIATE_CATCHING,
            attrs: {
                icon: { iconType: 'message1' }
            }
        }, super.defaults());
    }
}

export class TimerIntermediateCatching extends IntermediateCatching {

    static label = EventLabels['event.TimerIntermediateCatching'];
    static icon = eventIconClasses.TIMER_INTERMEDIATE_CATCHING;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: EventShapeTypes.TIMER_INTERMEDIATE_CATCHING,
            attrs: {
                icon: { iconType: 'timer1' }
            }
        }, super.defaults());
    }
}

export class ConditionalIntermediateCatching extends IntermediateCatching {

    static label = EventLabels['event.ConditionalIntermediateCatching'];
    static icon = eventIconClasses.CONDITIONAL_INTERMEDIATE_CATCHING;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: EventShapeTypes.CONDITIONAL_INTERMEDIATE_CATCHING,
            attrs: {
                icon: { iconType: 'conditional1' }
            }
        }, super.defaults());
    }
}

export class LinkIntermediateCatching extends IntermediateCatching {

    static label = EventLabels['event.LinkIntermediateCatching'];
    static icon = eventIconClasses.LINK_INTERMEDIATE_CATCHING;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: EventShapeTypes.LINK_INTERMEDIATE_CATCHING,
            attrs: {
                icon: { iconType: 'link1' }
            }
        }, super.defaults());
    }
}

export class SignalIntermediateCatching extends IntermediateCatching {

    static label = EventLabels['event.SignalIntermediateCatching'];
    static icon = eventIconClasses.SIGNAL_INTERMEDIATE_CATCHING;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: EventShapeTypes.SIGNAL_INTERMEDIATE_CATCHING,
            attrs: {
                icon: { iconType: 'signal1' }
            }
        }, super.defaults());
    }
}

// Intermediate boundary

export class IntermediateBoundary extends Event {

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: EventShapeTypes.INTERMEDIATE_BOUNDARY,
            attrs: {
                border: { borderType: 'double' }
            }
        }, super.defaults());
    }

    getShapeList(): string[] {

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

    validateEmbedding(parent: dia.Element): boolean {
        return parent.get('shapeType') === ShapeTypes.ACTIVITY && parent.get('type') !== ActivityShapeTypes.EVENT_SUB_PROCESS;
    }

    validateUnembedding(): boolean {
        return false;
    }

    validateConnection(targetModel?: dia.Cell): boolean {
        const targetParent = targetModel?.parent();

        const availableShapes: string[] = [
            DataShapeTypes.DATA_STORE,
            DataShapeTypes.DATA_OBJECT,
            DataShapeTypes.DATA_INPUT,
            DataShapeTypes.DATA_OUTPUT,
            AnnotationShapeTypes.ANNOTATION
        ];

        // Intermediate boundary event and target share the same pool or the target does not have a parent at the moment (forked)
        if (isPoolShared(this, targetModel!) || !targetParent) {
            // Exclude start events, boundary events and link intermediate catching events
            const validEventTypes = Object.values(EventShapeTypes).filter((type: string) => {
                const lowerType = type.toLowerCase();
                return !lowerType.includes('start') && !lowerType.includes('boundary') && type !== EventShapeTypes.LINK_INTERMEDIATE_CATCHING;
            });

            availableShapes.push(
                ...Object.values(ActivityShapeTypes).filter((type: string) => type !== ActivityShapeTypes.EVENT_SUB_PROCESS).filter((type: string) => type !== ActivityShapeTypes.EVENT_SUB_PROCESS),
                ...Object.values(GatewayShapeTypes),
                ...validEventTypes
            );
        }

        return availableShapes.includes(targetModel?.get('type'));
    }
}

export class MessageIntermediateBoundary extends IntermediateBoundary {

    static label = EventLabels['event.MessageIntermediateBoundary'];
    static icon = eventIconClasses.MESSAGE_INTERMEDIATE_BOUNDARY;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: EventShapeTypes.MESSAGE_INTERMEDIATE_BOUNDARY,
            attrs: {
                icon: { iconType: 'message1' }
            }
        }, super.defaults());
    }
}

export class TimerIntermediateBoundary extends IntermediateBoundary {

    static label = EventLabels['event.TimerIntermediateBoundary'];
    static icon = eventIconClasses.TIMER_INTERMEDIATE_BOUNDARY;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: EventShapeTypes.TIMER_INTERMEDIATE_BOUNDARY,
            attrs: {
                icon: { iconType: 'timer1' }
            }
        }, super.defaults());
    }
}

export class ConditionalIntermediateBoundary extends IntermediateBoundary {

    static label = EventLabels['event.ConditionalIntermediateBoundary'];
    static icon = eventIconClasses.CONDITIONAL_INTERMEDIATE_BOUNDARY;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: EventShapeTypes.CONDITIONAL_INTERMEDIATE_BOUNDARY,
            attrs: {
                icon: { iconType: 'conditional1' }
            }
        }, super.defaults());
    }
}

export class SignalIntermediateBoundary extends IntermediateBoundary {

    static label = EventLabels['event.SignalIntermediateBoundary'];
    static icon = eventIconClasses.SIGNAL_INTERMEDIATE_BOUNDARY;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: EventShapeTypes.SIGNAL_INTERMEDIATE_BOUNDARY,
            attrs: {
                icon: { iconType: 'signal1' }
            }
        }, super.defaults());
    }
}

export class ErrorIntermediateBoundary extends IntermediateBoundary {

    static label = EventLabels['event.ErrorIntermediateBoundary'];
    static icon = eventIconClasses.ERROR_INTERMEDIATE_BOUNDARY;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: EventShapeTypes.ERROR_INTERMEDIATE_BOUNDARY,
            attrs: {
                icon: { iconType: 'error1' }
            }
        }, super.defaults());
    }
}

export class EscalationIntermediateBoundary extends IntermediateBoundary {

    static label = EventLabels['event.EscalationIntermediateBoundary'];
    static icon = eventIconClasses.ESCALATION_INTERMEDIATE_BOUNDARY;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: EventShapeTypes.ESCALATION_INTERMEDIATE_BOUNDARY,
            attrs: {
                icon: { iconType: 'escalation1' }
            }
        }, super.defaults());
    }
}

export class CompensationIntermediateBoundary extends IntermediateBoundary {

    static label = EventLabels['event.CompensationIntermediateBoundary'];
    static icon = eventIconClasses.COMPENSATION_INTERMEDIATE_BOUNDARY;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: EventShapeTypes.COMPENSATION_INTERMEDIATE_BOUNDARY,
            attrs: {
                icon: { iconType: 'compensation1' }
            }
        }, super.defaults());
    }

    validateConnection(targetModel?: dia.Cell): boolean {
        const targetParent = targetModel?.parent();

        const availableShapes: string[] = [
            DataShapeTypes.DATA_STORE,
            DataShapeTypes.DATA_OBJECT,
            DataShapeTypes.DATA_INPUT,
            DataShapeTypes.DATA_OUTPUT,
            AnnotationShapeTypes.ANNOTATION
        ];

        // Compensation intermediate boundary event and target share the same pool or the target does not have a parent at the moment (forked)
        if (isPoolShared(this, targetModel!) || !targetParent) {
            availableShapes.push(...Object.values(ActivityShapeTypes).filter((type: string) => type !== ActivityShapeTypes.EVENT_SUB_PROCESS));
        }

        return availableShapes.includes(targetModel?.get('type'));
    }
}

export class CancelIntermediateBoundary extends IntermediateBoundary {

    static label = EventLabels['event.CancelIntermediateBoundary'];
    static icon = eventIconClasses.CANCEL_INTERMEDIATE_BOUNDARY;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: EventShapeTypes.CANCEL_INTERMEDIATE_BOUNDARY,
            attrs: {
                icon: { iconType: 'cancel1' }
            }
        }, super.defaults());
    }
}

// Intermediate boundary non-interrupting

abstract class IntermediateBoundaryNonInterrupting extends IntermediateBoundary {

    defaults(): dia.Element.Attributes {
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

    static label = EventLabels['event.MessageIntermediateBoundaryNonInterrupting'];
    static icon = eventIconClasses.MESSAGE_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: EventShapeTypes.MESSAGE_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING,
            attrs: {
                icon: { iconType: 'message1' }
            }
        }, super.defaults());
    }
}

export class TimerIntermediateBoundaryNonInterrupting extends IntermediateBoundaryNonInterrupting {

    static label = EventLabels['event.TimerIntermediateBoundaryNonInterrupting'];
    static icon = eventIconClasses.TIMER_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: EventShapeTypes.TIMER_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING,
            attrs: {
                icon: { iconType: 'timer1' }
            }
        }, super.defaults());
    }
}

export class ConditionalIntermediateBoundaryNonInterrupting extends IntermediateBoundaryNonInterrupting {

    static label = EventLabels['event.ConditionalIntermediateBoundaryNonInterrupting'];
    static icon = eventIconClasses.CONDITIONAL_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: EventShapeTypes.CONDITIONAL_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING,
            attrs: {
                icon: { iconType: 'conditional1' }
            }
        }, super.defaults());
    }
}

export class SignalIntermediateBoundaryNonInterrupting extends IntermediateBoundaryNonInterrupting {

    static label = EventLabels['event.SignalIntermediateBoundaryNonInterrupting'];
    static icon = eventIconClasses.SIGNAL_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: EventShapeTypes.SIGNAL_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING,
            attrs: {
                icon: { iconType: 'signal1' }
            }
        }, super.defaults());
    }
}

export class EscalationIntermediateBoundaryNonInterrupting extends IntermediateBoundaryNonInterrupting {

    static label = EventLabels['event.EscalationIntermediateBoundaryNonInterrupting'];
    static icon = eventIconClasses.ESCALATION_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: EventShapeTypes.ESCALATION_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING,
            attrs: {
                icon: { iconType: 'escalation1' }
            }
        }, super.defaults());
    }
}

// Intermediate throwing

export class IntermediateThrowing extends Event {

    static label = EventLabels['event.IntermediateThrowing'];
    static icon = eventIconClasses.INTERMEDIATE_THROWING;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: EventShapeTypes.INTERMEDIATE_THROWING,
            attrs: {
                border: { borderType: 'double' }
            },
        }, super.defaults());
    }

    getShapeList(): string[] {
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

    validateEmbedding(parent: dia.Element, inGraph?: boolean): boolean {

        if (inGraph && parent.get('shapeType') === ShapeTypes.SWIMLANE) return true;

        return !inGraph &&
            (parent.get('shapeType') === ShapeTypes.SWIMLANE || parent.get('shapeType') === ShapeTypes.ACTIVITY) &&
            parent.get('type') !== ActivityShapeTypes.EVENT_SUB_PROCESS;
    }

    validateConnection(targetModel?: dia.Cell): boolean {

        if (getPoolParent(this) === targetModel) return false;

        const availableShapes: string[] = [
            AnnotationShapeTypes.ANNOTATION,
            PoolShapeTypes.HORIZONTAL_POOL,
            PoolShapeTypes.VERTICAL_POOL
        ];

        const targetParent = targetModel?.parent();

        // Intermediate throwing event and target share the same pool or the target does not have a parent at the moment (forked)
        if (isPoolShared(this, targetModel!) || !targetParent) {
            // Exclude start events, boundary events and link intermediate catching events
            const validEventTypes = Object.values(EventShapeTypes).filter((type: string) => {
                const lowerType = type.toLowerCase();
                return !lowerType.includes('start') && !lowerType.includes('boundary') && type !== EventShapeTypes.LINK_INTERMEDIATE_CATCHING;
            });

            availableShapes.push(
                ...Object.values(ActivityShapeTypes).filter((type: string) => type !== ActivityShapeTypes.EVENT_SUB_PROCESS),
                ...Object.values(GatewayShapeTypes),
                ...validEventTypes
            );
        } else {
            availableShapes.push(
                EventShapeTypes.START,
                EventShapeTypes.MESSAGE_START,
                EventShapeTypes.MESSAGE_INTERMEDIATE_CATCHING,
                EventShapeTypes.MESSAGE_INTERMEDIATE_BOUNDARY,
                EventShapeTypes.MESSAGE_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING
            );
        }

        return availableShapes.includes(targetModel?.get('type'));
    }
}

export class MessageIntermediateThrowing extends IntermediateThrowing {

    static label = EventLabels['event.MessageIntermediateThrowing'];
    static icon = eventIconClasses.MESSAGE_INTERMEDIATE_THROWING;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: EventShapeTypes.MESSAGE_INTERMEDIATE_THROWING,
            attrs: {
                icon: { iconType: 'message2' }
            }
        }, super.defaults());
    }

    validateConnection(targetModel?: dia.Cell): boolean {
        const targetParent = targetModel?.parent();

        const availableShapes: string[] = [
            ...Object.values(ActivityShapeTypes).filter((type: string) => type !== ActivityShapeTypes.EVENT_SUB_PROCESS),
            AnnotationShapeTypes.ANNOTATION
        ];

        // Message intermediate throwing event and target share the same pool or the target does not have a parent at the moment (forked)
        if (isPoolShared(this, targetModel!) || !targetParent) {
            // Exclude start events, boundary events and link intermediate catching events
            const validEventTypes = Object.values(EventShapeTypes).filter((type: string) => {
                const lowerType = type.toLowerCase();
                return !lowerType.includes('start') && !lowerType.includes('boundary') && type !== EventShapeTypes.LINK_INTERMEDIATE_CATCHING;
            });

            availableShapes.push(
                ...Object.values(GatewayShapeTypes),
                ...validEventTypes
            );
        } else {
            availableShapes.push(
                EventShapeTypes.START,
                EventShapeTypes.MESSAGE_START,
                EventShapeTypes.MESSAGE_INTERMEDIATE_CATCHING,
                EventShapeTypes.MESSAGE_INTERMEDIATE_BOUNDARY,
                EventShapeTypes.MESSAGE_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING,
            );
        }

        // Target is not a pool parent of the end event
        if (getPoolParent(this) !== targetModel) {
            availableShapes.push(PoolShapeTypes.HORIZONTAL_POOL, PoolShapeTypes.VERTICAL_POOL);
        }

        return availableShapes.includes(targetModel?.get('type'));
    }
}

export class LinkIntermediateThrowing extends IntermediateThrowing {

    static label = EventLabels['event.LinkIntermediateThrowing'];
    static icon = eventIconClasses.LINK_INTERMEDIATE_THROWING;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: EventShapeTypes.LINK_INTERMEDIATE_THROWING,
            attrs: {
                icon: { iconType: 'link2' }
            }
        }, super.defaults());
    }

    validateConnection(_?: dia.Cell): boolean {
        return false;
    }
}

export class SignalIntermediateThrowing extends IntermediateThrowing {

    static label = EventLabels['event.SignalIntermediateThrowing'];
    static icon = eventIconClasses.SIGNAL_INTERMEDIATE_THROWING;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: EventShapeTypes.SIGNAL_INTERMEDIATE_THROWING,
            attrs: {
                icon: { iconType: 'signal2' }
            }
        }, super.defaults());
    }
}

export class EscalationIntermediateThrowing extends IntermediateThrowing {

    static label = EventLabels['event.EscalationIntermediateThrowing'];
    static icon = eventIconClasses.ESCALATION_INTERMEDIATE_THROWING;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: EventShapeTypes.ESCALATION_INTERMEDIATE_THROWING,
            attrs: {
                icon: { iconType: 'escalation2' }
            }
        }, super.defaults());
    }
}

export class CompensationIntermediateThrowing extends IntermediateThrowing {

    static label = EventLabels['event.CompensationIntermediateThrowing'];
    static icon = eventIconClasses.COMPENSATION_INTERMEDIATE_THROWING;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: EventShapeTypes.COMPENSATION_INTERMEDIATE_THROWING,
            attrs: {
                icon: { iconType: 'compensation2' }
            }
        }, super.defaults());
    }
}

// End

export class End extends Event {

    static label = EventLabels['event.End'];
    static icon = eventIconClasses.END;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: EventShapeTypes.END,
            attrs: {
                border: { borderType: 'thick' }
            },
        }, super.defaults());
    }

    getShapeList(): string[] {
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

    validateConnection(targetModel?: dia.Cell): boolean {

        const targetType = targetModel?.get('type');

        // Always enable connection to annotation
        if (targetType === AnnotationShapeTypes.ANNOTATION) return true;

        const targetParent = targetModel?.parent();

        // If the end event does not have a parent, connection can't be valid
        if (!this.parent()) return false;

        if (isPoolShared(this, targetModel!) && targetParent) return false;

        const availableShapes: string[] = [
            EventShapeTypes.START,
            EventShapeTypes.MESSAGE_START,
            EventShapeTypes.MESSAGE_INTERMEDIATE_CATCHING,
            EventShapeTypes.MESSAGE_INTERMEDIATE_BOUNDARY,
            EventShapeTypes.MESSAGE_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING,
            ...Object.values(ActivityShapeTypes).filter((type: string) => type !== ActivityShapeTypes.EVENT_SUB_PROCESS),
        ];

        // Target is not a pool parent of the end event
        if (getPoolParent(this) !== targetModel) {
            availableShapes.push(PoolShapeTypes.HORIZONTAL_POOL, PoolShapeTypes.VERTICAL_POOL);
        }

        return availableShapes.includes(targetType);
    }
}

export class MessageEnd extends End {

    static label = EventLabels['event.MessageEnd'];
    static icon = eventIconClasses.MESSAGE_END;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: EventShapeTypes.MESSAGE_END,
            attrs: {
                icon: { iconType: 'message2' }
            }
        }, super.defaults());
    }
}

export class SignalEnd extends End {

    static label = EventLabels['event.SignalEnd'];
    static icon = eventIconClasses.SIGNAL_END;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: EventShapeTypes.SIGNAL_END,
            attrs: {
                icon: { iconType: 'signal2' }
            }
        }, super.defaults());
    }

    validateConnection(targetModel?: dia.Cell): boolean {
        return targetModel?.get('type') === AnnotationShapeTypes.ANNOTATION;
    }
}

export class ErrorEnd extends End {

    static label = EventLabels['event.ErrorEnd'];
    static icon = eventIconClasses.ERROR_END;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: EventShapeTypes.ERROR_END,
            attrs: {
                icon: { iconType: 'error2' }
            }
        }, super.defaults());
    }

    validateConnection(targetModel?: dia.Cell): boolean {
        return targetModel?.get('type') === AnnotationShapeTypes.ANNOTATION;
    }
}

export class EscalationEnd extends End {

    static label = EventLabels['event.EscalationEnd'];
    static icon = eventIconClasses.ESCALATION_END;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: EventShapeTypes.ESCALATION_END,
            attrs: {
                icon: { iconType: 'escalation2' }
            }
        }, super.defaults());
    }

    validateConnection(targetModel?: dia.Cell): boolean {
        return targetModel?.get('type') === AnnotationShapeTypes.ANNOTATION;
    }
}

export class TerminationEnd extends End {

    static label = EventLabels['event.TerminationEnd'];
    static icon = eventIconClasses.TERMINATION_END;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: EventShapeTypes.TERMINATION_END,
            attrs: {
                icon: { iconType: 'termination2' }
            }
        }, super.defaults());
    }

    validateConnection(targetModel?: dia.Cell): boolean {
        return targetModel?.get('type') === AnnotationShapeTypes.ANNOTATION;
    }
}

export class CompensationEnd extends End {

    static label = EventLabels['event.CompensationEnd'];
    static icon = eventIconClasses.COMPENSATION_END;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: EventShapeTypes.COMPENSATION_END,
            attrs: {
                icon: { iconType: 'compensation2' }
            }
        }, super.defaults());
    }

    validateConnection(targetModel?: dia.Cell): boolean {
        return targetModel?.get('type') === AnnotationShapeTypes.ANNOTATION;
    }
}

declare module '@joint/plus' {
    namespace shapes {
        namespace event {
            export {
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
            };
        }
    }
}

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
