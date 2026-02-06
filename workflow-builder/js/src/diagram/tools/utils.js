import { dia } from '@joint/plus';

/**
 * Get the center point of a tool view.
 */
export function getToolCenter(tool) {
    const bbox = tool.el.getBoundingClientRect();
    return {
        x: bbox.x + bbox.width / 2,
        y: bbox.y + bbox.height / 2
    };
}

/**
 * Adds the given tools to the cell view.
 */
export function addTools(cellView, tools, options) {
    if (tools.length === 0)
        return;
    
    const toolsView = new dia.ToolsView({ ...options, tools });
    cellView.addTools(toolsView);
}

