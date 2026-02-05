import type { dia } from '@joint/plus';
import { type g, shapes, util, V } from '@joint/plus';
import type { AppElement } from '../shapes-typing';
import { ShapeTypes } from '../shapes-typing';
import { gatewayAppearanceConfig, gatewayIconClasses, GatewayLabels, GatewayShapeTypes } from './gateway-config';
import { ActivityShapeTypes } from '../activity/activity-config';
import { EventShapeTypes } from '../event/event-config';
import { defaultAttrs, labelEditorWrapperStyles } from '../shared-config';
import { AnnotationShapeTypes } from '../annotation/annotation-config';
import { handles } from '../../configs/halo-config';
import { isPoolShared } from '../../utils';

const LABEL_Y_OFFSET = 14;

abstract class Gateway extends shapes.bpmn2.Gateway implements AppElement {

    public readonly isResizable = false;
    public readonly labelPath = 'label/text';
    public readonly labelSelector = 'labelGroup';

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            shapeType: ShapeTypes.GATEWAY,
            attrs: {
                label: {
                    ...defaultAttrs.shapeLabel,
                    refDy: null,
                    refX: null,
                    x: 'calc(w/2)',
                    y: `calc(h+${LABEL_Y_OFFSET})`,
                    text: 'Gateway',
                    textWrap: {
                        width: '200%'
                    }
                },
                labelBody: defaultAttrs.labelBody
            },
            size: {
                width: 50,
                height: 50
            }
        }, super.defaults);
    }

    preinitialize(...args: any[]) {
        super.preinitialize(...args);
        // Add `labelBody` to markup
        this.markup = util.svg/* xml */ `
            <polygon @selector="body"/>
            <image @selector="icon"/>
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
                body: {
                    fill: element.attr(['body', 'fill']),
                    stroke: element.attr(['body', 'stroke'])
                },
                label: {
                    text: label,
                    fontFamily: element.attr(['label', 'fontFamily']),
                    fontSize: element.attr(['label', 'fontSize']),
                    fontWeight: element.attr(['label', 'fontWeight']),
                    fill: element.attr(['label', 'fill'])
                }
            }
        });
    }

    getShapeList(): string[] {
        const shapes = [
            GatewayShapeTypes.EXCLUSIVE,
            GatewayShapeTypes.PARALLEL,
            GatewayShapeTypes.INCLUSIVE,
            GatewayShapeTypes.COMPLEX,
            GatewayShapeTypes.EVENT_BASED
        ];

        return shapes.filter((shape) => shape !== this.get('type'));
    }

    getAppearanceConfig() {
        return gatewayAppearanceConfig;
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
        const targetParent = targetModel?.parent();

        // Don't allow connections between elements in different pools except annotation
        if (!isPoolShared(this, targetModel!) && targetParent) {
            return targetModel?.get('type') === AnnotationShapeTypes.ANNOTATION;
        }

        // Exclude start events, boundary events and link intermediate catching events
        const validEventTypes = Object.values(EventShapeTypes).filter((type: string) => {
            const lowerType = type.toLowerCase();
            return !lowerType.includes('start') && !lowerType.includes('boundary') && type !== EventShapeTypes.LINK_INTERMEDIATE_CATCHING;
        });

        const availableShapes = [
            ...Object.values(ActivityShapeTypes).filter((type: string) => type !== ActivityShapeTypes.EVENT_SUB_PROCESS),
            ...Object.values(GatewayShapeTypes),
            ...validEventTypes,
            AnnotationShapeTypes.ANNOTATION
        ];

        return availableShapes.includes(targetModel?.get('type'));
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
        const side = bbox.sideNearestToPoint(point);

        switch (side) {
            case 'top':
                return bbox.topMiddle();
            case 'right':
                return bbox.rightMiddle();
            case 'bottom':
                return bbox.bottomMiddle();
            case 'left':
                return bbox.leftMiddle();
        }
    }
}

export class Exclusive extends Gateway {

    static label = GatewayLabels['gateway.Exclusive'];
    static icon = gatewayIconClasses.EXCLUSIVE;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: GatewayShapeTypes.EXCLUSIVE,
            attrs: {
                icon: { iconType: 'exclusive' }
            }
        }, super.defaults());
    }
}

export class Inclusive extends Gateway {

    static label = GatewayLabels['gateway.Inclusive'];
    static icon = gatewayIconClasses.INCLUSIVE;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: GatewayShapeTypes.INCLUSIVE,
            attrs: {
                icon: { iconType: 'inclusive' }
            }
        }, super.defaults());
    }
}

export class EventBased extends Gateway {

    static label = GatewayLabels['gateway.EventBased'];
    static icon = gatewayIconClasses.EVENT_BASED;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: GatewayShapeTypes.EVENT_BASED,
            attrs: {
                icon: { iconType: 'event' }
            }
        }, super.defaults());
    }
}

export class Parallel extends Gateway {

    static label = GatewayLabels['gateway.Parallel'];
    static icon = gatewayIconClasses.PARALLEL;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: GatewayShapeTypes.PARALLEL,
            attrs: {
                icon: { iconType: 'parallel' }
            }
        }, super.defaults());
    }
}

export class Complex extends Gateway {

    static label = GatewayLabels['gateway.Complex'];
    static icon = gatewayIconClasses.COMPLEX;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: GatewayShapeTypes.COMPLEX,
            attrs: {
                icon: { iconType: 'complex' }
            }
        }, super.defaults());
    }
}

declare module '@joint/plus' {
    namespace shapes {
        namespace gateway {
            export {
                Exclusive,
                Inclusive,
                EventBased,
                Parallel,
                Complex
            };
        }
    }
}

Object.assign(shapes, {
    gateway: {
        Exclusive,
        Inclusive,
        EventBased,
        Parallel,
        Complex
    }
});
