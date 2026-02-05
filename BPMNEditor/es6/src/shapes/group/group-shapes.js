import { shapes, util, V } from '@joint/plus';
import { ShapeTypes } from '../shapes-typing';
import { groupAppearanceConfig, GroupShapeTypes } from './group-config';
import { defaultAttrs, labelEditorWrapperStyles } from '../shared-config';
import { AnnotationShapeTypes } from '../annotation/annotation-config';
import { handles } from '../../configs/halo-config';

class Group extends shapes.bpmn2.Group {
    constructor() {
        super(...arguments);
        
        this.isResizable = true;
        this.labelPath = 'label/text';
    }
    
    defaults() {
        return util.defaultsDeep({
            type: GroupShapeTypes.GROUP,
            shapeType: ShapeTypes.GROUP,
            size: {
                width: 300,
                height: 300
            },
            attrs: {
                label: Object.assign(Object.assign({}, defaultAttrs.shapeLabel), { text: 'Group' })
            }
        }, super.defaults);
    }
    
    copyFrom(element) {
        const { x, y, width, height } = element.getBBox();
        const label = element.attr(['label', 'text']) || '';
        
        this.prop({
            position: { x, y },
            size: { width, height },
            attrs: {
                body: {
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
    
    getShapeList() {
        return [];
    }
    
    getAppearanceConfig() {
        return groupAppearanceConfig;
    }
    
    getHaloHandles() {
        return [
            handles.ConnectAnnotation
        ];
    }
    
    validateConnection(targetModel) {
        return (targetModel === null || targetModel === void 0 ? void 0 : targetModel.get('type')) === AnnotationShapeTypes.ANNOTATION;
    }
    
    validateEmbedding(_parent) {
        return false;
    }
    
    getLabelEditorStyles(paper) {
        const labelAttrs = this.attr(['label']) || {};
        const textWrap = labelAttrs.textWrap || { width: 0, height: 0 };
        const rx = this.attr(['body', 'rx']) || 0;
        const strokeWidth = this.attr(['body', 'strokeWidth']) || 0;
        
        const { x, y, width } = this.getBBox().moveAndExpand({
            x: -strokeWidth / 2,
            y: -strokeWidth / 2,
            width: strokeWidth,
            height: strokeWidth
        });
        
        const borderWidth = parseFloat(labelEditorWrapperStyles.borderWidth);
        
        return {
            padding: `${textWrap.height / -2 - borderWidth}px ${textWrap.width / -2}px`,
            transform: V.matrixToTransformString(paper.matrix().translate(x, y)),
            transformOrigin: '0 0',
            fontSize: `${labelAttrs.fontSize}px`,
            fontFamily: labelAttrs.fontFamily,
            fontWeight: labelAttrs.fontWeight,
            color: labelAttrs.fill,
            width: `${width}px`,
            borderTopLeftRadius: `${rx}px`,
            borderTopRightRadius: `${rx}px`,
            justifyContent: 'start'
        };
    }
    
    getClosestBoundaryPoint(bbox, point) {
        return bbox.pointNearestToPoint(point);
    }
    
    getMinimalSize() {
        return {
            width: 100,
            height: 30
        };
    }
}

Object.assign(shapes, {
    group: {
        Group
    }
});
