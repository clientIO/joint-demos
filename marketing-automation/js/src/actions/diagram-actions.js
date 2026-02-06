import { START_NODE_ID } from '../diagram/const';
import { runAfterLayout } from '../diagram/utils';

// Utils
import { insertNodeOnEdge, appendNodeToButtonParent, replacePlaceholderWithNode } from '../diagram/data/manipulation';
import { getDefaultTriggerData, getDefaultActionData, getDefaultNoteData, getDefaultBranchData, getDefaultDelayData } from '../diagram/data/defaults';

/**
 * Loads the given diagram JSON into the app.
 */
export function loadDiagram(app, json) {
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
        const startElement = graph.getCell(START_NODE_ID);
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
export function resetDiagram(app) {
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
 * Appends a default Branch node at the position of the given button.
 */
export function appendDefaultBranchNode(app, button) {
    return appendNodeToButtonParent(app, getDefaultBranchData(), button);
}

/**
 * Appends a default Delay node at the position of the given button.
 */
export function appendDefaultDelayNode(app, button) {
    return appendNodeToButtonParent(app, getDefaultDelayData(), button);
}

/**
 * Replaces the given placeholder with a default Action node.
 */
export function replaceWithDefaultActionNode(app, placeholder) {
    return replacePlaceholderWithNode(app, placeholder.id, getDefaultActionData());
}

/**
 * Replaces the given placeholder with a default Branch node.
 */
export function replaceWithDefaultBranchNode(app, placeholder) {
    return replacePlaceholderWithNode(app, placeholder.id, getDefaultBranchData());
}

/**
 * Replaces the given placeholder with a default Delay node.
 */
export function replaceWithDefaultDelayNode(app, placeholder) {
    return replacePlaceholderWithNode(app, placeholder.id, getDefaultDelayData());
}

/**
 * Inserts a default Action node on the given edge.
 */
export function insertDefaultActionNode(app, edge) {
    return insertNodeOnEdge(app, getDefaultActionData(), edge);
}


/**
 * Inserts a default Branch node on the given edge.
 */
export function insertDefaultBranchNode(app, edge) {
    return insertNodeOnEdge(app, getDefaultBranchData(), edge);
}

/**
 * Inserts a default Delay node on the given edge.
 */
export function insertDefaultDelayNode(app, edge) {
    return insertNodeOnEdge(app, getDefaultDelayData(), edge);
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
    
    const diagramFileJSON = {
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
