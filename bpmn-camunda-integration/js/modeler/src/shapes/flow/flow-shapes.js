import { shapes, util, V } from '@joint/plus';
import { ShapeTypes } from '../shapes-typing';
import { flowAppearanceConfig, flowIconClasses, FlowLabels, FlowShapeTypes } from './flow-config';
import { defaultAttrs } from '../shared-config';
import { AnnotationShapeTypes } from '../annotation/annotation-config';
import { constructLinkTools } from '../../configs/link-tools-config';

class Flow extends shapes.bpmn2.Flow {
    
    defaults() {
        return util.defaultsDeep({
            shapeType: ShapeTypes.FLOW
        }, super.defaults);
    }
    
    constructor(...args) {
        super(...args);
        
        this.defaultLabel = {
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
        this.router('rightAngle', { useVertices: true });
    }
    
    copyFrom(link) {
        this.attr(['line', 'stroke'], link.attr(['line', 'stroke']));
        this.labels(link.labels());
        this.source(link.source());
        this.target(link.target());
        this.vertices(link.vertices());
    }
    
    getShapeList() {
        const shapes = [
            FlowShapeTypes.SEQUENCE,
            FlowShapeTypes.DEFAULT,
            FlowShapeTypes.CONDITIONAL
        ];
        
        return shapes.filter((shape) => shape !== this.get('type'));
    }
    
    getLinkTools() {
        return [
            constructLinkTools.Vertices(),
            constructLinkTools.SourceArrowHead(),
            constructLinkTools.TargetArrowHead(),
            ...constructLinkTools.DoubleRemove()
        ];
    }
    
    validateConnection(targetModel) {
        return (targetModel === null || targetModel === void 0 ? void 0 : targetModel.get('type')) === AnnotationShapeTypes.ANNOTATION;
    }
    
    getAppearanceConfig() {
        return flowAppearanceConfig;
    }
    
    getLabelEditorStyles(paper) {
        var _a;
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
        
        const view = this.findView(paper);
        const { x: cx, y: cy } = view.getPointAtRatio(0.5);
        
        const currentLabel = ((_a = this.labels()[0]) === null || _a === void 0 ? void 0 : _a.attrs) || {};
        const labelAttrs = util.defaultsDeep({}, currentLabel, this.defaultLabel.attrs);
        
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

    defaults() {
        return util.defaultsDeep({
            type: FlowShapeTypes.SEQUENCE,
            conditionExpression: '',
            attrs: {
                line: {
                    flowType: 'sequence'
                }
            }
        }, super.defaults());
    }

    getContentConfig() {
        return {
            groups: {
                condition: {
                    label: 'Condition',
                    index: 1
                }
            },
            inputs: {
                conditionExpression: {
                    type: 'textarea',
                    label: 'Condition Expression (FEEL)',
                    group: 'condition',
                    index: 1
                }
            }
        };
    }
}

Sequence.label = FlowLabels['flow.Sequence'];
Sequence.icon = flowIconClasses.SEQUENCE;

export class Default extends Flow {
    
    defaults() {
        return util.defaultsDeep({
            type: FlowShapeTypes.DEFAULT,
            attrs: {
                line: {
                    flowType: 'default'
                }
            }
        }, super.defaults());
    }
}

Default.label = FlowLabels['flow.Default'];
Default.icon = flowIconClasses.DEFAULT;

export class Conditional extends Flow {

    defaults() {
        return util.defaultsDeep({
            type: FlowShapeTypes.CONDITIONAL,
            conditionExpression: '',
            attrs: {
                line: {
                    flowType: 'conditional'
                }
            }
        }, super.defaults());
    }

    getContentConfig() {
        return {
            groups: {
                condition: {
                    label: 'Condition',
                    index: 1
                }
            },
            inputs: {
                conditionExpression: {
                    type: 'textarea',
                    label: 'Condition Expression (FEEL)',
                    group: 'condition',
                    index: 1
                }
            }
        };
    }
}

Conditional.label = FlowLabels['flow.Conditional'];
Conditional.icon = flowIconClasses.CONDITIONAL;

export class Message extends Flow {
    
    defaults() {
        return util.defaultsDeep({
            type: FlowShapeTypes.MESSAGE,
            attrs: {
                line: {
                    flowType: 'message'
                }
            }
        }, super.defaults());
    }
    
    getShapeList() {
        return [];
    }
}

Message.label = FlowLabels['flow.Message'];

Object.assign(shapes, {
    flow: {
        Sequence,
        Default,
        Conditional,
        Message
    }
});
