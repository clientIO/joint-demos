import { Controller } from '../system/controllers';
// Actions
import { downloadDiagramJSON, openFileDialog, resetDiagram } from '../actions/diagram-actions';
import { publishCurrentWorkflow, testCurrentWorkflow } from '../actions/workflow-actions';

import type { App } from '../app';

/**
 * ToolbarController manages user interactions with the toolbar.
 */
export default class ToolbarController extends Controller<[App]> {

    startListening() {
        const { toolbar } = this.context;

        this.listenTo(toolbar, {
            'save:pointerclick': onSavePointerClick,
            'load:pointerclick': onLoadPointerClick,
            'new:pointerclick': onNewPointerClick,
            'test:pointerclick': onTestPointerClick,
            'publish:pointerclick': onPublishPointerClick,
            'diagram-name:change': onDiagramNameChange,
        });
    }
}

function onSavePointerClick(app: App) {

    downloadDiagramJSON(app, { fileName: `${ app.getDiagramName() }.json` });
}

function onLoadPointerClick(app: App) {

    openFileDialog(app, { accept: '.json' });
}

function onNewPointerClick(app: App) {

    resetDiagram(app);
}

function onTestPointerClick(app: App) {

    testCurrentWorkflow(app);
}

function onPublishPointerClick(app: App) {

    publishCurrentWorkflow(app);
}

function onDiagramNameChange(app: App, value: string) {
    app.setDiagramName(value);
}
