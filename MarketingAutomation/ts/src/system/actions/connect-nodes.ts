import { mvc } from '@joint/plus';
import { triggerEffectRemoval, Effect } from '../diagram/effects';

import type { dia } from '@joint/plus';
import type { SystemDiagramContext } from '../diagram/types';

type StartConnectionInteractionOptions = {
    /**
     * Callback invoked when the interaction ends
     */
    onInteractionEnd?: () => void;
}

/**
 * It creates a link and starts the dragging interaction from the given cell view.
 */
export function startButtonConnectionInteraction(
    ctx: SystemDiagramContext,
    buttonView: dia.ElementView,
    evt: dia.Event,
    options: StartConnectionInteractionOptions = {}
) {
    const { onInteractionEnd = () => {} } = options;
    const { paper } = ctx;

    // Even though we're starting from a button, the connection is created
    // from the button's parent element view (see `connectionStrategy` in UIController)

    // Create a utility view to manage the interaction lifecycle
    const utilityView = new mvc.View();

    // Note: There is no official API to start a connection interaction as of now.
    buttonView.eventData(evt, { targetMagnet: buttonView.el });
    dragLink(buttonView, evt);

    // Note: There is no official API to get the linkView being dragged as of now
    const linkView = buttonView.eventData(evt).linkView as dia.LinkView;
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
        triggerEffectRemoval(paper, Effect.ConnectionAvailableTarget);
        triggerEffectRemoval(paper, Effect.ConnectionTarget);
        // We're done
        endConnectionInteraction();
    };

    utilityView.delegateDocumentEvents({
        // Move the target arrowhead with the pointer
        'pointermove': (evt: dia.Event) => {
            dragLink(buttonView, evt);
        },
        // Complete the connection on pointer down
        'pointerdown': (evt: dia.Event) => {
            if (evt.button !== 0) return;
            dragLinkEnd(buttonView, evt);
            endConnectionInteraction();
        },
        // Cancel connection on right-click
        'contextmenu': (evt: dia.Event) => {
            evt.preventDefault();
            evt.stopPropagation();

            cancelConnectionInteraction();
        },
        // Cancel connection on Escape key press
        'keydown': (evt: dia.Event) => {
            evt.preventDefault();
            evt.stopPropagation();

            if (evt.key === 'Escape') {
                cancelConnectionInteraction();
            }
        }
    }, evt.data);
}

function dragLink(elementView: dia.ElementView, evt: dia.Event) {
    const { x, y } = elementView.paper!.clientToLocalPoint(evt.clientX!, evt.clientY!);
    elementView.dragLink(evt, x, y);
}

function dragLinkEnd(elementView: dia.ElementView, evt: dia.Event) {
    const { x, y } = elementView.paper!.clientToLocalPoint(evt.clientX!, evt.clientY!);
    elementView.dragLinkEnd(evt, x, y);
}
