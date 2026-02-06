import { Controller } from '../system/controllers';
// Diagram
import { Trigger, Action } from '../diagram/models';
import { addEffect, Effect } from '../diagram/effects';
import { Attribute } from '../diagram/const';
// Actions
import { openInspector } from '../actions/inspector-actions';
import { refreshActionNodeProvider, refreshTriggerCriteriaDefinitions } from '../actions/registry-actions';

/**
 * NodesController manages node-specific logic in the graph.
 */
export default class NodesController extends Controller {
    
    startListening() {
        const { graph } = this.context;
        
        this.listenTo(graph, {
            'add': onCellAdd,
            // Action
            [`change:${Attribute.ActionKey}`]: onActionKeyChange,
            // Trigger
            [`change:${Attribute.Criteria}`]: onTriggerCriteriaChange,
        });
    }
}

// React to shape changes in the graph

function onCellAdd(app, cell) {
    const { paper } = app;
    
    if (cell instanceof Action) {
        addEffect(cell.findView(paper), Effect.ActionWarning);
        refreshActionNodeProvider(app, cell);
        return;
    }
    
    if (cell instanceof Trigger) {
        refreshTriggerCriteriaDefinitions(app, cell);
        return;
    }
}

function onActionKeyChange(app, actionNode, actionKey, options) {
    const { diagramData } = app;
    
    if (options.ui) {
        // The change was made from the UI, so we need to update the diagram data
        diagramData.changeNode(actionNode.id, {
            [Attribute.ActionKey]: actionKey,
        }, { build: false });
    }
    
    refreshActionNodeProvider(app, actionNode);
    
    // Re-open the inspector to reflect the updated configuration
    // Note: it will open the inspector if it's not already open (e.g. undo/redo)
    openInspector(app, actionNode);
}

function onTriggerCriteriaChange(app, triggerNode, criteria, options) {
    const { diagramData } = app;
    
    if (options.ui) {
        // The change was made from the UI, so we need to update the diagram data
        diagramData.changeNode(triggerNode.id, {
            [Attribute.Criteria]: criteria,
        });
    }
    
    refreshTriggerCriteriaDefinitions(app, triggerNode);
    
    const lastCriteria = criteria[criteria.length - 1];
    
    // Re-open the inspector to reflect the updated configuration
    // Note: it will open the inspector if it's not already open (e.g. undo/redo)
    openInspector(app, triggerNode, { openGroupName: lastCriteria?.id });
}
