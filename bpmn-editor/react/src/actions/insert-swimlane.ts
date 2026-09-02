import { HorizontalSwimlane, VerticalSwimlane } from '../shapes/pool/pool-shapes';

import type { shapes } from '@joint/plus';
import type { BpmnSwimlane } from '../shapes/pool/pool-shapes';

/**
 * Keyboard counterpart of the swimlane drop: a lane only exists inside a
 * pool, so insert a new lane (matching the pool's orientation) into the
 * given pool, at `index` when given and appended otherwise. Returns the
 * inserted lane.
 */
export function insertSwimlaneIntoPool(pool: shapes.bpmn2.CompositePool, index?: number): BpmnSwimlane {

    const swimlane = pool.isHorizontal() ? new HorizontalSwimlane() : new VerticalSwimlane();

    pool.addSwimlane(swimlane, index);

    return swimlane;
}

/**
 * Puts a dragged lane into the pool it was dropped on, at the index the drop
 * point names. A lane only lives inside a pool, so a drop that names none
 * removes the lane — unless it already had a pool to go back to. A lane whose
 * orientation the pool refuses is replaced by one that fits.
 *
 * Returns the lane that ended up in the pool, or nothing where none did.
 */
export function dropSwimlaneIntoPool(
    swimlane: shapes.bpmn2.Swimlane,
    pool: shapes.bpmn2.CompositePool | null,
    x: number,
    y: number
) {
    if (!pool) {
        // The swimlane is not dropped into a pool.
        if (!swimlane.isEmbedded()) {
            // Remove the swimlane if it is not embedded in any pool.
            swimlane.remove();
        }
        return;
    }

    let compatibleSwimlane = swimlane;
    if (!swimlane.isCompatibleWithPool(pool)) {
        // Swimlane orientation is incompatible with pool orientation.
        // Remove it and replace it with a new one.
        swimlane.remove();
        compatibleSwimlane = pool.isHorizontal()
            ? new HorizontalSwimlane()
            : new VerticalSwimlane();
    }

    const insertIndex = pool.getSwimlaneInsertIndexFromPoint({ x, y });
    pool.addSwimlane(compatibleSwimlane, insertIndex);

    return compatibleSwimlane;
}
