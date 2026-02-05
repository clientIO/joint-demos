import { shapes, util, V } from '@joint/plus';
import { ShapeTypes } from '../shapes-typing';
import { annotationAppearanceConfig, annotationLinkAppearanceConfig, AnnotationShapeTypes } from './annotation-config';
import { defaultAttrs, labelEditorWrapperStyles } from '../shared-config';
import { handles } from '../../configs/halo-config';
import { constructLinkTools } from '../../configs/link-tools-config';
import { getPoolParent } from '../../utils';

export class Annotation extends shapes.bpmn2.Annotation {
    
    isResizable = true;
    labelPath = 'label/text';
    
    defaults() {
        return util.defaultsDeep({
            type: AnnotationShapeTypes.ANNOTATION,
            shapeType: ShapeTypes.ANNOTATION,
            attrs: {
                label: {
                    ...defaultAttrs.shapeLabel,
                    refDy: null,
                    refY: null,
                    refY2: null,
                    refX: 6,
                    y: 'calc(h / 2)',
                    textAnchor: 'start',
                    textVerticalAnchor: 'middle',
                    text: 'Annotation'
                }
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
                border: {
                    stroke: element.attr(['border', 'stroke'])
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
        return annotationAppearanceConfig;
    }
    
    getHaloHandles() {
        return [
            handles.Link
        ];
    }
    
    validateConnection(targetModel) {
        if (getPoolParent(this) === targetModel)
            return false;
        const targetType = targetModel?.get('shapeType');
        return ![
            ShapeTypes.ANNOTATION,
            ShapeTypes.SWIMLANE
        ].includes(targetType);
    }
    
    validateEmbedding(parent) {
        return parent.get('shapeType') === ShapeTypes.SWIMLANE;
    }
    
    getLabelEditorStyles(paper) {
        const labelAttrs = this.attr(['label']) || {};
        const textWrap = labelAttrs.textWrap || { width: 0, height: 0 };
        const strokeWidth = (this.attr(['border', 'strokeWidth']) || 0);
        
        const bbox = this.getBBox();
        
        const borderWidth = parseFloat(labelEditorWrapperStyles.borderWidth);
        
        const horizontalPadding = textWrap.width / -2 - borderWidth;
        const verticalPadding = textWrap.height / -2 - borderWidth;
        
        const height = bbox.height - strokeWidth;
        const width = bbox.width - strokeWidth;
        
        const { x, y } = bbox.center();
        
        return {
            padding: `${verticalPadding}px ${horizontalPadding}px`,
            transform: `${V.matrixToTransformString(paper.matrix().translate(x, y))} translate(-50%, -50%)`,
            fontSize: `${labelAttrs.fontSize}px`,
            fontFamily: labelAttrs.fontFamily,
            fontWeight: labelAttrs.fontWeight,
            color: labelAttrs.fill,
            minHeight: `${height}px`,
            width: `${width}px`,
            alignItems: 'start',
            textAlign: 'start'
        };
    }
    
    getClosestBoundaryPoint(bbox, point) {
        return bbox.pointNearestToPoint(point);
    }
    
    getMinimalSize() {
        return {
            width: 80,
            height: 40
        };
    }
}

export class AnnotationLink extends shapes.bpmn2.AnnotationLink {
    
    defaults() {
        return util.defaultsDeep({
            shapeType: ShapeTypes.ANNOTATION,
            type: AnnotationShapeTypes.LINK
        }, super.defaults);
    }
    
    copyFrom(link) {
        this.attr(['line', 'stroke'], link.attr(['line', 'stroke']));
        this.source(link.source());
        this.target(link.target());
        this.vertices(link.vertices());
    }
    
    getShapeList() {
        return [];
    }
    
    getLinkTools() {
        return [
            constructLinkTools.Vertices(),
            constructLinkTools.SourceArrowHead(),
            constructLinkTools.TargetArrowHead(),
            ...constructLinkTools.DoubleRemove()
        ];
    }
    
    validateConnection(_) {
        return false;
    }
    
    getAppearanceConfig() {
        return annotationLinkAppearanceConfig;
    }
}

Object.assign(shapes, {
    annotation: {
        Annotation,
        AnnotationLink
    }
});
