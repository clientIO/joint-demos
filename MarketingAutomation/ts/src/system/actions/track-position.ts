import { type dia, mvc } from '@joint/plus';
import { Attribute } from '../diagram/const';
import { getCustomPosition } from '../diagram/custom-positions';

import type { SystemDiagramContext } from '../diagram/types';

export function trackPositionOnNextInteraction(ctx: SystemDiagramContext) {
    const { paper, graph, diagramData } = ctx;
    const listener = new mvc.Listener();
    listener.listenTo(paper, {
        'element:pointermove': (_elementView: dia.ElementView, evt: dia.Event) => {
            evt.data.hasMoved = true;
        },
        'element:pointerup': (elementView: dia.ElementView, evt: dia.Event) => {
            listener.stopListening();
            if (!evt.data.hasMoved) return;

            const element = elementView.model;
            const customPosition = element.get(Attribute.CustomPosition);

            if (!customPosition) return;

            const position = getCustomPosition(graph, element.position(), customPosition.refId);
            diagramData.changeNode(element.id, { [Attribute.CustomPosition]: position }, { build: false });
        }
    });
}
