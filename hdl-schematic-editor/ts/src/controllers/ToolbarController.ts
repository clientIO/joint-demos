import { Controller } from '../system/controllers';
// Actions
import { downloadYosysJSON, openFileDialog, resetDiagram, loadYosysJSON, layoutDiagram } from '../actions/diagram-actions';

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
            'example:pointerclick': onExamplePointerClick,
            'layout:pointerclick': onLayoutPointerClick,
            'diagram-name:change': onDiagramNameChange,
        });
    }
}

function onSavePointerClick(app: App) {

    downloadYosysJSON(app, { fileName: `${app.getModuleName()}.json` });
}

function onLoadPointerClick(app: App) {

    openFileDialog(app, { accept: '.json' });
}

function onNewPointerClick(app: App) {

    resetDiagram(app);
}

function onExamplePointerClick(app: App) {

    loadYosysJSON(app, app.config.example);
}

function onLayoutPointerClick(app: App) {

    layoutDiagram(app);
}

function onDiagramNameChange(app: App, value: string) {

    app.setModuleName(value);
}
