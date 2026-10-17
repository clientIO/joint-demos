import { dia } from '@joint/plus';

/**
 * Get the center point of a tool view.
 */
export function getToolCenter(tool: dia.ToolView): dia.Point {
    const bbox = tool.el.getBoundingClientRect();
    return {
        x: bbox.x + bbox.width / 2,
        y: bbox.y + bbox.height / 2
    };
}

/**
 * Adds the given tools to the cell view.
 */
export function addTools(cellView: dia.CellView, tools: dia.ToolView[], options?: dia.ToolsView.Options): dia.ToolsView | null {
    if (tools.length === 0) return null;

    const toolsView = new dia.ToolsView({ ...options, tools });
    cellView.addTools(toolsView);
    return toolsView;
}

/**
 * Is the given DOM element (e.g. the element the pointer moved to) a part of a tool?
 */
export function isToolElement(target: EventTarget | null | undefined): boolean {
    return target instanceof Element && Boolean(target.closest('.joint-tools'));
}


/**
 * Pending (delayed) removals of the hover tools, by cell view.
 */
const pendingRemovals = new WeakMap<dia.CellView, number>();

/**
 * Run the removal of the hover tools after a short delay. It gives the pointer
 * time to get from the cell to its tools across a gap (e.g. moving diagonally to a button).
 */
export function scheduleToolsRemoval(cellView: dia.CellView, remove: () => void, delay = 300) {
    cancelToolsRemoval(cellView);
    pendingRemovals.set(cellView, window.setTimeout(() => {
        pendingRemovals.delete(cellView);
        remove();
    }, delay));
}

/**
 * Cancel the delayed removal of the hover tools (e.g. the pointer reached the tools).
 */
export function cancelToolsRemoval(cellView: dia.CellView) {
    const timeout = pendingRemovals.get(cellView);
    if (timeout === undefined) return;
    window.clearTimeout(timeout);
    pendingRemovals.delete(cellView);
}
