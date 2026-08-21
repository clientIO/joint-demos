import { dia, shapes } from '@joint/plus';
import { ShapeTypes, type AppElement, type AppShape } from '../shapes/shapes-typing';
import { BPMNLinkView } from '../shapes/placeholder/placeholder-shapes';
import { LabelElementView } from '../shapes/shape-view';
import { canElementExistOutsidePool, getBoundaryPoint } from '../utils';
import { MAIN_COLOR } from '../configs/theme';
import { graph } from './core';

import type { g } from '@joint/plus';

// The highlighting config is passed via the dedicated `<Paper highlighting>` prop.
export const HIGHLIGHTING: dia.Paper.Options['highlighting'] = {
    [dia.CellView.Highlighting.CONNECTING]: {
        name: 'stroke',
        options: {
            padding: 0,
            attrs: {
                stroke: MAIN_COLOR,
                strokeWidth: 3
            }
        }
    },
    // Handled separately in ViewController
    [dia.CellView.Highlighting.EMBEDDING]: false
};

// Native `dia.Paper` options passed through the `<Paper options>` escape
// hatch (raw JointJS signatures).
// Passed via the dedicated `<Paper interactive>` prop — the react Paper calls
// `paper.setInteractivity()` with this value on every update, which would
// clobber an `interactive` set through the `options` escape hatch.
export const bpmnInteractivity = ({ model }: { model: dia.Cell }): dia.CellView.InteractivityOptions => {
    // Prevent swimlane move to pool/show ghost
    const isSwimlane = shapes.bpmn2.Swimlane.isSwimlane(model);

    let stopDelegation = true;

    if (isSwimlane) {
        const pool = model.getParentCell() as shapes.bpmn2.CompositePool;
        stopDelegation = pool.getSwimlanes().length > 1;
    }

    return {
        stopDelegation,
        labelMove: false
    };
};

export const PAPER_NATIVE_OPTIONS: Partial<dia.Paper.Options> = {
    width: 2000,
    height: 2000,
    drawGrid: true,
    background: { color: '#FDFDFD' },
    findParentBy: (elementView: dia.ElementView, evt: dia.Event) => {
        const parentView = elementView.getTargetParentView(evt);
        // Enable easier snapping for boundary elements by bbox
        const useBBox = !parentView || (parentView && !shapes.bpmn2.Swimlane.isSwimlane(parentView.model));
        const searchBy = useBBox ? 'bbox' : 'center';

        return graph.findElementsUnderElement(elementView.model, { searchBy });
    },
    defaultAnchor: (endView: dia.ElementView, _endMagnet: SVGElement, anchorReference: g.Point | SVGElement, _args: object) => {
        let reference = anchorReference;

        if (reference instanceof SVGElement) {
            const refBBox = reference.getBoundingClientRect();
            const cx = refBBox.x + refBBox.width / 2;
            const cy = refBBox.y + refBBox.height / 2;

            reference = endView.paper!.clientToLocalPoint({ x: cx, y: cy });
        }

        const bbox = endView.model.getBBox();
        const closestSide = bbox.sideNearestToPoint(reference);

        switch (closestSide) {
            case 'top':
                return bbox.topMiddle();
            case 'right':
                return bbox.rightMiddle();
            case 'bottom':
                return bbox.bottomMiddle();
            case 'left':
                return bbox.leftMiddle();
        }
    },
    connectionStrategy: function(end, view, _, coords) {

        const { model } = view;

        if (model.isElement()) {
            const { x, y } = getBoundaryPoint(view.model as AppElement, coords);

            end.anchor = {
                name: 'topLeft',
                args: {
                    dx: x,
                    dy: y
                }
            };
        } else {
            end.anchor = {
                name: 'connectionLength',
                args: {
                    length: (view as dia.LinkView).getClosestPointLength(coords)
                }
            };
        }

        return end;
    },
    elementView: LabelElementView as typeof dia.ElementView,
    linkView: BPMNLinkView as typeof dia.LinkView,
    validateConnection: (sourceView, _, targetView) => {
        const source = sourceView.model;
        const target = targetView.model;

        return (source as AppShape).validateConnection(target);
    },
    allowLink: (cellView) => {
        // Link has source and target elements
        return !!(cellView.model.source().id) && !!(cellView.model.target().id);
    },
    validateEmbedding: (childView, parentView) => {
        const child = childView.model as AppElement;

        return child.validateEmbedding(parentView.model, childView?.paper?.model === graph);
    },
    validateUnembedding: (childView) => {
        const isPoolPresent = graph.getElements().some(element => element.get('shapeType') === ShapeTypes.POOL);

        const child = childView.model as AppElement;

        // If there is a pool present, only allow unembedding of elements that are valid outside of pools
        if (isPoolPresent && !canElementExistOutsidePool(child) && !shapes.bpmn2.Swimlane.isSwimlane(child)) return false;

        return !(child.validateUnembedding) || child.validateUnembedding();
    }
};
