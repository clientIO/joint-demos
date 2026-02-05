import { mvc, shapes } from '@joint/plus';

import { onSwimlaneDragStart, onSwimlaneDrag, onSwimlaneDragEnd, onSwimlaneDrop } from './swimlanes';
import { onPhaseDragStart, onPhaseDrag, onPhaseDragEnd, onPhaseDrop } from './phases';
import { onElementDragStart, onElementDrag, onElementDragEnd, onElementDrop } from './elements';
import { onPoolDragStart, onPoolDrag, onPoolDragEnd, onPoolDrop } from './pools';
import { setStencilEvent } from '../utils';

export class BPMNController extends mvc.Listener {
    
    startListening() {
        
        const [{ paper, stencil }] = this.callbackArguments;
        
        this.listenTo(stencil, {
            'element:dragstart': (_app, cloneView, evt, x, y) => {
                setStencilEvent(evt, true);
                const clone = cloneView.model;
                if (shapes.bpmn2.CompositePool.isPool(clone)) {
                    onPoolDragStart(paper, cloneView, evt, x, y);
                }
                else if (shapes.bpmn2.Swimlane.isSwimlane(clone)) {
                    onSwimlaneDragStart(paper, cloneView, evt, x, y);
                }
                else if (shapes.bpmn2.Phase.isPhase(clone)) {
                    onPhaseDragStart(paper, cloneView, evt, x, y);
                }
                else {
                    onElementDragStart(paper, cloneView, evt, x, y);
                }
            },
            'element:drag': (_app, cloneView, evt, cloneArea, _validDropTarget) => {
                const { x, y } = cloneArea.center();
                const clone = cloneView.model;
                if (shapes.bpmn2.CompositePool.isPool(clone)) {
                    onPoolDrag(paper, cloneView, evt, x, y);
                }
                else if (shapes.bpmn2.Swimlane.isSwimlane(clone)) {
                    onSwimlaneDrag(paper, cloneView, evt, x, y);
                }
                else if (shapes.bpmn2.Phase.isPhase(clone)) {
                    onPhaseDrag(paper, cloneView, evt, x, y);
                }
                else {
                    onElementDrag(paper, cloneView, evt, x, y);
                }
            },
            'element:dragend': (_app, cloneView, evt, cloneArea, _validDropTarget) => {
                const { x, y } = cloneArea.center();
                const clone = cloneView.model;
                if (shapes.bpmn2.CompositePool.isPool(clone)) {
                    onPoolDragEnd(paper, cloneView, evt, x, y);
                }
                else if (shapes.bpmn2.Swimlane.isSwimlane(clone)) {
                    onSwimlaneDragEnd(paper, cloneView, evt, x, y);
                }
                else if (shapes.bpmn2.Phase.isPhase(clone)) {
                    onPhaseDragEnd(paper, cloneView, evt, x, y);
                }
                else {
                    onElementDragEnd(paper, cloneView, evt, x, y);
                }
            },
            'element:drop': (_app, childView, evt, x, y) => {
                const child = childView.model;
                if (shapes.bpmn2.CompositePool.isPool(child)) {
                    onPoolDrop(paper, childView, evt, x, y);
                }
                else if (shapes.bpmn2.Swimlane.isSwimlane(child)) {
                    onSwimlaneDrop(paper, childView, evt, x, y);
                }
                else if (shapes.bpmn2.Phase.isPhase(child)) {
                    onPhaseDrop(paper, childView, evt, x, y);
                }
                else {
                    onElementDrop(paper, childView, evt, x, y);
                }
            }
        });
        
        this.listenTo(paper, {
            'element:pointerdown': (_app, elementView, evt, x, y) => {
                setStencilEvent(evt, false);
                const element = elementView.model;
                if (shapes.bpmn2.CompositePool.isPool(element)) {
                    onPoolDragStart(paper, elementView, evt, x, y);
                }
                else if (shapes.bpmn2.Swimlane.isSwimlane(element)) {
                    onSwimlaneDragStart(paper, elementView, evt, x, y);
                }
                else if (shapes.bpmn2.Phase.isPhase(element)) {
                    onPhaseDragStart(paper, elementView, evt, x, y);
                }
                else {
                    onElementDragStart(paper, elementView, evt, x, y);
                }
            },
            'element:pointermove': (_app, elementView, evt, x, y) => {
                const element = elementView.model;
                if (shapes.bpmn2.CompositePool.isPool(element)) {
                    onPoolDrag(paper, elementView, evt, x, y);
                }
                else if (shapes.bpmn2.Swimlane.isSwimlane(element)) {
                    onSwimlaneDrag(paper, elementView, evt, x, y);
                }
                else if (shapes.bpmn2.Phase.isPhase(element)) {
                    onPhaseDrag(paper, elementView, evt, x, y);
                }
                else {
                    onElementDrag(paper, elementView, evt, x, y);
                }
            },
            'element:pointerup': (_app, elementView, evt, x, y) => {
                const element = elementView.model;
                if (shapes.bpmn2.CompositePool.isPool(element)) {
                    onPoolDragEnd(paper, elementView, evt, x, y);
                }
                else if (shapes.bpmn2.Swimlane.isSwimlane(element)) {
                    onSwimlaneDragEnd(paper, elementView, evt, x, y);
                }
                else if (shapes.bpmn2.Phase.isPhase(element)) {
                    onPhaseDragEnd(paper, elementView, evt, x, y);
                }
                else {
                    onElementDragEnd(paper, elementView, evt, x, y);
                }
            }
        });
    }
}
