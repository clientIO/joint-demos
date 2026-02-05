/* Small utility functions. */

import { shapes } from '@joint/plus';

// Find element view of a specific type under the event's client coordinates.
export function findViewFromEvent(paper, evt, types) {
    const { clientX, clientY } = evt;
    const els = Array.from(document.elementsFromPoint(clientX, clientY));
    const index = els.findIndex((el) => {
        const view = paper.findView(el);
        if (!view)
            return false;
        const elementType = view.model.get('type');
        return types.indexOf(elementType) !== -1;
    });
    if (index === -1)
        return null;
    const el = els[index];
    return paper.findView(el);
}

// Remove a cell from the graph.
export function removeCell(cell) {
    const pool = cell.getParentCell(); // `null` for CompositePools and elements
    if (shapes.bpmn2.Swimlane.isSwimlane(cell))
        pool.removeSwimlane(cell);
    else if (shapes.bpmn2.Phase.isPhase(cell))
        pool.removePhase(cell);
    else
        cell.remove();
}

export function isStencilEvent(evt) {
    var _a;
    return !!((_a = evt.data) === null || _a === void 0 ? void 0 : _a.isStencilEvent);
}

export function setStencilEvent(evt, isStencilEvent) {
    if (!evt.data) {
        evt.data = {};
    }
    evt.data.isStencilEvent = isStencilEvent;
}

