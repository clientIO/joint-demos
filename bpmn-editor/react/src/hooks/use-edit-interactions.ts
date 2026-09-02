import { useSelectionCollection, useOnPaperEvents } from '@joint/react-plus';
import { openLabelEditor, closeLabelEditor } from '../actions/label-editor';
import { prepareLinkReplacement, isSwimlane } from '../utils';
import { onSwimlaneDrag, onSwimlaneDragEnd, onSwimlaneDragStart } from '../dnd/swimlanes';
import { onElementDrag, onElementDragEnd, onElementDragStart } from '../dnd/elements';

import type { BpmnLink } from '../shapes/shapes-typing';

// Editing interactions: element drag routing (swimlanes vs regular elements),
// the inline label editor and link replacement on connect.
export function useEditInteractions() {

    const selection = useSelectionCollection();

    useOnPaperEvents({

        onElementPointerDblClick: ({ paper, view }) => {
            openLabelEditor(paper, selection, view);
        },

        onCellPointerDown: () => closeLabelEditor(),

        onBlankPointerDown: () => closeLabelEditor(),

        // The editor is positioned for the current zoom level — save and
        // close it when the paper scale changes.
        onScale: () => closeLabelEditor(),

        onElementPointerDown: ({ paper, view: elementView, event, x, y }) => {
            const { model } = elementView;

            if (isSwimlane(model)) {
                if (event.shiftKey) {
                    // Enable selecting inside the pool with `shift`
                    elementView.setInteractivity(false);
                    elementView.preventDefaultInteraction(event);
                    elementView.eventData(event, {
                        preventDrop: true
                    });
                } else {
                    onSwimlaneDragStart(paper, elementView, event, x, y);
                }
            } else {
                onElementDragStart(paper, elementView, event, x, y);
            }
        },

        onElementPointerMove: ({ paper, view: elementView, event, x, y }) => {
            const { model } = elementView;

            if (isSwimlane(model)) {
                if (elementView.eventData(event)?.preventDrop) return;

                onSwimlaneDrag(paper, elementView, event, x, y);
            } else {
                onElementDrag(paper, elementView, event, 0, 0);
            }
        },

        onElementPointerUp: ({ paper, view: elementView, event, x, y }) => {
            const { model } = elementView;

            if (isSwimlane(model)) {
                if (elementView.eventData(event)?.preventDrop) return;

                onSwimlaneDragEnd(paper, elementView, event, x, y);
            } else {
                onElementDragEnd(paper, elementView, event, x, y);
            }
        },

        onLinkConnect: ({ graph, model }) => {
            const batchName = 'link-replace';

            graph.startBatch(batchName);

            const replacementLink = prepareLinkReplacement(model as BpmnLink);
            graph.syncCells([replacementLink], { async: false });

            graph.stopBatch(batchName);
            selection.collection.reset([replacementLink]);
        }
    });
}
