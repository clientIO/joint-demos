import { isPoolBoundaryRequired, sizePoolToContent } from '../utils';
import { insertSwimlaneIntoPool } from './insert-swimlane';
import { SWIMLANE_HEADER_SIZE } from '../shapes/pool/pool-config';

import type { dia, g } from '@joint/plus';
import type { BpmnPool, BpmnSwimlane } from '../shapes/pool/pool-shapes';

/**
 * Finalizes a pool the pointer dropped on the paper: it is already in the
 * graph, so it only wants the lane every pool must have, and the position the
 * drag settled on. A drop with no position is left where the pointer put it.
 */
export function placeDroppedPool(graph: dia.Graph, pool: BpmnPool, at: g.PlainPoint | null) {

    const swimlane = insertSwimlaneIntoPool(pool);

    if (!at) return;

    placePoolAt(graph, pool, swimlane, at.x, at.y);
}

/**
 * Keyboard counterpart of the pool drop: adds the pool to the graph with
 * its mandatory first swimlane. The content wrap applies only to the FIRST
 * pool (mirroring `onPoolDragStart`'s boundary check — the pointer flow
 * never wraps once a pool exists): the pool is sized to the loose content
 * and placed over it; otherwise it lands at the given position as-is.
 */
export function dropPoolAt(graph: dia.Graph, pool: BpmnPool, x: number, y: number) {

    // Sized before the pool is added, so it is not counted as the pool whose
    // presence makes the wrap unnecessary.
    const content = sizePoolToContent(graph, pool);

    graph.addCell(pool);
    const swimlane = insertSwimlaneIntoPool(pool);

    if (!content) {
        // Nothing to wrap, so the pool lands where it was asked for. It cannot
        // go through `placePoolAt()`: that embeds every loose element, and a
        // second pool would take the first one's shapes with it.
        let dx = 0;
        let dy = 0;
        if (pool.isHorizontal()) {
            dx = SWIMLANE_HEADER_SIZE;
        } else {
            dy = SWIMLANE_HEADER_SIZE;
        }
        swimlane.position(x + dx, y + dy);
        pool.position(x, y);
        return;
    }

    // The first pool: over the content it now holds, at the size it was given.
    const { graphBBox } = content;
    placePoolAt(graph, pool, swimlane, graphBBox?.x ?? x, graphBBox?.y ?? y);
}

/**
 * Finalizes a newly added pool at the given position: positions the pool
 * and its swimlane and embeds the loose diagram content (the pool must
 * contain everything). Shared by the pointer drop and the keyboard path.
 */
function placePoolAt(graph: dia.Graph, pool: BpmnPool, swimlane: BpmnSwimlane, x: number, y: number) {

    const batchName = 'pool-preview-replace';

    let dx = 0;
    let dy = 0;

    if (pool.isHorizontal()) {
        dx = SWIMLANE_HEADER_SIZE;
    } else {
        dy = SWIMLANE_HEADER_SIZE;
    }

    graph.startBatch(batchName);

    swimlane.position(x + dx, y + dy);
    pool.position(x, y);

    // Embed all elements in the graph to the swimlane
    const poolBoundaryElements = graph.getElements().filter(isPoolBoundaryRequired);

    // Move all elements to the relative position
    poolBoundaryElements.forEach((boundaryElement) => {

        boundaryElement.toFront();

        if (boundaryElement.get('type').includes('Boundary')) {
            // Skip embedding the boundary elements to the swimlane, since they are embedded to the activity
            return;
        }

        swimlane.embed(boundaryElement);
    });

    graph.getLinks().forEach((link) => {
        link.toFront();
    });

    graph.stopBatch(batchName);
}
