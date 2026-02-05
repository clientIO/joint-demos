import { g } from '@joint/core';
import { Attribute } from './const';

/**
 * Calculate the custom position of an element relative to a reference element.
 * If the reference element is not found, returns absolute position.
 */
export function getCustomPosition(graph, elementPoint, refId) {
    const position = { refId, x: 0, y: 0 };
    let refPoint = null;
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
export function setCustomPosition(graph, element) {
    const position = element.get(Attribute.CustomPosition);
    if (!position)
        return;
    const { refId, x = 0, y = 0 } = position;
    let refPoint = null;
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
