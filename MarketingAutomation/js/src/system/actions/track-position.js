import { mvc } from '@joint/plus';
import { Attribute } from '../diagram/const';
import { getCustomPosition } from '../diagram/custom-positions';

export function trackPositionOnNextInteraction(ctx) {
    const { paper, graph, diagramData } = ctx;
    const listener = new mvc.Listener();
    listener.listenTo(paper, {
        'element:pointermove': (_elementView, evt) => {
            evt.data.hasMoved = true;
        },
        'element:pointerup': (elementView, evt) => {
            listener.stopListening();
            if (!evt.data.hasMoved)
                return;
            
            const element = elementView.model;
            const customPosition = element.get(Attribute.CustomPosition);
            
            if (!customPosition)
                return;
            
            const position = getCustomPosition(graph, element.position(), customPosition.refId);
            diagramData.changeNode(element.id, { [Attribute.CustomPosition]: position }, { build: false });
        }
    });
}
