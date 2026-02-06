// Diagram
import { Attribute } from '../diagram/const';
import { runAfterLayout } from '../diagram/utils';
// Utils
import { appendNodeToParent, insertNodeOnEdge } from '../diagram/data/manipulation';
import { getDefaultTriggerData, getDefaultActionData, getDefaultControlData, getDefaultNoteData } from '../diagram/data/defaults';

/**
 * Loads the given diagram JSON into the app.
 */
export function loadDiagram(app, json) {
    const { diagramData, graph, history, scroller } = app;
    // Reset the diagram data
    diagramData.fromJSON(json.diagram);
    app.setDiagramName(json.name);
    // Reset the history after loading a new diagram
    history.reset();
    
    const zoomToFit = () => {
        // Zoom to fit the loaded diagram.
        scroller.zoomToFit({
            useModelGeometry: true,
            padding: 100,
            maxScale: 1,
        });
    };
    
    runAfterLayout(graph, zoomToFit);
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
        scroller.positionContent('left', {
            useModelGeometry: true,
            padding: { left: 200 }
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
export function appendDefaultActionNode(app, node, options) {
    return appendNodeToParent(app, getDefaultActionData(), node, options);
}

/**
 * Appends a default Condition node at the position of the given button.
 */
export function appendDefaultControlNode(app, node, options) {
    return appendNodeToParent(app, getDefaultControlData(), node, options);
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
export function insertDefaultControlNode(app, edge) {
    return insertNodeOnEdge(app, getDefaultControlData(), edge);
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
 * Adds a default Trigger node to the diagram.
 */
export function addDefaultTriggerNode(app) {
    const { diagramData, graph } = app;
    
    const triggerId = diagramData.createNode(getDefaultTriggerData());
    return graph.getCell(triggerId);
}

/**
 * Updates the control key of the given control node and removes edges connected to now-nonexistent ports.
 */
export function updateControlKey(app, controlNode, controlKey) {
    const { diagramData } = app;
    
    diagramData.runInBatch('update-control-key', () => {
        diagramData.changeNode(controlNode.id, {
            [Attribute.ControlKey]: controlKey,
        });
        
        const edgeData = diagramData.get(controlNode.id)?.to;
        const outboundPortIds = controlNode.getOutboundPorts().map(port => port.id);
        // Remove edges connected to now-nonexistent ports
        edgeData.forEach(edge => {
            if (!outboundPortIds.includes(edge.sourcePortId)) {
                diagramData.removeEdge({
                    id: controlNode.id,
                    portId: edge.sourcePortId
                }, {
                    id: edge.id,
                    portId: edge.targetPortId
                });
            }
        });
    }, { build: true });
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
