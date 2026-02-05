import { Controller } from '../system/controllers';
// Actions
import { downloadDiagramJSON, openFileDialog, resetDiagram } from '../actions/diagram-actions';
import { publishCurrentWorkflow, testCurrentWorkflow } from '../actions/workflow-actions';

/**
 * ToolbarController manages user interactions with the toolbar.
 */
export default class ToolbarController extends Controller {
    
    startListening() {
        const { toolbar } = this.context;
        
        this.listenTo(toolbar, {
            'save:pointerclick': onSavePointerClick,
            'load:pointerclick': onLoadPointerClick,
            'new:pointerclick': onNewPointerClick,
            'diagram-name:change': onDiagramNameChange,
            'test:pointerclick': onTestPointerClick,
            'publish:pointerclick': onPublishPointerClick,
        });
    }
}

function onSavePointerClick(app) {
    
    downloadDiagramJSON(app, { fileName: `${app.getDiagramName()}.json` });
}

function onLoadPointerClick(app) {
    
    openFileDialog(app, { accept: '.json' });
}

function onNewPointerClick(app) {
    
    resetDiagram(app);
}

function onDiagramNameChange(app, value) {
    app.setDiagramName(value);
}

function onTestPointerClick(app) {
    
    testCurrentWorkflow(app);
}

function onPublishPointerClick(app) {
    
    publishCurrentWorkflow(app);
}
