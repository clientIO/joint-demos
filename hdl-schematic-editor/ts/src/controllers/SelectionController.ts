import { Controller } from '../system/controllers';
import { closeInspector, openInspector } from '../actions/inspector-actions';
import { highlightModelJSON } from '../actions/json-actions';

import type { App } from '../app';

/**
 * SelectionController manages the actions related to selection in the application.
 */
export default class SelectionController extends Controller<[App]> {

    startListening() {
        const { selection } = this.context;

        this.listenTo(selection.collection, {
            'reset add remove': onSelectionChange,
        });
    }
}

function onSelectionChange(app: App) {
    const { selection } = app;

    if (selection.collection.length !== 1) {
        // No support for multiple selection in the inspector yet
        closeInspector(app);
        highlightModelJSON(app, null);
        return;
    }

    const model = selection.collection.at(0);
    openInspector(app, model);
    highlightModelJSON(app, model);
}
