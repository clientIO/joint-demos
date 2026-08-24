import { type g, shapes, util, V } from '@joint/plus';
import { ShapeTypes } from '../shapes-typing';
import { annotationAppearanceConfig, annotationLinkAppearanceConfig, AnnotationLabels, AnnotationShapeTypes } from './annotation-config';
import { defaultAttrs, labelEditorWrapperStyles } from '../shared-config';
import { handles } from '../../configs/halo-config';
import { constructLinkTools } from '../../configs/link-tools-config';
import { getPoolParent, isSwimlane } from '../../utils';

import type { dia } from '@joint/plus';
import type { AppElement, AppLink, LinkContextMenuAction } from '../shapes-typing';

export class Annotation extends shapes.bpmn2.Annotation implements AppElement {

    static label = AnnotationLabels['annotation.Annotation'];

    public readonly isResizable = true;
    public readonly labelPath = 'label/text';

    defaults(): dia.Element.Attributes {
        const attributes: dia.Element.Attributes = {
            type: AnnotationShapeTypes.ANNOTATION,
            shapeType: ShapeTypes.ANNOTATION,
            attrs: {
                root: {
                    tabindex: 0,
                    role: 'graphics-symbol',
                    ariaLabel: Annotation.label
                },
                border: {
                    stroke: 'var(--bpmn-palette-outline)'
                },
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
        };
        return util.defaultsDeep(attributes, super.defaults);
    }

    copyFrom(element: dia.Element): void {
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

    getShapeList(): string[] {
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

    validateConnection(targetModel?: dia.Cell): boolean {
        if (getPoolParent(this) === targetModel) return false;
        const targetType = targetModel?.get('shapeType');
        return ![
            ShapeTypes.ANNOTATION,
            ShapeTypes.SWIMLANE
        ].includes(targetType);
    }

    validateEmbedding(parent: dia.Element): boolean {
        return isSwimlane(parent);
    }

    getLabelEditorStyles(paper: dia.Paper): Partial<CSSStyleDeclaration> {
        const labelAttrs = this.attr(['label']) || {};
        const textWrap = labelAttrs.textWrap || { width: 0, height: 0 };
        const strokeWidth = (this.attr(['border', 'strokeWidth']) || 0);

        const bbox = this.getBBox();

        const borderWidth = parseFloat(labelEditorWrapperStyles.borderWidth!);

        const horizontalPadding = textWrap.width / -2 - borderWidth;
        const verticalPadding = textWrap.height / -2 - borderWidth;

        const height = bbox.height - strokeWidth;
        const width = bbox.width - strokeWidth;

        // The editor covers the whole shape; the label starts `refX` from the
        // left edge — indent the editor text the same way (minus the border).
        const labelOffset = (this.attr(['label', 'refX']) ?? 0) - borderWidth;
        const { x } = bbox;
        const y = bbox.center().y;

        return {
            padding: `${verticalPadding}px ${horizontalPadding}px ${verticalPadding}px ${labelOffset}px`,
            // The editor is anchored to the left edge — the paper scale must
            // apply from the top-left corner, not the default center.
            transformOrigin: '0 0',
            transform: `${V.matrixToTransformString(paper.matrix().translate(x, y))} translate(0, -50%)`,
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

    getClosestBoundaryPoint(bbox: g.Rect, point: g.Point) {
        return bbox.pointNearestToPoint(point);
    }

    getMinimalSize() {
        return {
            width: 80,
            height: 40
        };
    }
}

export class AnnotationLink extends shapes.bpmn2.AnnotationLink implements AppLink {

    static label = AnnotationLabels['annotation.AnnotationLink'];

    defaults(): dia.Element.Attributes {
        const attributes: dia.Element.Attributes = {
            shapeType: ShapeTypes.ANNOTATION,
            type: AnnotationShapeTypes.LINK,
            attrs: {
                root: {
                    tabindex: 0,
                    role: 'graphics-symbol',
                    ariaLabel: AnnotationLink.label
                }
            }
        };
        return util.defaultsDeep(attributes, super.defaults);
    }

    copyFrom(link: dia.Link): void {
        this.attr(['line', 'stroke'], link.attr(['line', 'stroke']));
        this.source(link.source());
        this.target(link.target());
        this.vertices(link.vertices());
    }

    getContextMenuActions(): LinkContextMenuAction[] {
        // Annotation links have no label and can't be commented on
        return [];
    }

    getShapeList(): string[] {
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

    validateConnection(_?: dia.Cell): boolean {
        return false;
    }

    getAppearanceConfig() {
        return annotationLinkAppearanceConfig;
    }
}

export const annotation = {
    Annotation, AnnotationLink
};

