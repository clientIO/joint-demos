import { g, ui } from '@joint/plus';
import { Attribute } from '../diagram/const';
import { config } from '../system/configs/system';
// Diagram
import { HdlCell } from '../diagram/models';
// Actions
import {
    removeModel,
    removeEdge,
    addInputNode,
    addOutputNode,
    addCellNode,
    appendCellNode,
    appendOutputNode,
    prependCellNode,
    prependInputNode,
    prependConstantNode,
    disconnectPort,
    insertCellNode,
    changeCellType
} from './diagram-actions';
import { openCellPicker } from './registry-actions';
import { selectModel } from './selection-actions';
import { startPortConnectionInteraction } from './connect-nodes';

import { State } from '../const';

import type { dia } from '@joint/plus';
import type { App } from '../app';
import type { Node, Edge, HdlNode } from '../diagram/models';

/**
 * Open the paper context menu when user right-clicks on empty space
 */
export function openPaperMenu(app: App, evt: dia.Event) {
    const { paper } = app;

    // The new nodes are placed at the pointer position
    const position = paper.clientToLocalPoint(evt.clientX!, evt.clientY!);

    const contextMenu = new ui.ContextToolbar({
        root: paper.el,
        tools: [
            { action: 'add-input', content: 'Add input port' },
            { action: 'add-output', content: 'Add output port' },
            { action: 'add-cell', content: 'Add cell…' },
        ],
        vertical: true,
        anchor: 'top-left',
        target: { x: evt.clientX!, y: evt.clientY! }
    });

    contextMenu.on('action:add-input', () => {
        contextMenu.remove();
        selectModel(app, addInputNode(app, position), { scrollIntoView: true });
    });

    contextMenu.on('action:add-output', () => {
        contextMenu.remove();
        selectModel(app, addOutputNode(app, position), { scrollIntoView: true });
    });

    contextMenu.on('action:add-cell', () => {
        contextMenu.remove();
        openCellPicker(app, {
            title: 'Add a cell',
            onSelect: (definition) => {
                selectModel(app, addCellNode(app, definition, position), { scrollIntoView: true });
            }
        });
    });

    contextMenu.render();
}

/**
 * Open the node menu when user clicks on a node's menu button
 */
export function openNodeMenu(app: App, node: Node, position: dia.Point) {
    const { paper } = app;

    const tools: ui.ContextToolbar.Options['tools'] = [];

    if (node instanceof HdlCell) {
        tools.push({ action: 'change', content: 'Change cell…' });
    }

    if (node.get(Attribute.Removable)) {
        tools.push({ action: 'delete', content: 'Delete' });
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
        openChangeCellPicker(app, node as HdlCell);
    });

    nodeMenu.render();
}

/**
 * Open the cell picker to change the type of the given cell
 */
export function openChangeCellPicker(app: App, cell: HdlCell) {
    openCellPicker(app, {
        title: 'Change the cell',
        onSelect: (definition) => {
            changeCellType(app, cell, definition);
        }
    });
}

/**
 * Open the port menu when user clicks on a port
 */
export function openPortMenu(app: App, node: HdlNode, options: { portId: string }) {
    const { portId } = options;
    const group = node.getPort(portId)?.group;
    if (group === config.outboundPortGroupName) {
        openOutputPortMenu(app, node, portId);
    } else {
        openInputPortMenu(app, node, portId);
    }
}

/**
 * The menu of an output port (adding nodes driven by the port).
 */
function openOutputPortMenu(app: App, node: HdlNode, portId: string) {
    const { paper, state } = app;

    const menuPortMargin = 8;

    const position = paper.localToClientPoint(node.getPortBBox(portId).rightMiddle().translate(menuPortMargin, 0));

    const tools = [
        { action: 'add-cell', content: 'Add cell…' },
        { action: 'add-output', content: 'Add output port' },
        { action: 'connect', content: 'Connect to input' },
    ];

    const portMenu = new ui.ContextToolbar({
        root: paper.el,
        tools,
        vertical: true,
        target: position,
        anchor: 'left',
    });

    portMenu.on('action:add-cell', () => {
        portMenu.remove();
        openCellPicker(app, {
            title: 'Add a cell driven by the port',
            onSelect: (definition) => {
                selectModel(app, appendCellNode(app, definition, node, portId), { scrollIntoView: true });
            }
        });
    });

    portMenu.on('action:add-output', () => {
        portMenu.remove();
        selectModel(app, appendOutputNode(app, node, portId), { scrollIntoView: true });
    });

    portMenu.on('action:connect', (evt: dia.Event) => {
        portMenu.remove();
        // Prevent the context menu if the user cancels the interaction
        // with right-click
        state.set(State.PointerCaptured, true);
        // Start connection interaction from the port
        const nodeView = paper.findViewByModel(node) as dia.ElementView;
        startPortConnectionInteraction(app, nodeView, evt, {
            onInteractionEnd: () => state.delete(State.PointerCaptured),
            portId
        });
    });

    portMenu.render();
}

/**
 * The menu of an input port (adding nodes driving the port).
 */
function openInputPortMenu(app: App, node: HdlNode, portId: string) {
    const { paper, graph } = app;

    const menuPortMargin = 8;

    const position = paper.localToClientPoint(node.getPortBBox(portId).leftMiddle().translate(-menuPortMargin, 0));

    const isDriven = graph.getConnectedLinks(node, { inbound: true }).some(link => link.target().port === portId);

    const tools = [
        { action: 'add-cell', content: 'Drive by a cell…' },
        { action: 'add-input', content: 'Drive by an input port' },
        { action: 'add-constant', content: 'Drive by a constant' },
    ];

    if (isDriven) {
        tools.push({ action: 'disconnect', content: 'Disconnect' });
    }

    const portMenu = new ui.ContextToolbar({
        root: paper.el,
        tools,
        vertical: true,
        target: position,
        anchor: 'right',
    });

    portMenu.on('action:add-cell', () => {
        portMenu.remove();
        openCellPicker(app, {
            title: 'Add a cell driving the port',
            onSelect: (definition) => {
                selectModel(app, prependCellNode(app, definition, node, portId), { scrollIntoView: true });
            }
        });
    });

    portMenu.on('action:add-input', () => {
        portMenu.remove();
        selectModel(app, prependInputNode(app, node, portId), { scrollIntoView: true });
    });

    portMenu.on('action:add-constant', () => {
        portMenu.remove();
        selectModel(app, prependConstantNode(app, node, portId), { scrollIntoView: true });
    });

    portMenu.on('action:disconnect', () => {
        portMenu.remove();
        disconnectPort(app, node, portId);
    });

    portMenu.render();
}

/**
 * Open the insert node menu when user clicks on a edge's button
 */
export function openEdgeMenu(app: App, edge: Edge, position: dia.Point) {
    const { paper } = app;

    const edgeMenuMargin = 15;

    const tools = [
        { action: 'insert-cell', content: 'Insert cell…' },
        { action: 'delete', content: 'Delete wire' }
    ];

    const edgeMenu = new ui.ContextToolbar({
        root: paper.el,
        tools,
        vertical: true,
        target: new g.Point(position).translate(edgeMenuMargin, 0),
        anchor: 'left',
    });

    edgeMenu.on('action:insert-cell', () => {
        edgeMenu.remove();
        openCellPicker(app, {
            title: 'Insert a cell',
            onSelect: (definition) => {
                selectModel(app, insertCellNode(app, definition, edge), { scrollIntoView: true });
            }
        });
    });

    edgeMenu.on('action:delete', () => {
        edgeMenu.remove();
        removeEdge(app, edge);
    });

    edgeMenu.render();
}
