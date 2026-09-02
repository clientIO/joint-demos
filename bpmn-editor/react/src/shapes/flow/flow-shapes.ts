import { shapes, util, V } from '@joint/plus';
import { ShapeTypes } from '../shapes-typing';
import { flowAppearanceConfig, flowIconClasses, FlowLabels, FlowShapeTypes } from './flow-config';
import { defaultAttrs } from '../shared-config';
import { AnnotationShapeTypes } from '../annotation/annotation-config';
import { constructLinkTools } from '../../configs/link-tools-config';

import type { dia } from '@joint/plus';
import type { BpmnLink, LinkContextMenuAction } from '../shapes-typing';

abstract class Flow extends shapes.bpmn2.Flow implements BpmnLink {

    // The shape name (set by each concrete subclass). Typing the constructor
    // makes the static reachable from instance methods (\`defaults()\`).
    declare static label: string;
    declare ['constructor']: typeof Flow;

    defaultLabel = {
        attrs: {
            body: defaultAttrs.labelBody,
            label: defaultAttrs.linkLabel
        },
        markup: [
            {
                tagName: 'rect',
                selector: 'body'
            },
            {
                tagName: 'text',
                selector: 'label'
            }
        ]
    };

    defaults() {
        const attributes: dia.Element.Attributes = {
            shapeType: ShapeTypes.FLOW,
            attrs: {
                root: {
                    tabindex: 0,
                    role: 'graphics-symbol',
                    ariaLabel: this.constructor.label
                },
                line: {
                    stroke: 'var(--bpmn-palette-ink)'
                }
            }
        };
        return util.defaultsDeep(attributes, super.defaults);
    }

    constructor(...args: ConstructorParameters<typeof shapes.bpmn2.Flow>) {
        super(...args);
        this.router('rightAngle', { useVertices: true });
    }

    copyFrom(link: dia.Link): void {
        this.attr(['line', 'stroke'], link.attr(['line', 'stroke']));
        this.labels(link.labels());
        this.source(link.source());
        this.target(link.target());
        this.vertices(link.vertices());
    }

    getShapeList(): string[] {
        const shapes = [
            FlowShapeTypes.SEQUENCE,
            FlowShapeTypes.DEFAULT,
            FlowShapeTypes.CONDITIONAL
        ];

        return shapes.filter((shape) => shape !== this.get('type'));
    }

    getContextMenuActions(): LinkContextMenuAction[] {
        return ['edit-label', 'add-comment'];
    }

    getLinkTools() {
        return [
            constructLinkTools.Vertices(),
            constructLinkTools.SourceArrowHead(),
            constructLinkTools.TargetArrowHead(),
            ...constructLinkTools.DoubleRemove()
        ];
    }

    validateConnection(targetModel?: dia.Cell): boolean {
        return targetModel?.get('type') === AnnotationShapeTypes.ANNOTATION;
    }

    getAppearanceConfig() {
        return flowAppearanceConfig;
    }

    getLabelEditorStyles(paper: dia.Paper) {
        const labelPadding = {
            vertical: 5,
            horizontal: 3
        };

        const textWrap = defaultAttrs.linkLabel.textWrap;

        // Compensate for current paper zoom level so the editor width stays visually consistent.
        const { a: scaleX = 1 } = paper.matrix(); // `a` corresponds to horizontal scale factor
        const scale = Math.abs(scaleX) || 1;

        const width = (textWrap.width + labelPadding.vertical * 2) / scale;

        const clientWidth = paper.localToClientRect(0, 0, width, 0).width;

        const view = this.findView(paper) as dia.LinkView;
        const { x: cx, y: cy } = view.getPointAtRatio(0.5);

        const currentLabel = this.labels()[0]?.attrs || {};

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const labelAttrs: any = util.defaultsDeep({}, currentLabel, this.defaultLabel.attrs);

        return {
            padding: `${labelPadding.vertical}px ${labelPadding.horizontal}px`,
            transform: `${V.matrixToTransformString(paper.matrix().translate(cx, cy))} translate(-50%, -50%)`,
            transformOrigin: '0 0',
            backgroundColor: labelAttrs.body.fill,
            fontSize: `${labelAttrs.label.fontSize}px`,
            fontFamily: labelAttrs.label.fontFamily,
            fontWeight: labelAttrs.label.fontWeight,
            color: labelAttrs.label.fill,
            width: `${clientWidth}px`,
        };
    }
}

export class Sequence extends Flow {

    static label = FlowLabels['flow.Sequence'];
    static icon = flowIconClasses.SEQUENCE;

    defaults() {
        const attributes: dia.Element.Attributes = {
            type: FlowShapeTypes.SEQUENCE,
            attrs: {
                line: {
                    flowType: 'sequence'
                }
            }
        };
        return util.defaultsDeep(attributes, super.defaults());
    }
}

export class Default extends Flow {

    static label = FlowLabels['flow.Default'];
    static icon = flowIconClasses.DEFAULT;

    defaults() {
        const attributes: dia.Element.Attributes = {
            type: FlowShapeTypes.DEFAULT,
            attrs: {
                line: {
                    flowType: 'default'
                }
            }
        };
        return util.defaultsDeep(attributes, super.defaults());
    }
}

export class Conditional extends Flow {

    static label = FlowLabels['flow.Conditional'];
    static icon = flowIconClasses.CONDITIONAL;

    defaults() {
        const attributes: dia.Element.Attributes = {
            type: FlowShapeTypes.CONDITIONAL,
            attrs: {
                line: {
                    flowType: 'conditional'
                }
            }
        };
        return util.defaultsDeep(attributes, super.defaults());
    }
}

export class Message extends Flow {

    static label = FlowLabels['flow.Message'];

    defaults() {
        const attributes: dia.Element.Attributes = {
            type: FlowShapeTypes.MESSAGE,
            attrs: {
                line: {
                    flowType: 'message'
                }
            }
        };
        return util.defaultsDeep(attributes, super.defaults());
    }

    getShapeList(): string[] {
        return [];
    }
}

export const flow = {
    Sequence, Default, Conditional, Message
};

