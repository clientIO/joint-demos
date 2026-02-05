import { shapes, util, V } from '@joint/plus';
import { ShapeTypes } from '../shapes-typing';
import { PoolShapeTypes, DEFAULT_HORIZONTAL_POOL_SIZE, poolAttributes, swimlaneAttributes, poolAppearanceConfig, swimlaneAppearanceConfig, HORIZONTAL_POOL_PADDING, VERTICAL_POOL_PADDING, SWIMLANE_HEADER_SIZE, DEFAULT_VERTICAL_POOL_SIZE } from './pool-config';
import { handles } from '../../configs/halo-config';
import { defaultAttrs } from '../shared-config';
import { ActivityShapeTypes } from '../activity/activity-config';
import { AnnotationShapeTypes } from '../annotation/annotation-config';
import { getPoolParent } from '../../utils';
import { EventShapeTypes } from '../event/event-config';

function getRotatedEditorStyles(element, paper) {
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

export class HorizontalPool extends shapes.bpmn2.HeaderedHorizontalPool {
    
    isResizable = true;
    labelPath = 'headerText/text';
    
    defaults() {
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
    copyFrom(_element) {
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
    
    validateConnection(targetModel) {
        
        // Don't allow connection to itself
        if (this === targetModel)
            return false;
        
        // Don't allow connection to the parent pool
        if (this === getPoolParent(targetModel))
            return false;
        
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
    
    validateEmbedding(_parent, _inGraph) {
        return false;
    }
    
    getLabelEditorStyles(paper) {
        return getRotatedEditorStyles(this, paper);
    }
    
    getClosestBoundaryPoint(bbox, point) {
        return bbox.pointNearestToPoint(point);
    }
    
    afterSwimlanesEmbedded() {
        this.setStackingOrder();
    }
}

export class VerticalPool extends shapes.bpmn2.HeaderedVerticalPool {
    isResizable = true;
    labelPath = 'headerText/text';
    
    defaults() {
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
    copyFrom(_element) {
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
    
    validateConnection(targetModel) {
        
        // Don't allow connection to itself
        if (this === targetModel)
            return false;
        
        // Don't allow connection to the parent pool
        if (this === getPoolParent(targetModel))
            return false;
        
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
    
    validateEmbedding(_parent, _inGraph) {
        return false;
    }
    
    getLabelEditorStyles(paper) {
        return getRotatedEditorStyles(this, paper);
    }
    
    getClosestBoundaryPoint(bbox, point) {
        return bbox.pointNearestToPoint(point);
    }
    
    afterSwimlanesEmbedded() {
        this.setStackingOrder();
    }
}
export class HorizontalSwimlane extends shapes.bpmn2.HorizontalSwimlane {
    
    isResizable = true;
    labelPath = 'headerText/text';
    omitDefaultHaloHandles = true;
    
    defaults() {
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
    copyFrom(_element) {
        return this;
    }
    
    getShapeList() {
        return [];
    }
    
    getAppearanceConfig() {
        return swimlaneAppearanceConfig;
    }
    
    getHaloHandles() {
        
        const pool = this.getParentCell();
        
        if (!pool || pool.getSwimlanes().length === 1)
            return [];
        
        return [
            handles.RemoveHorizontalSwimlane
        ];
    }
    
    validateConnection(_targetModel) {
        return false;
    }
    
    validateEmbedding(_parent, _inGraph) {
        return false;
    }
    
    validateUnembedding() {
        return true;
    }
    
    getLabelEditorStyles(paper) {
        return getRotatedEditorStyles(this, paper);
    }
    
    // Not used
    getClosestBoundaryPoint(bbox, point) {
        return bbox.pointNearestToPoint(point);
    }
}

export class VerticalSwimlane extends shapes.bpmn2.VerticalSwimlane {
    
    isResizable = true;
    labelPath = 'headerText/text';
    omitDefaultHaloHandles = true;
    
    defaults() {
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
    copyFrom(_element) {
        return this;
    }
    
    getShapeList() {
        return [];
    }
    
    getAppearanceConfig() {
        return swimlaneAppearanceConfig;
    }
    
    getHaloHandles() {
        
        const pool = this.getParentCell();
        
        if (!pool || pool.getSwimlanes().length === 1)
            return [];
        
        return [
            handles.RemoveVerticalSwimlane
        ];
    }
    
    validateConnection(_targetModel) {
        return false;
    }
    
    validateEmbedding(_parent, _inGraph) {
        return false;
    }
    
    validateUnembedding() {
        return true;
    }
    
    getLabelEditorStyles(paper) {
        return getRotatedEditorStyles(this, paper);
    }
    
    // Not used
    getClosestBoundaryPoint(bbox, point) {
        return bbox.pointNearestToPoint(point);
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
