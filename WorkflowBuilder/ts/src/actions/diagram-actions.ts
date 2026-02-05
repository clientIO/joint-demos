// Diagram
import { Attribute } from '../diagram/const';
import { runAfterLayout } from '../diagram/utils';
// Utils
import {
    appendNodeToParent,
    insertNodeOnEdge
} from '../diagram/data/manipulation';
import {
    getDefaultTriggerData,
    getDefaultActionData,
    getDefaultControlData,
    getDefaultNoteData
} from '../diagram/data/defaults';

import type { dia } from '@joint/plus';
import type { App } from '../app';
import type { Control, Action, Note, Edge, Trigger } from '../diagram/models';
import type { DiagramFileJSON, EdgeData, Model } from '../diagram/types';
import type DiagramNode from '../diagram/models/DiagramNode';

/**
 * Loads the given diagram JSON into the app.
 */
export function loadDiagram(app: App, json: DiagramFileJSON) {
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
export function resetDiagram(app: App) {
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
export function removeModel(app: App, model: Model) {
    const { diagramData } = app;

    diagramData.removeNode(model.id);
}

/**
 * Appends a default Action node at the position of the given button.
 */
export function appendDefaultActionNode(app: App, node: DiagramNode, options: { sourcePortId?: string }): Action {
    return appendNodeToParent(app, getDefaultActionData(), node, options) as Action;
}

/**
 * Appends a default Condition node at the position of the given button.
 */
export function appendDefaultControlNode(app: App, node: DiagramNode, options: { sourcePortId?: string }): Control {
    return appendNodeToParent(app, getDefaultControlData(), node, options) as Control;
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
export function insertDefaultControlNode(app: App, edge: Edge): Control {
    return insertNodeOnEdge(app, getDefaultControlData(), edge) as Control;
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
 * Adds a default Trigger node to the diagram.
 */
export function addDefaultTriggerNode(app: App): Trigger {
    const { diagramData, graph } = app;

    const triggerId = diagramData.createNode(getDefaultTriggerData());
    return graph.getCell(triggerId) as Trigger;
}

/**
 * Updates the control key of the given control node and removes edges connected to now-nonexistent ports.
 */
export function updateControlKey(app: App, controlNode: Control, controlKey: string): void {
    const { diagramData } = app;

    diagramData.runInBatch('update-control-key', () => {
        diagramData.changeNode(controlNode.id, {
            [Attribute.ControlKey]: controlKey,
        });

        const edgeData = diagramData.get(controlNode.id as string)?.to as EdgeData[];
        const outboundPortIds = controlNode.getOutboundPorts().map(port => port.id);
        // Remove edges connected to now-nonexistent ports
        edgeData.forEach(edge => {
            if (!outboundPortIds.includes(edge.sourcePortId as string)) {
                diagramData.removeEdge({
                    id: controlNode.id as dia.Cell.ID,
                    portId: edge.sourcePortId as string | undefined
                }, {
                    id: edge.id as dia.Cell.ID,
                    portId: edge.targetPortId as string | undefined
                });
            }
        });
    }, { build: true });
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
