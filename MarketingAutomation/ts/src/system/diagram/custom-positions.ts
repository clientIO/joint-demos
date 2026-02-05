import type { dia } from '@joint/core';
import { g } from '@joint/core';
import { Attribute } from './const';

import type { NodeCustomPosition } from './types';

/**
 * Calculate the custom position of an element relative to a reference element.
 * If the reference element is not found, returns absolute position.
 */
export function getCustomPosition(graph: dia.Graph, elementPoint: dia.Point, refId?: dia.Cell.ID): NodeCustomPosition {
    const position: NodeCustomPosition = { refId, x: 0, y: 0 };
    let refPoint: dia.Point | null = null;
    if (refId) {
        const refElement = graph.getCell(refId);
        if (refElement) {
            refPoint = refElement.getBBox().center();
        }
    }
    if (!refPoint) {
        return { x: elementPoint.x, y: elementPoint.y };
    }
    position.x = elementPoint.x - refPoint.x;
    position.y = elementPoint.y - refPoint.y;
    return position;
}

/**
 * Set the position of an element based on its custom position attribute.
 */
export function setCustomPosition(graph: dia.Graph, element: dia.Element): void {
    const position = element.get(Attribute.CustomPosition);
    if (!position) return;
    const { refId, x = 0, y = 0 } = position;
    let refPoint: g.Point | null = null;
    if (refId) {
        const refElement = graph.getCell(refId);
        if (refElement) {
            refPoint = refElement.getBBox().center();
        }
    }
    if (!refPoint) {
        refPoint = new g.Point(0, 0);
    }

    element.position(refPoint.x + x, refPoint.y + y);
}
