import { dia, mvc } from '@joint/plus';
import type { EditorEvent } from '../utils';

/**
 * Shows a semi-transparent clone of the element following the pointer for
 * the rest of the interaction — used when the element itself must not move
 * (swimlane drags). `grabX`/`grabY` are the pointerdown coordinates the
 * ghost is anchored to.
 */
export function showGhostOnNextInteraction(paper: dia.Paper, grabX: number, grabY: number) {
    const listener = new mvc.Listener();
    listener.listenTo(paper, {
        'element:pointermove': (view: dia.ElementView, evt: EditorEvent, x: number, y: number) => {
            const data = evt.data;
            let ghostEl = data.ghost;
            if (!ghostEl) {
                ghostEl = createGhost(view);
                const position = view.model.position();
                paper.getLayerView(dia.Paper.Layers.FRONT).el.appendChild(ghostEl);
                evt.data.ghost = ghostEl;
                // Anchor to the grab point (the pointerdown coordinates) —
                // with the paper's `moveThreshold`, the first dispatched move
                // of a fast drag is already far from it.
                evt.data.dx = grabX - position.x;
                evt.data.dy = grabY - position.y;
            }
            ghostEl.setAttribute('transform', `translate(${x - data.dx!}, ${y - data.dy!})`);
        },
        'element:pointerup': (_elementView: dia.ElementView, evt: EditorEvent) => {
            evt.data?.ghost?.remove();
            listener.stopListening();
        }
    });
}

function createGhost(elementView: dia.ElementView) {
    const ghostEl = elementView.el.cloneNode(true) as SVGElement;
    ghostEl.style.pointerEvents = 'none';
    ghostEl.style.opacity = '0.4';
    return ghostEl;
}
