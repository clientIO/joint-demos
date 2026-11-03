// Diagram
import { Attribute } from '../diagram/const';
import { InsertNodeTool, MenuTool } from '../diagram/tools';
// Actions
import { openEdgeMenu, openNodeMenu } from './menu-actions';
// Utils
import { addTools, getToolCenter, cancelToolsRemoval } from '../diagram/tools/utils';

import type { dia } from '@joint/plus';
import type { App } from '../app';
import type { NodeView, EdgeView } from '../diagram/types';
import type { Node, Edge } from '../diagram/models';

/**
 * Adds hover tools to the given link view.
 */
export function addEdgeHoverTools(app: App, edgeView: EdgeView, onLeave?: () => void) {
    const insertNodeTool = new InsertNodeTool({
        action: (_evt, view, tool) => {
            openEdgeMenu(app, view.model as Edge, getToolCenter(tool));
        }
    });

    const toolsView = addTools(edgeView, [insertNodeTool]);
    callOnToolsLeave(edgeView, toolsView, onLeave);
}

/**
 * Adds hover tools to the given node view.
 */
export function addNodeHoverTools(app: App, nodeView: NodeView, onLeave?: () => void) {
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

    const toolsView = addTools(nodeView, tools);
    callOnToolsLeave(nodeView, toolsView, onLeave);
}

/**
 * The tools are rendered outside of the cell view. When the pointer moves from the cell
 * to its tools, the tools are kept (see `DiagramController`). This calls `onLeave`
 * when the pointer leaves the tools to anywhere else than the cell.
 */
function callOnToolsLeave(cellView: dia.CellView, toolsView: dia.ToolsView | null, onLeave?: () => void) {
    if (!toolsView || !onLeave) return;
    // The pointer reached the tools: keep them
    toolsView.el.addEventListener('mouseenter', () => cancelToolsRemoval(cellView));
    toolsView.el.addEventListener('mouseleave', (evt: MouseEvent) => {
        if (evt.relatedTarget instanceof Element && cellView.el.contains(evt.relatedTarget)) return;
        onLeave();
    });
}

/**
 * Removes all tools from the given cell view.
 */
export function removeCellTools(_app: App, cellView: dia.CellView) {

    cellView.removeTools();
}
