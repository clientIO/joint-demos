import { Controller } from '../system/controllers';
// Diagram
import { Trigger, Action, Control } from '../diagram/models';
import { Attribute } from '../diagram/const';
// Actions
import { openInspector } from '../actions/inspector-actions';
import { refreshActionNodeConfiguration, refreshControlNodeConfiguration, refreshTriggerNodeConfiguration } from '../actions/registry-actions';
import { updateControlKey } from '../actions/diagram-actions';

import type { dia } from '@joint/plus';
import type { App } from '../app';

/**
 * NodesController manages node-specific logic in the graph.
 */
export default class NodesController extends Controller<[App]> {

    startListening() {
        const { graph } = this.context;

        this.listenTo(graph, {
            'add': onCellAdd,
            // Action
            [`change:${Attribute.ActionKey}`]: onActionKeyChange,
            // Trigger
            [`change:${Attribute.TriggerKey}`]: onTriggerKeyChange,
            // Control
            [`change:${Attribute.ControlKey}`]: onControlKeyChange
        });
    }
}

// React to shape changes in the graph

function onCellAdd(app: App, cell: dia.Cell) {
    if (cell instanceof Action) {
        refreshActionNodeConfiguration(app, cell);
        return;
    }

    if (cell instanceof Trigger) {
        refreshTriggerNodeConfiguration(app, cell);
        return;
    }

    if (cell instanceof Control) {
        refreshControlNodeConfiguration(app, cell);
        return;
    }
}

function onActionKeyChange(app: App, actionNode: Action, actionKey: string, options: dia.Cell.Options) {
    const { diagramData } = app;

    if (options.ui) {
        // The change was made from the UI, so we need to update the diagram data
        diagramData.changeNode(actionNode.id, {
            [Attribute.ActionKey]: actionKey,
        }, { build: false });
    }

    refreshActionNodeConfiguration(app, actionNode);

    // Re-open the inspector to reflect the updated configuration
    // Note: it will open the inspector if it's not already open (e.g. undo/redo)
    openInspector(app, actionNode);
}

function onControlKeyChange(app: App, controlNode: Control, controlKey: string, options: dia.Cell.Options) {
    // refresh first to update the ports according to the new control type
    refreshControlNodeConfiguration(app, controlNode);

    if (options.ui) {
        // The change was made from the UI, so we need to update the diagram data
        updateControlKey(app, controlNode, controlKey);
    }

    // Re-open the inspector to reflect the updated configuration
    // Note: it will open the inspector if it's not already open (e.g. undo/redo)
    openInspector(app, controlNode);
}

function onTriggerKeyChange(app: App, triggerNode: Trigger, triggerKey: string, options: dia.Cell.Options) {
    const { diagramData } = app;

    if (options.ui) {
        // The change was made from the UI, so we need to update the diagram data
        diagramData.changeNode(triggerNode.id, {
            [Attribute.TriggerKey]: triggerKey,
        }, { build: false });
    }

    refreshTriggerNodeConfiguration(app, triggerNode);

    // Re-open the inspector to reflect the updated configuration
    // Note: it will open the inspector if it's not already open (e.g. undo/redo)
    openInspector(app, triggerNode);
}
