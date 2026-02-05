import { Attribute } from '../diagram/const';
import { runAfterLayout } from '../diagram/utils';

import type { App } from '../app';
import type { Model } from '../diagram/types';
import type { Edge, Node } from '../diagram/models';

/**
 * Resets the current selection with the given cell.
 * Optionally scrolls to the cell if it's not visible.
 */
export function selectModel(app: App, model: Model, {
    scrollIntoView = false,
    cherryPick = false,
} = {}) {
    const { selection, scroller, graph } = app;

    // Add/remove/replace selection
    if (cherryPick) {
        if (selection.collection.includes(model)) {
            selection.collection.remove(model);
        } else {
            selection.collection.add(model);
        }
    } else {
        selection.collection.reset([model]);
    }

    // Scroll is disabled, so we can return early.
    if (!scrollIntoView) return;

    const scrollToView = () => {
        // Scroll to the selected node if it's not visible
        if (model.isElement() && !scroller.isElementVisible(model, { strict: true })) {
            scroller.scrollToElement(model, { animation: true });
        }
    };

    runAfterLayout(graph, scrollToView);
}

/**
 * Removes all selected cells that are removable from the diagram.
 */
export function removeSelectedModels(app: App) {
    const { selection, diagramData } = app;

    const selectedModels = selection.collection.filter(model => model.get(Attribute.Removable));
    const selectedEdges = selectedModels.filter(model => model.isLink()) as Edge[];
    const selectedNodes = selectedModels.filter(model => model.isElement()) as Node[];

    diagramData.runInBatch('remove-selection', () => {
        // Remove edges first to avoid dangling references
        selectedEdges.forEach((edge) => {
            diagramData.removeEdge({
                id: edge.source().id!,
                portId: edge.source().port as string | undefined
            }, {
                id: edge.target().id!,
                portId: edge.target().port as string | undefined
            });
        });
        // Then remove nodes
        diagramData.removeNodes(selectedNodes.map((node) => node.id));
    });
}
