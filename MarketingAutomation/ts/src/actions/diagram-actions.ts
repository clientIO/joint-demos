// Diagram
import type { Branch, Action, Note, Edge, Delay } from '../diagram/models';
import { START_NODE_ID } from '../diagram/const';
import { runAfterLayout } from '../diagram/utils';

// Utils
import {
    insertNodeOnEdge,
    appendNodeToButtonParent,
    replacePlaceholderWithNode
} from '../diagram/data/manipulation';
import {
    getDefaultTriggerData,
    getDefaultActionData,
    getDefaultNoteData,
    getDefaultBranchData,
    getDefaultDelayData
} from '../diagram/data/defaults';

import type { dia } from '@joint/plus';
import type { App } from '../app';
import type { Model } from '../diagram/types';
import type { DiagramFileJSON } from '../diagram/types';
import type  { SystemButton, SystemPlaceholder } from '../system/diagram/models';

/**
 * Loads the given diagram JSON into the app.
 */
export function loadDiagram(app: App, json: DiagramFileJSON) {
    const { diagramData, graph, history, scroller, selection } = app;
    // Reset the diagram data
    diagramData.fromJSON(json.diagram);
    app.setDiagramName(json.name);
    // Reset the history after loading a new diagram
    history.reset();

    const zoomToFit = () => {
        // Set default zoom
        scroller.zoom(1, { absolute: true });
        // and position to show the start node
        const startElement = graph.getCell(START_NODE_ID) as dia.Element;
        scroller.positionElement(startElement, 'top', { padding: 100 });
    };

    runAfterLayout(graph, zoomToFit);

    // Select the start node (it always exists in a valid diagram)
    const startNode = graph.getCell(START_NODE_ID);
    if (startNode) {
        selection.collection.reset([startNode]);
    }
}

/**
 * Resets the diagram to the default state with only the start trigger node.
 */
export function resetDiagram(app: App) {
    const { scroller, graph } = app;

    loadDiagram(app, {
        diagram: {
            start: getDefaultTriggerData()
        }
    });

    const positionContent = () => {
        scroller.positionContent('top', {
            useModelGeometry: true,
            padding: { top: 200 }
        });
    };

    runAfterLayout(graph, positionContent);
}

/**
 * Removes the given node from the diagram.
 */
export function removeModel(app: App, model: Model) {
    const { diagramData } = app;

    diagramData.removeNode(model.id);
}

/**
 * Appends a default Action node at the position of the given button.
 */
export function appendDefaultActionNode(app: App, button: SystemButton): Action {
    return appendNodeToButtonParent(app, getDefaultActionData(), button) as Action;
}

/**
 * Appends a default Branch node at the position of the given button.
 */
export function appendDefaultBranchNode(app: App, button: SystemButton): Branch {
    return appendNodeToButtonParent(app, getDefaultBranchData(), button) as Branch;
}

/**
 * Appends a default Delay node at the position of the given button.
 */
export function appendDefaultDelayNode(app: App, button: SystemButton): Delay {
    return appendNodeToButtonParent(app, getDefaultDelayData(), button) as Delay;
}

/**
 * Replaces the given placeholder with a default Action node.
 */
export function replaceWithDefaultActionNode(app: App, placeholder: SystemPlaceholder): Action {
    return replacePlaceholderWithNode(app, placeholder.id, getDefaultActionData()) as Action;
}

/**
 * Replaces the given placeholder with a default Branch node.
 */
export function replaceWithDefaultBranchNode(app: App, placeholder: SystemPlaceholder): Branch {
    return replacePlaceholderWithNode(app, placeholder.id, getDefaultBranchData()) as Branch;
}

/**
 * Replaces the given placeholder with a default Delay node.
 */
export function replaceWithDefaultDelayNode(app: App, placeholder: SystemPlaceholder): Delay {
    return replacePlaceholderWithNode(app, placeholder.id, getDefaultDelayData()) as Delay;
}

/**
 * Inserts a default Action node on the given edge.
 */
export function insertDefaultActionNode(app: App, edge: Edge): Action {
    return insertNodeOnEdge(app, getDefaultActionData(), edge) as Action;
}


/**
 * Inserts a default Branch node on the given edge.
 */
export function insertDefaultBranchNode(app: App, edge: Edge): Branch {
    return insertNodeOnEdge(app, getDefaultBranchData(), edge) as Branch;
}

/**
 * Inserts a default Delay node on the given edge.
 */
export function insertDefaultDelayNode(app: App, edge: Edge): Delay {
    return insertNodeOnEdge(app, getDefaultDelayData(), edge) as Delay;
}

/**
 * Adds a default Note node at the given position.
 */
export function addDefaultNoteNode(app: App, position: dia.Point): Note {
    const { diagramData, graph } = app;

    const noteId = diagramData.createNode(getDefaultNoteData(graph, position));
    return graph.getCell(noteId) as Note;
}

/**
 * Downloads the current diagram as a JSON file.
 */
export function downloadDiagramJSON(app: App, {
    fileName = 'diagram.json'
} = {}): void {
    const { diagramData } = app;

    const diagramFileJSON: DiagramFileJSON = {
        diagram: diagramData.toJSON(),
        name: app.getDiagramName()
    };

    const str = JSON.stringify(diagramFileJSON);
    const bytes = new TextEncoder().encode(str);
    const blob = new Blob([bytes], { type: 'application/json' });
    const el = window.document.createElement('a');
    el.href = window.URL.createObjectURL(blob);
    el.download = fileName;
    document.body.appendChild(el);
    el.click();
    document.body.removeChild(el);
}

/**
 * Opens a file dialog to load a diagram file.
 */
export function openFileDialog(app: App, {
    accept = '.json'
}) {

    const fileInput = document.createElement('input');
    fileInput.setAttribute('type', 'file');
    fileInput.setAttribute('accept', accept);
    fileInput.onchange = () => {
        const file = fileInput.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const json = JSON.parse(evt.target!.result as string);
            loadDiagram(app, json);
        };

        reader.readAsText(file);
    };

    fileInput.click();
}
