import { START_NODE_ID } from '../diagram/const';
// Utils
import { insertNodeOnEdge, appendNodeToButtonParent, replacePlaceholderWithNode } from '../diagram/data/manipulation';
import { getDefaultTriggerData, getDefaultActionData, getDefaultConditionData, getDefaultAgentData, getDefaultNoteData } from '../diagram/data/defaults';

/**
 * Loads the given diagram JSON into the app.
 */
export function loadDiagram(app, json) {
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
export function resetDiagram(app) {
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
export function removeModel(app, model) {
    const { diagramData } = app;
    
    diagramData.removeNode(model.id);
}

/**
 * Appends a default Action node at the position of the given button.
 */
export function appendDefaultActionNode(app, button) {
    return appendNodeToButtonParent(app, getDefaultActionData(), button);
}

/**
 * Appends a default Condition node at the position of the given button.
 */
export function appendDefaultConditionNode(app, button) {
    return appendNodeToButtonParent(app, getDefaultConditionData(), button);
}

/**
 * Appends a default Agent node at the position of the given button.
 */
export function appendDefaultAgentNode(app, button) {
    return appendNodeToButtonParent(app, getDefaultAgentData(), button);
}

/**
 * Replaces the given placeholder with a default Action node.
 */
export function replaceWithDefaultActionNode(app, placeholder) {
    return replacePlaceholderWithNode(app, placeholder.id, getDefaultActionData());
}

/**
 * Replaces the given placeholder with a default Condition node.
 */
export function replaceWithDefaultConditionNode(app, placeholder) {
    return replacePlaceholderWithNode(app, placeholder.id, getDefaultConditionData());
}

/**
 * Replaces the given placeholder with a default Agent node.
 */
export function replaceWithDefaultAgentNode(app, placeholder) {
    return replacePlaceholderWithNode(app, placeholder.id, getDefaultAgentData());
}

/**
 * Inserts a default Action node on the given edge.
 */
export function insertDefaultActionNode(app, edge) {
    return insertNodeOnEdge(app, getDefaultActionData(), edge);
}


/**
 * Inserts a default Condition node on the given edge.
 */
export function insertDefaultConditionNode(app, edge) {
    return insertNodeOnEdge(app, getDefaultConditionData(), edge);
}

/**
 * Inserts a default Agent node on the given edge.
 */
export function insertDefaultAgentNode(app, edge) {
    return insertNodeOnEdge(app, getDefaultAgentData(), edge);
}

/**
 * Adds a default Note node at the given position.
 */
export function addDefaultNoteNode(app, position) {
    const { diagramData, graph } = app;
    
    const noteId = diagramData.createNode(getDefaultNoteData(graph, position));
    return graph.getCell(noteId);
}

/**
 * Downloads the current diagram as a JSON file.
 */
export function downloadDiagramJSON(app, { fileName = 'diagram.json' } = {}) {
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
export function openFileDialog(app, { accept = '.json' }) {
    
    const fileInput = document.createElement('input');
    fileInput.setAttribute('type', 'file');
    fileInput.setAttribute('accept', accept);
    fileInput.onchange = () => {
        const file = fileInput.files?.[0];
        if (!file)
            return;
        
        const reader = new FileReader();
        reader.onload = (evt) => {
            const json = JSON.parse(evt.target.result);
            loadDiagram(app, json);
        };
        
        reader.readAsText(file);
    };
    
    fileInput.click();
}
