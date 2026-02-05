import type { dia } from '@joint/plus';
import { Controller } from '../system/controllers';
// Diagram
import { State } from '../const';
// Actions
import { removeSelectedModels } from '../actions/selection-actions';
import { closeDialog } from '../actions/dialog-actions';

import type { App } from '../app';

type KeyboardEventCallback = (app: App, evt: dia.Event) => void;

/**
 * KeyboardController manages keyboard shortcuts for the application.
 */
export default class KeyboardController extends Controller<[App]> {

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

function onCtrlZ(app: App) {
    const { history } = app;
    history.undo();
}

function onCtrlY(app: App) {
    const { history } = app;
    history.redo();
}

function onDelete(app: App, evt: dia.Event) {
    evt.preventDefault();
    removeSelectedModels(app);
}

function onEscape(app: App) {

    closeDialog(app);
}

// Conditional wrapper to execute the callback only if no dialog is opened
function ifNoDialogOpen(callback: KeyboardEventCallback) {
    return function(app: App, evt: dia.Event) {
        const { state } = app;
        if (state.get(State.DialogOpened)) return;
        callback(app, evt);
    };
}

