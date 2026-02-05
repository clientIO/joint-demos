import { ui } from '@joint/plus';
// Diagram
import { Action, Trigger } from '../diagram/models';
// Registry
import { createRegistryKey, resolveActionProvider, resolveTriggerCriteriaProvider } from '../registry';
import { TriggerOption, ActionOption } from '../registry/models';
import { openDialog } from './dialog-actions';

/**
 * Open the action/trigger provider registry dialog to select or change the trigger/action/skill
 * associated with the given node.
 */
export function openProviderRegistryDialog(app, node) {
    
    let groups;
    let cells;
    let title;
    let updateShape;
    
    // Determine shape type and prepare stencil options accordingly
    if (node instanceof Trigger) {
        
        title = 'Select a trigger criteria';
        ({ cells, groups } = createTriggersOptions(app, {
            // Disable the trigger criteria assigned to this trigger node
            disabled: node.getCriteria().map(criteria => criteria.id)
        }));
        
        
        updateShape = (option) => {
            const criteriaKey = option.get('criteriaKey');
            const criteria = {
                id: criteriaKey,
                name: option.attr('label/text'),
                icon: option.attr('icon/href'),
            };
            
            node.addCriteria(criteria, { ui: true });
        };
        
    }
    else if (node instanceof Action) {
        
        title = 'Select an action';
        ({ cells, groups } = createActionsOptions(app, {
            // Disable the action assigned to this action node
            disabled: node.isConfigured() ? [node.getActionKey()] : []
        }));
        
        updateShape = (option) => {
            const actionKey = option.get('actionKey');
            
            node.setActionKey(actionKey, { ui: true });
        };
        
    }
    else {
        throw new Error(`Dialog for shape type "${node.get('type')}" is not supported yet.`);
    }
    
    const stencil = createStencil(app, groups);
    
    // Close the dialog when an option is selected
    // and update the shape accordingly
    stencil.on('group:element:pointerclick', (_, elementView) => {
        updateShape(elementView.model);
        dialog.close();
        stencil.remove();
    });
    
    const dialog = new ui.Dialog({
        width: 700,
        title,
        content: stencil.el,
        draggable: true,
    });
    
    openDialog(app, dialog);
    
    stencil.load(cells);
    stencil.el.querySelector('.search').focus();
}

/**
 * Refresh the action provider and action definition for the given action node
 * based on its current action key.
 */
export function refreshActionNodeProvider(app, node) {
    const { config } = app;
    
    const definition = resolveActionProvider(config.actions, node.getActionKey());
    if (definition) {
        const [provider, action] = definition;
        node.updateProvider(provider, action);
    }
    else {
        node.unsetProvider();
    }
}

/**
 * Refresh the trigger definition for the given trigger node
 * based on its current criteria.
 */
export function refreshTriggerCriteriaDefinitions(app, node) {
    const { config } = app;
    const criteriaList = node.getCriteria();
    
    for (const criteria of criteriaList) {
        const definition = resolveTriggerCriteriaProvider(config.triggers, criteria.id);
        if (definition) {
            const [, trigger] = definition;
            node.updateCriteriaDefinition(criteria.id, trigger);
        }
    }
}

// Helper functions

/**
 * Create stencil options for all available actions in the app configuration.
 */
function createTriggersOptions(app, options = { disabled: [] }) {
    const { config } = app;
    const registry = config.triggers;
    const cells = {};
    const groups = {};
    
    for (const providerId in registry) {
        const provider = registry[providerId];
        cells[providerId] = [];
        groups[providerId] = {
            label: provider.name,
            index: Object.keys(groups).length + 1
        };
        // Create a TriggerOption for each trigger
        provider.triggers.forEach((trigger) => {
            const criteriaKey = createRegistryKey(providerId, trigger.id);
            const triggerOption = new TriggerOption({
                providerName: provider.name, // For search purposes
                criteriaKey,
                attrs: {
                    root: {
                        // We use `style` here to override the CSS rules
                        // applied to stencil elements
                        style: options.disabled.includes(criteriaKey)
                            ? { pointerEvents: 'none', opacity: 0.5 }
                            : { pointerEvents: 'auto', opacity: 1 }
                    },
                    icon: {
                        href: `assets/icons/providers/${provider.icon}`
                    },
                    label: {
                        text: trigger.name
                    },
                    description: {
                        text: trigger.description
                    }
                }
            });
            
            cells[providerId].push(triggerOption);
        });
    }
    return { cells, groups };
}

/**
 * Create stencil options for all available actions grouped by their providers.
 */
function createActionsOptions(app, options = { disabled: [] }) {
    const { config } = app;
    const registry = config.actions;
    const cells = {};
    const groups = {};
    
    for (const providerId in registry) {
        const provider = registry[providerId];
        cells[providerId] = [];
        groups[providerId] = {
            label: provider.name,
            index: Object.keys(groups).length + 1
        };
        // Create an ActionOption for each action
        provider.actions.forEach((action) => {
            const actionKey = createRegistryKey(providerId, action.id);
            const actionOption = new ActionOption({
                providerName: provider.name, // For search purposes
                actionKey,
                attrs: {
                    root: {
                        // We use `style` here to override the CSS rules
                        // applied to stencil elements
                        style: options.disabled.includes(actionKey)
                            ? { pointerEvents: 'none', opacity: 0.5 }
                            : { pointerEvents: 'auto', opacity: 1 }
                    },
                    icon: {
                        href: `assets/icons/providers/${provider.icon}`
                    },
                    label: {
                        text: action.name
                    },
                    description: {
                        text: action.description
                    }
                }
            });
            
            cells[providerId].push(actionOption);
        });
    }
    
    return { cells, groups };
}

/**
 * Create a stencil instance with the given groups.
 */
function createStencil(app, groups) {
    const stencil = new ui.Stencil({
        paper: app.scroller,
        width: 680,
        canDrag: () => false,
        search: {
            '*': ['attrs/label/text', 'attrs/description/text', 'providerName'],
        },
        paperOptions: {
            clickThreshold: 10,
            overflow: true
        },
        groups,
        layout: {
            columns: 2,
            marginX: 0,
            marginY: 10,
            resizeToFit: false,
            rowGap: 10,
            columnGap: 10,
        }
    });
    
    stencil.render();
    stencil.el.style.height = '500px';
    stencil.el.style.position = 'relative';
    
    return stencil;
}
