import { Attribute } from '../diagram/const';

import type { App } from '../app';
import type { Model } from '../diagram/types';

/**
 * Resets the current selection with the given cell.
 * Optionally scrolls to the cell if it's not visible.
 */
export function selectModel(app: App, model: Model, {
    scrollIntoView = false,
    cherryPick = false,
} = {}) {
    const { selection, scroller } = app;

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

    // Scroll to the selected node if it's not visible
    if (scrollIntoView && model.isElement() && !scroller.isElementVisible(model, { strict: true })) {
        scroller.scrollToElement(model, { animation: true });
    }
}

/**
 * Removes all selected cells that are removable from the diagram.
 */
export function removeSelectedModels(app: App) {
    const { selection, diagramData } = app;

    const selectedModels = selection.collection.filter(model => model.get(Attribute.Removable));
    const selectedEdges = selectedModels.filter(model => model.isLink());
    const selectedNodes = selectedModels.filter(model => model.isElement());

    diagramData.runInBatch('remove-selection', () => {
        // Remove edges first to avoid dangling references
        selectedEdges.forEach((edge) => {
            diagramData.removeEdge(edge.source().id!, edge.target().id!);
        });
        // Then remove nodes
        diagramData.removeNodes(selectedNodes.map((node) => node.id));
    });
}
