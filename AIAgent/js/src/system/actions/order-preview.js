import { dia, mvc, util } from '@joint/plus';
// Diagram
import { SystemButton } from '../diagram/models';
import { triggerEffect, triggerEffectRemoval, Effect } from '../diagram/effects';

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
        'element:pointerup': (elementView, evt, x, y) => {
            
            listener.stopListening();
            
            const data = evt.data;
            if (!data.preview)
                return;
            
            triggerEffectRemoval(paper, Effect.Sibling);
            paper.getLayerView(dia.Paper.Layers.FRONT).el.removeChild(data.preview);
            
            const element = elementView.model;
            const [parent] = graph.getNeighbors(element, { inbound: true });
            
            element.position(x, y);
            
            const json = diagramData.toJSON();
            diagramData.sortChildren(parent.id, graph);
            if (util.isEqual(json, diagramData.toJSON())) {
                // No change in the graph, so we need to restore the original position
                // Note: this is not most efficient (we could detect no-op before sorting)
                element.position(data.position.x, data.position.y);
            }
        }
    });
}

function createPreview(elementView) {
    const previewEl = elementView.el.cloneNode(true);
    previewEl.style.pointerEvents = 'none';
    previewEl.style.opacity = '0.4';
    return previewEl;
}
