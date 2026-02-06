import { ui } from '@joint/plus';
// Diagram
import { Action, Trigger } from '../diagram/models';
// Registry
import { createRegistryKey, resolveActionProvider, resolveControlType, resolveTriggerProvider } from '../registry';
import { TriggerOption, ActionOption, ControlOption } from '../registry/models';

import { Control } from '../diagram/models';
import { openDialog } from './dialog-actions';

import type { dia } from '@joint/plus';
import type { App } from '../app';
import type { Configurable } from '../diagram/types';

/**
 * Open registry dialog to select or change the trigger/action/control
 * associated with the given node.
 */
export function openRegistryDialog(app: App, node: Configurable) {

    let groups: ui.Stencil.Options['groups'];
    let cells: { [groupName: string]: dia.Cell[] } | dia.Cell[];
    let title: string;
    let updateShape: (option: dia.Cell) => void;

    let stencil: ui.Stencil;

    switch (node.get('type')) {
        case Trigger.type:
            title = 'Select a trigger';
            ({ cells, groups } = createTriggersOptions(app));

            updateShape = (option: TriggerOption) => {
                const triggerKey = option.get('triggerKey');

                node.setConfigurationKey(triggerKey, { ui: true });
            };
            stencil = createStencil(app, groups);
            break;
        case Action.type:
            title = 'Select an action';
            ({ cells, groups } = createActionsOptions(app));

            updateShape = (option: ActionOption) => {
                const actionKey = option.get('actionKey');

                node.setConfigurationKey(actionKey, { ui: true });
            };
            stencil = createStencil(app, groups);
            break;
        case Control.type:
            title = 'Select a control';
            ({ cells } = createControlOptions(app));

            updateShape = (option: ControlOption) => {
                const controlKey = option.get('controlKey');

                node.setConfigurationKey(controlKey, { ui: true });
            };
            stencil = createStencil(app);
            break;
        default:
            throw new Error(`Dialog for shape type "${node.get('type')}" is not supported yet.`);
    }

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

    //@ts-ignore
    // TS can't select correct method overload between dia.Cell[] and {[groupName: string]: dia.Cell[]}
    stencil.load(cells);

    (stencil.el.querySelector('.search') as HTMLInputElement).focus();
}

/**
 * Refresh the action provider and action definition for the given action node
 * based on its current action key.
 */
export function refreshActionNodeConfiguration(app: App, node: Action) {
    const { config } = app;

    const definition = resolveActionProvider(config.actions, node.getConfigurationKey());
    if (definition) {
        const [provider, action] = definition;
        node.updateConfiguration({
            provider,
            action
        });
    } else {
        node.unsetConfiguration();
    }
}

/**
 * Refresh the trigger provider and trigger definition for the given trigger node
 * based on its current trigger key.
 */
export function refreshTriggerNodeConfiguration(app: App, node: Trigger) {
    const { config } = app;

    const definition = resolveTriggerProvider(config.triggers, node.getConfigurationKey());
    if (definition) {
        const [provider, trigger] = definition;
        node.updateConfiguration({
            provider,
            trigger
        });
    } else {
        node.unsetConfiguration();
    }
}

/**
 * Refresh the control definition for the given control node
 */
export function refreshControlNodeConfiguration(app: App, node: Control) {
    const { config } = app;

    const definition = resolveControlType(config.controls, node.getConfigurationKey());
    if (definition) {
        node.updateConfiguration({ control: definition });
    } else {
        node.unsetConfiguration();
    }
}


// Helper functions

/**
 * Create stencil options for all available actions in the app configuration.
 */
function createTriggersOptions(app: App) {
    const { config } = app;
    const registry = config.triggers;
    const cells: { [groupName: string]: dia.Element[] } = {};
    const groups: { [groupName: string]: ui.Stencil.Group } = {};

    for (const providerId in registry) {
        const provider = registry[providerId];
        cells[providerId] = [];
        groups[providerId] = {
            label: provider.name,
            index: Object.keys(groups).length + 1
        };
        // Create a TriggerOption for each trigger
        provider.triggers.forEach((trigger) => {
            const triggerOption = new TriggerOption({
                providerName: provider.name, // For search purposes
                triggerKey: createRegistryKey(providerId, trigger.id),
                attrs: {
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
function createActionsOptions(app: App) {
    const { config } = app;
    const registry = config.actions;
    const cells: { [groupName: string]: dia.Element[] } = {};
    const groups: { [groupName: string]: ui.Stencil.Group } = {};

    for (const providerId in registry) {
        const provider = registry[providerId];
        cells[providerId] = [];
        groups[providerId] = {
            label: provider.name,
            index: Object.keys(groups).length + 1
        };
        // Create an ActionOption for each action
        provider.actions.forEach((action) => {
            const actionOption = new ActionOption({
                providerName: provider.name, // For search purposes
                actionKey: createRegistryKey(providerId, action.id),
                attrs: {
                    icon: {
                        href: `assets/icons/providers/${ provider.icon }`
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
 * Create stencil options for all available controls in the app configuration.
 */
function createControlOptions(app: App) {
    const { config } = app;
    const registry = config.controls;
    const cells: ControlOption[] = [];

    for (const controlTypeId in registry) {
        const controlType = registry[controlTypeId];
        const controlOption = new ControlOption({
            controlKey: controlTypeId,
            attrs: {
                icon: {
                    href: `assets/icons/controls/${controlType.icon}`
                },
                label: {
                    text: controlType.name
                },
                description: {
                    text: controlType.description
                }
            }
        });

        cells.push(controlOption);
    }
    return { cells };
}

/**
 * Create a stencil instance with the given groups.
 */
function createStencil(app: App, groups?: ui.Stencil.Options['groups']): ui.Stencil {
    const stencil =  new ui.Stencil({
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
