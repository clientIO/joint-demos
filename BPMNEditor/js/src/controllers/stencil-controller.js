import Controller from '../controller';
import { shapes } from '@joint/plus';
import { snapToParentPath, isBoundaryEvent, setStencilEvent } from '../utils';
import { eventBus, EventBusEvents } from '../event-bus';
import { IntermediateBoundary } from '../shapes/event/event-shapes';
import { onSwimlaneDragStart, onSwimlaneDrag, onSwimlaneDragEnd, onSwimlaneDrop } from '../events/swimlanes';
import { onElementDragStart, onElementDrag, onElementDragEnd, onElementSwimlaneDrop } from '../events/elements';
import { onPoolDragStart, onPoolDrag, onPoolDrop, onPoolDragEnd } from '../events/pools';

export default class StencilController extends Controller {
    startListening() {
        const { stencil } = this.context;
        
        this.listenTo(stencil, {
            'element:dragstart': (context, cloneView, evt, dropArea) => {
                const { paper, selection } = context;
                const { model } = cloneView;
                const { x, y } = dropArea.center();
                
                selection.collection.reset([]);
                setStencilEvent(evt, true);
                
                if (shapes.bpmn2.Swimlane.isSwimlane(model)) {
                    onSwimlaneDragStart(paper, cloneView, evt, x, y);
                }
                else if (shapes.bpmn2.CompositePool.isPool(model)) {
                    onPoolDragStart(paper, cloneView, evt, x, y);
                }
                else {
                    onElementDragStart(paper, cloneView, evt, x, y);
                }
            },
            'element:drag': (context, cloneView, evt, dropArea) => {
                const { paper } = context;
                const { model } = cloneView;
                const { x, y } = dropArea.center();
                
                if (shapes.bpmn2.Swimlane.isSwimlane(model)) {
                    onSwimlaneDrag(paper, cloneView, evt, x, y);
                }
                else if (shapes.bpmn2.CompositePool.isPool(model)) {
                    onPoolDrag(paper, cloneView, evt, x, y);
                }
                else {
                    onElementDrag(paper, cloneView, evt, dropArea.x, dropArea.y);
                }
            },
            'element:dragend': (context, cloneView, evt, dropArea) => {
                const { paper } = context;
                const { model } = cloneView;
                const { x, y } = dropArea.center();
                
                if (shapes.bpmn2.Swimlane.isSwimlane(model)) {
                    onSwimlaneDragEnd(paper, cloneView, evt, x, y);
                }
                else if (shapes.bpmn2.CompositePool.isPool(model)) {
                    onPoolDragEnd(paper, cloneView, evt, x, y);
                }
                else {
                    onElementDragEnd(paper, cloneView, evt, x, y);
                }
            },
            'element:drop': (context, elementView, evt, x, y) => {
                const { paper, selection } = context;
                let { model } = elementView;
                
                let selectedModel;
                
                if (shapes.bpmn2.Swimlane.isSwimlane(model)) {
                    selectedModel = onSwimlaneDrop(paper, elementView, evt, x, y);
                }
                else if (shapes.bpmn2.CompositePool.isPool(model)) {
                    onPoolDrop(paper, elementView, evt, x, y);
                    selectedModel = model;
                }
                else {
                    selectedModel = onElementDrop(context, elementView, evt, x, y);
                }
                
                if (selectedModel) {
                    // Select the dropped element
                    selection.collection.reset([selectedModel]);
                }
            }
        });
    }
}

function onElementDrop(context, elementView, evt, x, y) {
    const { paper } = context;
    
    let model = elementView.model;
    
    const parentView = elementView.model.getParentCell()?.findView(paper);
    if (!parentView)
        return model;
    
    if (!isBoundaryEvent(elementView, parentView)) {
        onElementSwimlaneDrop(paper, elementView, evt, x, y);
        return model;
    }
    
    const snappedPoint = snapToParentPath(elementView, parentView, x, y);
    
    elementView.model.position(snappedPoint.x, snappedPoint.y);
    
    model = new IntermediateBoundary({ id: model.id });
    eventBus.trigger(EventBusEvents.GRAPH_REPLACE_CELL, elementView.model, model);
    
    return model;
}
