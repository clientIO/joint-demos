import { dia, mvc } from '@joint/plus';
// Diagram
import { SystemButton } from '../diagram/models';
import { Effect, triggerEffect, triggerEffectRemoval } from '../diagram/effects';

export function showOrderPreviewOnNextInteraction(ctx) {
    const { paper, graph, diagramData } = ctx;
    const listener = new mvc.Listener();
    listener.listenTo(paper, {
        'element:pointermove': (elementView, evt, x, _y) => {
            const data = evt.data;
            const graph = paper.model;
            const element = elementView.model;
            
            let previewEl = data.preview;
            if (!previewEl) {
                
                // Find the parent of the element
                const [parent, ...otherParents] = graph.getNeighbors(element, { inbound: true });
                if (!parent || otherParents.length > 0) {
                    listener.stopListening();
                    return;
                }
                
                // Find all siblings of the element
                const siblings = graph.getNeighbors(parent, { outbound: true })
                    .filter(sibling => sibling !== element)
                    .filter(sibling => !SystemButton.isButton(sibling));
                if (siblings.length === 0) {
                    listener.stopListening();
                    return;
                }
                
                siblings.forEach(sibling => {
                    triggerEffect(paper, sibling, Effect.Sibling);
                });
                
                previewEl = createPreview(elementView);
                paper.getLayerView(dia.Paper.Layers.FRONT).el.appendChild(previewEl);
                data.preview = previewEl;
                data.position = element.position();
            }
            const bbox = element.getBBox();
            previewEl.setAttribute('transform', `translate(${x - bbox.width / 2}, ${bbox.y})`);
        },
        'element:pointerup': (elementView, evt, x, _y) => {
            
            listener.stopListening();
            
            const data = evt.data;
            if (!data.preview)
                return;
            
            triggerEffectRemoval(paper, Effect.Sibling);
            paper.getLayerView(dia.Paper.Layers.FRONT).el.removeChild(data.preview);
            
            const element = elementView.model;
            const [parent] = graph.getNeighbors(element, { inbound: true });
            
            const sortIteratee = (targetEl) => {
                if (targetEl.id === element.id)
                    return x;
                return targetEl.getBBox().center().x;
            };
            
            diagramData.sortChildren(parent.id, graph, sortIteratee);
        }
    });
}

function createPreview(elementView) {
    const previewEl = elementView.el.cloneNode(true);
    // Do not apply transition to the preview element - see styles/app.scss
    previewEl.classList.add('no-transition');
    previewEl.style.pointerEvents = 'none';
    previewEl.style.opacity = '0.4';
    return previewEl;
}
