import Controller from './Controller';
import { Attribute } from '../diagram/const';
// Actions
import { trackPositionOnNextInteraction } from '../actions/track-position';

import type { dia } from '@joint/plus';
import type { SystemDiagramContext, SystemNodeData } from '../diagram/types';
import type { SystemEdge } from '../diagram/models';

/**
 * UIController manages user interactions and UI-related events for the diagram.
 */
export default class UIController extends Controller<[SystemDiagramContext<SystemNodeData>]> {

    startListening() {
        const { paper } = this.context;

        this.listenTo(paper, {
            'link:connect': onLinkConnect,
            'element:pointerdown': onElementPointerdown,
            'element:magnet:pointerclick': onElementMagnetPointerclick,
        });
    }
}

function onElementPointerdown(ctx: SystemDiagramContext, elementView: dia.ElementView) {
    const element = elementView.model;

    if (element.get(Attribute.CustomPosition)) {
        // Move an element with custom position
        trackPositionOnNextInteraction(ctx);
        return;
    }
}

function onElementMagnetPointerclick(ctx: SystemDiagramContext, elementView: dia.ElementView, evt: dia.Event, magnetEl: SVGElement) {
    const { paper } = ctx;

    const portId = elementView.findAttribute('port', magnetEl);
    if (portId) {
        paper.trigger('port:pointerclick', elementView, evt, portId);
    }
}

function onLinkConnect(ctx: SystemDiagramContext, linkView: dia.LinkView<SystemEdge>) {
    const { diagramData } = ctx;
    const link = linkView.model;

    diagramData.runInBatch('link-connect', () => {
        diagramData.addEdge({
            id: link.source().id as dia.Cell.ID,
            portId: link.source().port as string | undefined
        }, {
            id: link.target().id as dia.Cell.ID,
            portId: link.target().port as string | undefined
        }, {
            disableOptimalOrderHeuristic: false
        });
    });
}
