/* Small utility functions. */

import { type dia, shapes } from '@joint/plus';

// Find element view of a specific type under the event's client coordinates.
export function findViewFromEvent(paper: dia.Paper, evt: dia.Event, types: string[]) {
    const { clientX, clientY } = evt;
    const els =  Array.from(document.elementsFromPoint(clientX, clientY));
    const index = els.findIndex((el) => {
        const view = paper.findView(el);
        if (!view) return false;
        const elementType = view.model.get('type');
        return types.indexOf(elementType) !== -1;
    });
    if (index === -1) return null;
    const el = els[index];
    return paper.findView(el);
}

// Remove a cell from the graph.
export function removeCell(cell: dia.Cell) {
    const pool = cell.getParentCell() as shapes.bpmn2.CompositePool | null; // `null` for CompositePools and elements
    if (shapes.bpmn2.Swimlane.isSwimlane(cell)) pool.removeSwimlane(cell as shapes.bpmn2.Swimlane);
    else if (shapes.bpmn2.Phase.isPhase(cell)) pool.removePhase(cell as shapes.bpmn2.Phase);
    else cell.remove();
}

export function isStencilEvent(evt: dia.Event): boolean {
    return !!evt.data?.isStencilEvent;
}

export function setStencilEvent(evt: dia.Event, isStencilEvent: boolean): void {
    if (!evt.data) {
        evt.data = {};
    }
    evt.data.isStencilEvent = isStencilEvent;
}

