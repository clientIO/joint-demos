import type { dia } from '@joint/plus';
import { shapes, util, V, type g } from '@joint/plus';
import type { AppElement } from '../shapes-typing';
import { ShapeTypes } from '../shapes-typing';
import { groupAppearanceConfig, GroupShapeTypes } from './group-config';
import { defaultAttrs, labelEditorWrapperStyles } from '../shared-config';
import { AnnotationShapeTypes } from '../annotation/annotation-config';
import { handles } from '../../configs/halo-config';

class Group extends shapes.bpmn2.Group implements AppElement {

    public readonly isResizable = true;
    public readonly labelPath = 'label/text';

    defaults(): dia.Element.Attributes {
        return util.defaultsDeep({
            type: GroupShapeTypes.GROUP,
            shapeType: ShapeTypes.GROUP,
            size: {
                width: 300,
                height: 300
            },
            attrs: {
                label: {
                    ...defaultAttrs.shapeLabel,
                    text: 'Group'
                }
            }
        }, super.defaults);
    }

    copyFrom(element: dia.Element): void {
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

    getShapeList(): string[] {
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

    validateConnection(targetModel?: dia.Cell): boolean {
        return targetModel?.get('type') === AnnotationShapeTypes.ANNOTATION;
    }

    validateEmbedding(_parent: dia.Element): boolean {
        return false;
    }

    getLabelEditorStyles(paper: dia.Paper): Partial<CSSStyleDeclaration> {
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

        const borderWidth = parseFloat(labelEditorWrapperStyles.borderWidth!);

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

    getClosestBoundaryPoint(bbox: g.Rect, point: g.Point) {
        return bbox.pointNearestToPoint(point);
    }

    getMinimalSize() {
        return {
            width: 100,
            height: 30
        };
    }
}

declare module '@joint/plus' {
    namespace shapes {
        namespace group {
            export {
                Group
            };
        }
    }
}

Object.assign(shapes, {
    group: {
        Group
    }
});
