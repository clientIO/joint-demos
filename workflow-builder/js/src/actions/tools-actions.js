// Diagram
import { Attribute } from '../diagram/const';
import { Note } from '../diagram/models';
import { ResizeTool, InsertNodeTool, MenuTool } from '../diagram/tools';
// Actions
import { openEdgeMenu, openNodeMenu } from './menu-actions';
// Utils
import { addTools, getToolCenter } from '../diagram/tools/utils';

/**
 * Adds hover tools to the given link view.
 */
export function addEdgeHoverTools(app, edgeView) {
    const insertNodeTool = new InsertNodeTool({
        action: (_evt, view, tool) => {
            openEdgeMenu(app, view.model, getToolCenter(tool));
        }
    });
    
    addTools(edgeView, [insertNodeTool]);
}

/**
 * Adds hover tools to the given node view.
 */
export function addNodeHoverTools(app, nodeView) {
    const { diagramData } = app;
    
    const node = nodeView.model;
    const tools = [];
    
    // Add contextual menu tool if configured
    const contextMenuOptions = node.get(Attribute.ContextMenu);
    if (contextMenuOptions) {
        tools.push(new MenuTool({
            ...contextMenuOptions,
            action: (_, view, tool) => {
                openNodeMenu(app, view.model, getToolCenter(tool));
            },
        }));
    }
    
    if (node instanceof Note) {
        tools.push(new ResizeTool({
            onResizeEnd: (size) => {
                diagramData.changeNode(node.id, { size });
            }
        }));
    }
    
    addTools(nodeView, tools);
}

/**
 * Removes all tools from the given cell view.
 */
export function removeCellTools(_app, cellView) {
    
    cellView.removeTools();
}
