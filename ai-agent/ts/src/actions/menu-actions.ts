import { ui } from '@joint/plus';
import { State } from '../const';
import { Attribute } from '../diagram/const';
// Diagram
import type { Node, Edge } from '../diagram/models';
import { Trigger, Action } from '../diagram/models';
// Actions
import { startButtonConnectionInteraction } from '../system/actions/connect-nodes';
import {
    removeModel,
    addDefaultNoteNode,
    appendDefaultActionNode,
    appendDefaultAgentNode,
    appendDefaultConditionNode,
    insertDefaultActionNode,
    insertDefaultAgentNode,
    insertDefaultConditionNode,
    replaceWithDefaultActionNode,
    replaceWithDefaultAgentNode,
    replaceWithDefaultConditionNode
} from './diagram-actions';
import { openProviderRegistryDialog } from './registry-actions';
import { selectModel } from './selection-actions';
import { openNoteEditor } from './notes-actions';

import type { dia } from '@joint/plus';
import type { App } from '../app';
import type { SystemButton, SystemPlaceholder } from '../system/diagram/models';

/**
 * Open the paper context menu when user right-clicks on empty space
 */
export function openPaperMenu(app: App, evt: dia.Event) {
    const { paper } = app;

    const contextMenu = new ui.ContextToolbar({
        root: paper.el,
        tools: [
            { action: 'note', content: 'Create a note' },
        ],
        vertical: true,
        anchor: 'top-left',
        target: { x: evt.clientX!, y: evt.clientY! }
    });

    contextMenu.on('action:note', () => {
        contextMenu.remove();
        // Add a note at the pointer position and start editing it immediately
        const addedNode = addDefaultNoteNode(app, paper.clientToLocalPoint(evt.clientX!, evt.clientY!));
        openNoteEditor(app, addedNode);
    });

    contextMenu.render();
}

/**
 * Open the node menu when user clicks on a node's menu button
 */
export function openNodeMenu(app: App, node: Node, position: dia.Point) {
    const { paper } = app;

    const tools: ui.ContextToolbar.Options['tools'] = [];

    if (node.get(Attribute.Removable)) {
        tools.push({ action: 'delete', content: 'Delete' });
    }

    if (node instanceof Trigger) {
        tools.push({
            action: 'change',
            content: node.isConfigured() ? 'Change Trigger' : 'Select Trigger'
        });
    } else if (node instanceof Action) {
        tools.push({
            action: 'change',
            content: node.isConfigured() ? 'Change Action' : 'Select Action'
        });
    }

    const nodeMenu = new ui.ContextToolbar({
        root: paper.el,
        tools: tools,
        vertical: true,
        anchor: 'top-left',
        target: position
    });

    nodeMenu.on('action:delete', () => {
        nodeMenu.remove();

        removeModel(app, node);
    });

    nodeMenu.on('action:change', () => {
        nodeMenu.remove();
        // Open the shape picker to change the node's trigger/action
        openProviderRegistryDialog(app, node);
    });

    nodeMenu.render();
}

/**
 * Open the add node menu when user clicks on a button
 */
export function openButtonMenu(app: App, button: SystemButton) {
    const { paper, state } = app;

    // Position the menu at the bottom middle of the button
    const position = paper.localToClientPoint(button.getBBox().bottomMiddle());

    const tools = [
        { action: 'add-action', content: 'Perform an action' },
        { action: 'add-condition', content: 'Condition' },
        { action: 'add-agent', content: 'Enter AI agent' },
        { action: 'connect', content: 'Connect to node' }
    ];

    const buttonMenu = new ui.ContextToolbar({
        root: paper.el,
        tools,
        vertical: true,
        target: position
    });

    buttonMenu.on('action:add-action', () => {
        buttonMenu.remove();
        // Create an action node and open the shape picker
        const addedNode = appendDefaultActionNode(app, button);
        selectModel(app, addedNode, { scrollIntoView: true });
        openProviderRegistryDialog(app, addedNode);
    });

    buttonMenu.on('action:add-condition', () => {
        buttonMenu.remove();
        // Create a condition node and open the shape picker
        const addedNode = appendDefaultConditionNode(app, button);
        selectModel(app, addedNode, { scrollIntoView: true });
    });

    buttonMenu.on('action:add-agent', () => {
        buttonMenu.remove();
        // Create an agent node and open the shape picker
        const addedNode = appendDefaultAgentNode(app, button);
        selectModel(app, addedNode, { scrollIntoView: true });
        openProviderRegistryDialog(app, addedNode);
    });

    buttonMenu.on('action:connect', (evt: dia.Event) => {
        buttonMenu.remove();
        // Prevent the context menu if the user cancels the interaction
        // with right-click
        state.set(State.PointerCaptured, true);
        // Start connection interaction from the button view
        const buttonView = paper.findViewByModel(button) as dia.ElementView;
        startButtonConnectionInteraction(app, buttonView, evt, {
            onInteractionEnd: () => state.delete(State.PointerCaptured)
        });
    });

    buttonMenu.render();
}

/**
 * Open the add node menu when user clicks on a placeholder node
 */
export function openPlaceholderMenu(app: App, placeholder: SystemPlaceholder) {
    const { paper } = app;

    // Position the menu at the bottom middle of the button
    const position = paper.localToClientPoint(placeholder.getBBox().bottomMiddle());

    const tools = [
        { action: 'add-action', content: 'Perform an action' },
        { action: 'add-condition', content: 'Condition' },
        { action: 'add-agent', content: 'Enter AI agent' },
    ];

    const buttonMenu = new ui.ContextToolbar({
        root: paper.el,
        tools,
        vertical: true,
        target: position
    });

    buttonMenu.on('action:add-action', () => {
        buttonMenu.remove();
        // Create an action node and open the shape picker
        const addedNode = replaceWithDefaultActionNode(app, placeholder);
        selectModel(app, addedNode, { scrollIntoView: true });
        openProviderRegistryDialog(app, addedNode);
    });

    buttonMenu.on('action:add-condition', () => {
        buttonMenu.remove();
        // Create a condition node and open the shape picker
        const addedNode = replaceWithDefaultConditionNode(app, placeholder);
        selectModel(app, addedNode, { scrollIntoView: true });
    });

    buttonMenu.on('action:add-agent', () => {
        buttonMenu.remove();
        // Create an agent node and open the shape picker
        const addedNode = replaceWithDefaultAgentNode(app, placeholder);
        selectModel(app, addedNode, { scrollIntoView: true });
        openProviderRegistryDialog(app, addedNode);
    });

    buttonMenu.render();
}

/**
 * Open the insert node menu when user clicks on a edge's button
 */
export function openEdgeMenu(app: App, edge: Edge, position: dia.Point) {
    const { paper } = app;

    const tools = [
        { action: 'add-action', content: 'Perform an action' },
        { action: 'add-condition', content: 'Condition' },
        { action: 'add-agent', content: 'Enter AI agent' },
    ];

    const edgeMenu = new ui.ContextToolbar({
        root: paper.el,
        tools,
        vertical: true,
        target: position
    });

    edgeMenu.on('action:add-action', () => {
        edgeMenu.remove();
        // Create an action node, select it, and immediately open the shape picker
        const insertedNode = insertDefaultActionNode(app, edge);
        selectModel(app, insertedNode, { scrollIntoView: true });
        openProviderRegistryDialog(app, insertedNode);
    });

    edgeMenu.on('action:add-condition', () => {
        edgeMenu.remove();
        // Create a condition node and select it
        const insertedNode = insertDefaultConditionNode(app, edge);
        selectModel(app, insertedNode, { scrollIntoView: true });
    });

    edgeMenu.on('action:add-agent', () => {
        edgeMenu.remove();
        // Create an agent node and select it
        const insertedNode = insertDefaultAgentNode(app, edge);
        selectModel(app, insertedNode, { scrollIntoView: true });
    });

    edgeMenu.render();
}
