// Diagram
import { Attribute } from '../diagram/const';
import { Note } from '../diagram/models';
import { ResizeTool, InsertNodeTool, MenuTool } from '../diagram/tools';
// Actions
import { openEdgeMenu, openNodeMenu } from './menu-actions';
// Utils
import { addTools, getToolCenter } from '../diagram/tools/utils';

import type { dia } from '@joint/plus';
import type { App } from '../app';
import type { NodeView, EdgeView } from '../diagram/types';
import type { Node, Edge } from '../diagram/models';

/**
 * Adds hover tools to the given link view.
 */
export function addEdgeHoverTools(app: App, edgeView: EdgeView) {
    const insertNodeTool = new InsertNodeTool({
        action: (_evt, view, tool) => {
            openEdgeMenu(app, view.model as Edge, getToolCenter(tool));
        }
    });

    addTools(edgeView, [insertNodeTool]);
}

/**
 * Adds hover tools to the given node view.
 */
export function addNodeHoverTools(app: App, nodeView: NodeView) {
    const { diagramData } = app;

    const node = nodeView.model;
    const tools: dia.ToolView[] = [];

    // Add contextual menu tool if configured
    const contextMenuOptions = node.get(Attribute.ContextMenu);
    if (contextMenuOptions) {
        tools.push(new MenuTool({
            ...contextMenuOptions,
            action: (_, view, tool) => {
                openNodeMenu(app, view.model as Node, getToolCenter(tool));
            },
        }));
    }

    if (node instanceof Note) {
        tools.push(new ResizeTool({
            onResizeEnd: (size: dia.Size) => {
                diagramData.changeNode(node.id, { size });
            }
        }));
    }

    addTools(nodeView, tools);
}

/**
 * Removes all tools from the given cell view.
 */
export function removeCellTools(_app: App, cellView: dia.CellView) {

    cellView.removeTools();
}
