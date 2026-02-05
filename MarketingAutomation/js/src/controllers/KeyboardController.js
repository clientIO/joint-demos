import { Controller } from '../system/controllers';
// Diagram
import { State } from '../const';
// Actions
import { removeSelectedModels } from '../actions/selection-actions';
import { closeDialog } from '../actions/dialog-actions';

/**
 * KeyboardController manages keyboard shortcuts for the application.
 */
export default class KeyboardController extends Controller {
    
    startListening() {
        const { keyboard } = this.context;
        
        this.listenTo(keyboard, {
            'ctrl+z': ifNoDialogOpen(onCtrlZ),
            'ctrl+y': ifNoDialogOpen(onCtrlY),
            'delete backspace': ifNoDialogOpen(onDelete),
            'escape': onEscape,
        });
    }
}

function onCtrlZ(app) {
    const { history } = app;
    history.undo();
}

function onCtrlY(app) {
    const { history } = app;
    history.redo();
}

function onDelete(app, evt) {
    evt.preventDefault();
    removeSelectedModels(app);
}

function onEscape(app) {
    
    closeDialog(app);
}

// Conditional wrapper to execute the callback only if no dialog is opened
function ifNoDialogOpen(callback) {
    return function (app, evt) {
        const { state } = app;
        if (state.get(State.DialogOpened))
            return;
        callback(app, evt);
    };
}

