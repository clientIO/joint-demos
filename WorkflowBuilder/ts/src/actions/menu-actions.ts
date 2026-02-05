import { g, ui } from '@joint/plus';
import { Attribute } from '../diagram/const';
// Diagram
import {
    Trigger,
    Action,
    Control,
} from '../diagram/models';
// Actions
import {
    removeModel,
    addDefaultNoteNode,
    appendDefaultActionNode,
    appendDefaultControlNode,
    insertDefaultActionNode,
    insertDefaultControlNode,
    addDefaultTriggerNode
} from './diagram-actions';
import { openRegistryDialog } from './registry-actions';
import { selectModel } from './selection-actions';
import { openNoteEditor } from './notes-actions';

import { State } from '../const';
import { startPortConnectionInteraction } from './connect-nodes';

import type { dia } from '@joint/plus';
import type { App } from '../app';
import type DiagramNode from '../diagram/models/DiagramNode';
import type { Node, Edge } from '../diagram/models';
import type { Configurable } from '../diagram/types';

/**
 * Open the paper context menu when user right-clicks on empty space
 */
export function openPaperMenu(app: App, evt: dia.Event) {
    const { paper } = app;

    const contextMenu = new ui.ContextToolbar({
        root: paper.el,
        tools: [
            { action: 'add-note', content: 'Create a note' },
            { action: 'add-trigger', content: 'Add a trigger' },
        ],
        vertical: true,
        anchor: 'top-left',
        target: { x: evt.clientX!, y: evt.clientY! }
    });

    contextMenu.on('action:add-note', () => {
        contextMenu.remove();
        // Add a note at the pointer position and start editing it immediately
        const addedNode = addDefaultNoteNode(app, paper.clientToLocalPoint(evt.clientX!, evt.clientY!));
        openNoteEditor(app, addedNode);
    });

    contextMenu.on('action:add-trigger', () => {
        contextMenu.remove();
        // Create a trigger node and open the trigger picker
        const addedNode = addDefaultTriggerNode(app);
        selectModel(app, addedNode, { scrollIntoView: true });
        openRegistryDialog(app, addedNode);
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

    if (node.get(Attribute.Configurable)) {
        const configurableNode = node as Configurable;

        switch (node.get('type')) {
            case Trigger.type:
                tools.push({
                    action: 'change',
                    content: configurableNode.isConfigured() ? 'Change Trigger' : 'Select Trigger'
                });
                break;
            case Action.type:
                tools.push({
                    action: 'change',
                    content: configurableNode.isConfigured() ? 'Change Action' : 'Select Action'
                });
                break;
            case Control.type:
                tools.push({
                    action: 'change',
                    content: configurableNode.isConfigured() ? 'Change Control' : 'Select Control'
                });
                break;
        }
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
        openRegistryDialog(app, node as Configurable);
    });

    nodeMenu.render();
}

/**
 * Open the add node menu when user clicks on a button
 */
export function openPortMenu(app: App, node: DiagramNode, options: { portId: string }) {
    const { paper, state } = app;

    const menuPortMargin = 5;

    const position = paper.localToClientPoint(node.getPortBBox(options.portId || '').rightMiddle().translate(menuPortMargin, 0));

    const tools = [
        { action: 'add-action', content: 'Perform an action' },
        { action: 'add-control', content: 'Add control node' },
        { action: 'connect', content: 'Connect to node' },
    ];

    const buttonMenu = new ui.ContextToolbar({
        root: paper.el,
        tools,
        vertical: true,
        target: position,
        anchor: 'left',
    });

    buttonMenu.on('action:add-action', () => {
        buttonMenu.remove();
        // Create an action node and open the shape picker
        const addedNode = appendDefaultActionNode(app, node, {
            sourcePortId: options.portId
        });
        selectModel(app, addedNode, { scrollIntoView: true });
        openRegistryDialog(app, addedNode);
    });

    buttonMenu.on('action:add-control', () => {
        buttonMenu.remove();
        // Create a condition node and open the shape picker
        const addedNode = appendDefaultControlNode(app, node, {
            sourcePortId: options.portId
        });
        selectModel(app, addedNode, { scrollIntoView: true });
        openRegistryDialog(app, addedNode);
    });

    buttonMenu.on('action:connect', (evt: dia.Event) => {
        buttonMenu.remove();
        // Prevent the context menu if the user cancels the interaction
        // with right-click
        state.set(State.PointerCaptured, true);
        // Start connection interaction from the button view
        const nodeView = paper.findViewByModel(node) as dia.ElementView;
        startPortConnectionInteraction(app, nodeView, evt, {
            onInteractionEnd: () => state.delete(State.PointerCaptured),
            portId: options.portId
        });
    });


    buttonMenu.render();
}

/**
 * Open the insert node menu when user clicks on a edge's button
 */
export function openEdgeMenu(app: App, edge: Edge, position: dia.Point) {
    const { paper } = app;

    const edgeMenuMargin = 15;

    const tools = [
        { action: 'add-action', content: 'Perform an action' },
        { action: 'add-control', content: 'Add control node' }
    ];

    const edgeMenu = new ui.ContextToolbar({
        root: paper.el,
        tools,
        vertical: true,
        target: new g.Point(position).translate(edgeMenuMargin, 0),
        anchor: 'left',
    });

    edgeMenu.on('action:add-action', () => {
        edgeMenu.remove();
        // Create an action node, select it, and immediately open the shape picker
        const insertedNode = insertDefaultActionNode(app, edge);
        selectModel(app, insertedNode, { scrollIntoView: true });
        openRegistryDialog(app, insertedNode);
    });

    edgeMenu.on('action:add-control', () => {
        edgeMenu.remove();
        // Create a condition node and select it
        const insertedNode = insertDefaultControlNode(app, edge);
        selectModel(app, insertedNode, { scrollIntoView: true });
        openRegistryDialog(app, insertedNode);
    });

    edgeMenu.render();
}
