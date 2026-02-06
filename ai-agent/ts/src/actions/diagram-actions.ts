// Diagram
import type { Agent, Condition, Action, Note, Edge } from '../diagram/models';
import { START_NODE_ID } from '../diagram/const';
// Utils
import {
    insertNodeOnEdge,
    appendNodeToButtonParent,
    replacePlaceholderWithNode
} from '../diagram/data/manipulation';
import {
    getDefaultTriggerData,
    getDefaultActionData,
    getDefaultConditionData,
    getDefaultAgentData,
    getDefaultNoteData
} from '../diagram/data/defaults';

import type { dia } from '@joint/plus';
import type { App } from '../app';
import type { Model } from '../diagram/types';
import type { DiagramJSON } from '../diagram/types';
import type  { SystemButton, SystemPlaceholder } from '../system/diagram/models';

/**
 * Loads the given diagram JSON into the app.
 */
export function loadDiagram(app: App, json: DiagramJSON) {
    const { diagramData, graph, history, scroller, selection } = app;
    // Reset the diagram data
    diagramData.fromJSON(json);
    // Reset the history after loading a new diagram
    history.reset();
    // Zoom to fit the loaded diagram
    scroller.zoomToFit({
        useModelGeometry: true,
        padding: 50,
        maxScale: 1,
    });
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
    const { scroller } = app;

    loadDiagram(app, {
        start: getDefaultTriggerData()
    });

    scroller.positionContent('top', {
        useModelGeometry: true,
        padding: { top: 200 }
    });
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
 * Appends a default Condition node at the position of the given button.
 */
export function appendDefaultConditionNode(app: App, button: SystemButton): Condition {
    return appendNodeToButtonParent(app, getDefaultConditionData(), button) as Condition;
}

/**
 * Appends a default Agent node at the position of the given button.
 */
export function appendDefaultAgentNode(app: App, button: SystemButton): Agent {
    return appendNodeToButtonParent(app, getDefaultAgentData(), button) as Agent;
}

/**
 * Replaces the given placeholder with a default Action node.
 */
export function replaceWithDefaultActionNode(app: App, placeholder: SystemPlaceholder): Action {
    return replacePlaceholderWithNode(app, placeholder.id, getDefaultActionData()) as Action;
}

/**
 * Replaces the given placeholder with a default Condition node.
 */
export function replaceWithDefaultConditionNode(app: App, placeholder: SystemPlaceholder): Condition {
    return replacePlaceholderWithNode(app, placeholder.id, getDefaultConditionData()) as Condition;
}

/**
 * Replaces the given placeholder with a default Agent node.
 */
export function replaceWithDefaultAgentNode(app: App, placeholder: SystemPlaceholder): Agent {
    return replacePlaceholderWithNode(app, placeholder.id, getDefaultAgentData()) as Agent;
}

/**
 * Inserts a default Action node on the given edge.
 */
export function insertDefaultActionNode(app: App, edge: Edge): Action {
    return insertNodeOnEdge(app, getDefaultActionData(), edge) as Action;
}


/**
 * Inserts a default Condition node on the given edge.
 */
export function insertDefaultConditionNode(app: App, edge: Edge): Condition {
    return insertNodeOnEdge(app, getDefaultConditionData(), edge) as Condition;
}

/**
 * Inserts a default Agent node on the given edge.
 */
export function insertDefaultAgentNode(app: App, edge: Edge): Agent {
    return insertNodeOnEdge(app, getDefaultAgentData(), edge) as Agent;
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

    const str = JSON.stringify(diagramData.toJSON());
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
