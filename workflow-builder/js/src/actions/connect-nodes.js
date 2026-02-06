import { mvc } from '@joint/plus';
import { Effect, removeEffect } from '../diagram/effects';

/**
 * It creates a link and starts the dragging interaction from the given cell view.
 */
export function startPortConnectionInteraction(ctx, nodeView, evt, options = {}) {
    const { onInteractionEnd = () => { } } = options;
    const { paper } = ctx;
    
    // Even though we're starting from a button, the connection is created
    // from the button's parent element view (see `connectionStrategy` in UIController)
    
    // Create a utility view to manage the interaction lifecycle
    const utilityView = new mvc.View();
    
    // Note: There is no official API to start a connection interaction as of now.
    const portMagnet = nodeView.findPortNode(options.portId);
    
    nodeView.eventData(evt, { targetMagnet: portMagnet });
    dragLink(nodeView, evt);
    
    // Note: There is no official API to get the linkView being dragged as of now
    const linkView = nodeView.eventData(evt).linkView;
    if (!linkView) {
        throw new Error('Connection interaction failed to start: linkView not found');
    }
    
    const endConnectionInteraction = () => {
        // Note: The data is populated on `link:connect` in the UIController
        // This link is only for visual purposes during the interaction
        linkView.model.remove();
        // Clean up the utility view
        utilityView.undelegateDocumentEvents();
        utilityView.remove();
        // Notify that the interaction has ended
        onInteractionEnd();
    };
    
    const cancelConnectionInteraction = () => {
        // Make sure no highlighters are left on the paper
        removeEffect(paper, Effect.ConnectionCandidate);
        removeEffect(paper, Effect.ConnectionTarget);
        // We're done
        endConnectionInteraction();
    };
    
    utilityView.delegateDocumentEvents({
        // Move the target arrowhead with the pointer
        'pointermove': (evt) => {
            dragLink(nodeView, evt);
        },
        // Complete the connection on pointer down
        'pointerdown': (evt) => {
            if (evt.button !== 0)
                return;
            dragLinkEnd(nodeView, evt);
            endConnectionInteraction();
        },
        // Cancel connection on right-click
        'contextmenu': (evt) => {
            evt.preventDefault();
            evt.stopPropagation();
            
            cancelConnectionInteraction();
        },
        // Cancel connection on Escape key press
        'keydown': (evt) => {
            evt.preventDefault();
            evt.stopPropagation();
            
            if (evt.key === 'Escape') {
                cancelConnectionInteraction();
            }
        }
    }, evt.data);
}

function dragLink(elementView, evt) {
    const { x, y } = elementView.paper.clientToLocalPoint(evt.clientX, evt.clientY);
    elementView.dragLink(evt, x, y);
}

function dragLinkEnd(elementView, evt) {
    const { x, y } = elementView.paper.clientToLocalPoint(evt.clientX, evt.clientY);
    elementView.dragLinkEnd(evt, x, y);
}
