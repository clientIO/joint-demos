import { mvc } from '@joint/plus';

export function showGhostOnNextInteraction(paper) {
    const listener = new mvc.Listener();
    listener.listenTo(paper, {
        'element:pointermove': (view, evt, x, y) => {
            const data = evt.data;
            let ghostEl = data.ghost;
            if (!ghostEl) {
                ghostEl = createGhost(view);
                const position = view.model.position();
                paper.viewport.appendChild(ghostEl);
                evt.data.ghost = ghostEl;
                evt.data.dx = x - position.x;
                evt.data.dy = y - position.y;
            }
            ghostEl.setAttribute('transform', `translate(${x - data.dx}, ${y - data.dy})`);
        },
        'element:pointerup': (_elementView, evt, _x, _y) => {
            const data = evt.data;
            if (data.ghost) {
                paper.viewport.removeChild(data.ghost);
            }
            listener.stopListening();
        }
    });
}

function createGhost(elementView) {
    const ghostEl = elementView.el.cloneNode(true);
    ghostEl.style.pointerEvents = 'none';
    ghostEl.style.opacity = '0.4';
    return ghostEl;
}
