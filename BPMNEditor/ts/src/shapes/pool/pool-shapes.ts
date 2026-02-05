import type { dia, g } from '@joint/plus';
import { shapes, util, V } from '@joint/plus';
import type { AppElement } from '../shapes-typing';
import { ShapeTypes } from '../shapes-typing';
import { PoolShapeTypes, DEFAULT_HORIZONTAL_POOL_SIZE, poolAttributes, swimlaneAttributes, poolAppearanceConfig, swimlaneAppearanceConfig, HORIZONTAL_POOL_PADDING, VERTICAL_POOL_PADDING, SWIMLANE_HEADER_SIZE, DEFAULT_VERTICAL_POOL_SIZE } from './pool-config';
import { handles } from '../../configs/halo-config';
import { defaultAttrs } from '../shared-config';
import { ActivityShapeTypes } from '../activity/activity-config';
import { AnnotationShapeTypes } from '../annotation/annotation-config';
import { getPoolParent } from '../../utils';
import { EventShapeTypes } from '../event/event-config';

type HeaderedShape = HorizontalPool | VerticalPool | HorizontalSwimlane | VerticalSwimlane;

function getRotatedEditorStyles(element: HeaderedShape, paper: dia.Paper): Partial<CSSStyleDeclaration> {
    const headerTextAttrs = element.attr('headerText') || {};

    const bbox = element.getBBox();
    const { width, height } = bbox;
    const headerSize = element.getHeaderSize();

    let x = bbox.x;
    let y = bbox.y;
    let rotateDeg = 0;
    let editorWidth = width;

    if (element.isHorizontal()) {
        const { x: bottomLeftX, y: bottomLeftY } = bbox.bottomLeft();
        x = bottomLeftX;
        y = bottomLeftY;
        rotateDeg = -90;
        editorWidth = height;
    }

    return {
        padding: '4px 8px',
        transform: `${V.matrixToTransformString(paper.matrix().translate(x, y))} rotate(${rotateDeg}deg)`,
        transformOrigin: '0 0',
        color: headerTextAttrs.fill,
        fontSize: `${headerTextAttrs.fontSize}px`,
        fontFamily: headerTextAttrs.fontFamily,
        fontWeight: headerTextAttrs.fontWeight,
        width: `${editorWidth}px`,
        minHeight: `${headerSize}px`,
    };
}

export class HorizontalPool extends shapes.bpmn2.HeaderedHorizontalPool implements AppElement {

    isResizable = true;
    labelPath = 'headerText/text';

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            shapeType: ShapeTypes.POOL,
            type: PoolShapeTypes.HORIZONTAL_POOL,
            size: DEFAULT_HORIZONTAL_POOL_SIZE,
            attrs: {
                root: {
                    highlighterSelector: 'body',
                    magnetSelector: 'body'
                },
                header: {
                    fill: '#FFFFFF'
                },
                headerText: {
                    ...defaultAttrs.shapeLabel,
                    text: 'Pool',
                    fontSize: 14
                },
            },
            padding: HORIZONTAL_POOL_PADDING,
            ...poolAttributes,
        }, super.defaults);
    }

    // Not used
    copyFrom(_element: dia.Element) {
        return this;
    }

    getShapeList() {
        return [];
    }

    getAppearanceConfig() {
        return poolAppearanceConfig;
    }

    getHaloHandles() {
        return [
            handles.ConnectAnnotation,
            handles.Link
        ];
    }

    validateConnection(targetModel?: dia.Cell) {

        // Don't allow connection to itself
        if (this === targetModel) return false;

        // Don't allow connection to the parent pool
        if (this === getPoolParent(targetModel)) return false;

        const availableShapes = [
            PoolShapeTypes.HORIZONTAL_POOL,
            PoolShapeTypes.VERTICAL_POOL,
            AnnotationShapeTypes.ANNOTATION,
            EventShapeTypes.START,
            EventShapeTypes.MESSAGE_START,
            EventShapeTypes.MESSAGE_INTERMEDIATE_CATCHING,
            EventShapeTypes.MESSAGE_INTERMEDIATE_BOUNDARY,
            EventShapeTypes.MESSAGE_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING,
            ...Object.values(ActivityShapeTypes).filter((shape) => shape !== ActivityShapeTypes.SUB_PROCESS)
        ];

        return availableShapes.includes(targetModel?.get('type'));
    }

    validateEmbedding(_parent: dia.Element, _inGraph?: boolean) {
        return false;
    }

    getLabelEditorStyles(paper: dia.Paper): Partial<CSSStyleDeclaration> {
        return getRotatedEditorStyles(this, paper);
    }

    getClosestBoundaryPoint(bbox: g.Rect, point: g.Point) {
        return bbox.pointNearestToPoint(point);
    }

    afterSwimlanesEmbedded() {
        this.setStackingOrder();
    }
}

export class VerticalPool extends shapes.bpmn2.HeaderedVerticalPool implements AppElement {
    isResizable = true;
    labelPath = 'headerText/text';

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            shapeType: ShapeTypes.POOL,
            type: PoolShapeTypes.VERTICAL_POOL,
            size: DEFAULT_VERTICAL_POOL_SIZE,
            attrs: {
                root: {
                    highlighterSelector: 'body',
                    magnetSelector: 'body'
                },
                header: {
                    fill: '#FFFFFF'
                },
                headerText: {
                    ...defaultAttrs.shapeLabel,
                    text: 'Pool',
                    fontSize: 14
                },
            },
            padding: VERTICAL_POOL_PADDING,
            ...poolAttributes,
        }, super.defaults);
    }

    // Not used
    copyFrom(_element: dia.Element) {
        return this;
    }

    getShapeList() {
        return [];
    }

    getAppearanceConfig() {
        return poolAppearanceConfig;
    }

    getHaloHandles() {
        return [
            handles.ConnectAnnotation,
            handles.Link
        ];
    }

    validateConnection(targetModel?: dia.Cell) {

        // Don't allow connection to itself
        if (this === targetModel) return false;

        // Don't allow connection to the parent pool
        if (this === getPoolParent(targetModel)) return false;

        const availableShapes = [
            PoolShapeTypes.HORIZONTAL_POOL,
            PoolShapeTypes.VERTICAL_POOL,
            AnnotationShapeTypes.ANNOTATION,
            EventShapeTypes.START,
            EventShapeTypes.MESSAGE_START,
            EventShapeTypes.MESSAGE_INTERMEDIATE_CATCHING,
            EventShapeTypes.MESSAGE_INTERMEDIATE_BOUNDARY,
            EventShapeTypes.MESSAGE_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING,
            ...Object.values(ActivityShapeTypes).filter((shape) => shape !== ActivityShapeTypes.SUB_PROCESS)
        ];

        return availableShapes.includes(targetModel?.get('type'));
    }

    validateEmbedding(_parent: dia.Element, _inGraph?: boolean) {
        return false;
    }

    getLabelEditorStyles(paper: dia.Paper): Partial<CSSStyleDeclaration> {
        return getRotatedEditorStyles(this, paper);
    }

    getClosestBoundaryPoint(bbox: g.Rect, point: g.Point) {
        return bbox.pointNearestToPoint(point);
    }

    afterSwimlanesEmbedded() {
        this.setStackingOrder();
    }
}
export class HorizontalSwimlane extends shapes.bpmn2.HorizontalSwimlane implements AppElement {

    isResizable = true;
    labelPath = 'headerText/text';
    omitDefaultHaloHandles = true;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            shapeType: ShapeTypes.SWIMLANE,
            type: PoolShapeTypes.HORIZONTAL_SWIMLANE,
            size: {
                width: SWIMLANE_HEADER_SIZE
            },
            attrs: {
                root: {
                    highlighterSelector: 'body'
                },
                header: {
                    fill: 'transparent'
                },
                headerText: {
                    ...defaultAttrs.shapeLabel,
                    text: 'Lane'
                }
            },
            ...swimlaneAttributes
        }, super.defaults);
    }

    // Not used
    copyFrom(_element: dia.Element) {
        return this;
    }

    getShapeList() {
        return [];
    }

    getAppearanceConfig() {
        return swimlaneAppearanceConfig;
    }

    getHaloHandles() {

        const pool = this.getParentCell() as HorizontalPool;

        if (!pool || pool.getSwimlanes().length === 1) return [];

        return [
            handles.RemoveHorizontalSwimlane
        ];
    }

    validateConnection(_targetModel?: dia.Cell) {
        return false;
    }

    validateEmbedding(_parent: dia.Element, _inGraph?: boolean) {
        return false;
    }

    validateUnembedding() {
        return true;
    }

    getLabelEditorStyles(paper: dia.Paper): Partial<CSSStyleDeclaration> {
        return getRotatedEditorStyles(this, paper);
    }

    // Not used
    getClosestBoundaryPoint(bbox: g.Rect, point: g.Point) {
        return bbox.pointNearestToPoint(point);
    }
}

export class VerticalSwimlane extends shapes.bpmn2.VerticalSwimlane implements AppElement {

    isResizable = true;
    labelPath = 'headerText/text';
    omitDefaultHaloHandles = true;

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            shapeType: ShapeTypes.SWIMLANE,
            type: PoolShapeTypes.VERTICAL_SWIMLANE,
            size: {
                height: SWIMLANE_HEADER_SIZE
            },
            attrs: {
                root: {
                    highlighterSelector: 'body'
                },
                header: {
                    fill: 'transparent'
                },
                headerText: {
                    ...defaultAttrs.shapeLabel,
                    text: 'Lane'
                }
            },
            ...swimlaneAttributes
        }, super.defaults);
    }

    // Not used
    copyFrom(_element: dia.Element) {
        return this;
    }

    getShapeList() {
        return [];
    }

    getAppearanceConfig() {
        return swimlaneAppearanceConfig;
    }

    getHaloHandles() {

        const pool = this.getParentCell() as VerticalPool;

        if (!pool || pool.getSwimlanes().length === 1) return [];

        return [
            handles.RemoveVerticalSwimlane
        ];
    }

    validateConnection(_targetModel?: dia.Cell) {
        return false;
    }

    validateEmbedding(_parent: dia.Element, _inGraph?: boolean) {
        return false;
    }

    validateUnembedding() {
        return true;
    }

    getLabelEditorStyles(paper: dia.Paper): Partial<CSSStyleDeclaration> {
        return getRotatedEditorStyles(this, paper);
    }

    // Not used
    getClosestBoundaryPoint(bbox: g.Rect, point: g.Point) {
        return bbox.pointNearestToPoint(point);
    }
}

declare module '@joint/plus' {
    namespace shapes {
        namespace pool {
            export {
                HorizontalPool,
                VerticalPool,
                HorizontalSwimlane,
                VerticalSwimlane
            };
        }
    }
}

Object.assign(shapes, {
    pool: {
        HorizontalPool,
        VerticalPool,
        HorizontalSwimlane,
        VerticalSwimlane
    }
});
