import { ui } from '@joint/plus';
import { State } from '../const';

import type { App } from '../app';

/**
 * Opens the given dialog and manages its state within the application.
 */
export function openDialog(app: App, dialog: ui.Dialog) {
    const { state } = app;

    state.set(State.DialogOpened, dialog);
    dialog.on('close', () => {
        state.delete(State.DialogOpened);
    });

    dialog.open();
}

/**
 * Closes the currently opened dialog, if any.
 */
export function closeDialog(app: App) {
    const { state } = app;

    const dialog = state.get(State.DialogOpened);
    if (dialog instanceof ui.Dialog) {
        dialog.close();
    }
}

/**
 * Opens a mock dialog indicating that the feature is not implemented yet.
 */
export function openMockDialog(app: App) {
    const { state } = app;

    if (state.get(State.DialogOpened)) return;

    const dialog = new ui.Dialog({
        width: 500,
        title: 'Workflow offline. UI only.',
        content: '<span>This is just a mock UI to showcase what could be. Nothing runs under the hood. Yet. <b>But hey, dream big.</b></span>',
        draggable: true,
        closeButton: false,
        buttons: [
            {
                content: 'Back to UI playground',
                action: 'close',
                position: 'left'
            }
        ]
    });

    dialog.el.classList.add('mock-dialog');
    openDialog(app, dialog);
}

