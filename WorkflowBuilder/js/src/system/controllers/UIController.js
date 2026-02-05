import Controller from './Controller';
import { Attribute } from '../diagram/const';
// Actions
import { trackPositionOnNextInteraction } from '../actions/track-position';

/**
 * UIController manages user interactions and UI-related events for the diagram.
 */
export default class UIController extends Controller {
    
    startListening() {
        const { paper } = this.context;
        
        this.listenTo(paper, {
            'link:connect': onLinkConnect,
            'element:pointerdown': onElementPointerdown,
            'element:magnet:pointerclick': onElementMagnetPointerclick,
        });
    }
}

function onElementPointerdown(ctx, elementView) {
    const element = elementView.model;
    
    if (element.get(Attribute.CustomPosition)) {
        // Move an element with custom position
        trackPositionOnNextInteraction(ctx);
        return;
    }
}

function onElementMagnetPointerclick(ctx, elementView, evt, magnetEl) {
    const { paper } = ctx;
    
    const portId = elementView.findAttribute('port', magnetEl);
    if (portId) {
        paper.trigger('port:pointerclick', elementView, evt, portId);
    }
}

function onLinkConnect(ctx, linkView) {
    const { diagramData } = ctx;
    const link = linkView.model;
    
    diagramData.runInBatch('link-connect', () => {
        diagramData.addEdge({
            id: link.source().id,
            portId: link.source().port
        }, {
            id: link.target().id,
            portId: link.target().port
        }, {
            disableOptimalOrderHeuristic: false
        });
    });
}
