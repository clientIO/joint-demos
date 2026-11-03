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
 * Opens a dialog with the given message.
 */
export function openMessageDialog(app: App, title: string, message: string) {
    const content = document.createElement('span');
    content.textContent = message;

    const dialog = new ui.Dialog({
        width: 420,
        title,
        content,
        draggable: true,
        buttons: [
            {
                content: 'OK',
                action: 'close',
                position: 'right'
            }
        ]
    });

    dialog.el.classList.add('message-dialog');
    openDialog(app, dialog);
}
