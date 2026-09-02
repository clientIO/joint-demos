import { g } from '@joint/plus';
import { getPoolParent, getSwimlaneParent, isPool, isSwimlane } from './elements';

import type { dia } from '@joint/plus';
import type { BpmnPool, BpmnSwimlane } from '../shapes/pool/pool-shapes';

export type Direction = 'right' | 'left' | 'down' | 'up';

/**
 * The diagram's pools in the order they read on screen (left to right, then
 * top to bottom), so stepping through them with the keyboard follows what
 * the eye sees rather than the order they were added in.
 */
export function getPoolsInOrder(graph: dia.Graph): BpmnPool[] {
    return graph.getElements()
        .filter(isPool)
        .sort((a, b) => {
            const from = a.position();
            const to = b.position();
            return from.x - to.x || from.y - to.y;
        });
}

/**
 * The pool to start aiming from, the counterpart of `findDropSwimlane()`:
 * the pool the selection is in, else the pool under the point, else the
 * first pool. `null` when the diagram has no pool.
 *
 * Like its counterpart this only seeds the aim — the arrows step it from
 * here, and the insertion preview shows where a lane would land.
 */
export function findDropPool(graph: dia.Graph, selection: dia.Cell[], point: g.PlainPoint): BpmnPool | null {

    for (const cell of selection) {
        const pool = isPool(cell) ? cell : getPoolParent(cell);
        if (pool) return pool;
    }

    const pools = graph.getElements().filter(isPool);

    return pools.find((pool) => pool.getBBox().containsPoint(point)) ?? pools[0] ?? null;
}

/**
 * The lane to start aiming from when the palette takes the focus: the lane
 * the selection is in, else the lane under the point, else the first lane.
 * `null` only when the diagram has no lanes at all.
 *
 * This is a seed, not a decision — the arrows step the aim from here and
 * the highlight shows it before anything is added. The selection comes
 * first because it is the one thing that says where the user was working;
 * the point (the middle of the view) is a weaker guess behind it.
 */
export function findDropSwimlane(graph: dia.Graph, selection: dia.Cell[], point: g.PlainPoint): BpmnSwimlane | null {

    for (const cell of selection) {
        const lane = isSwimlane(cell) ? cell : getSwimlaneParent(cell);
        if (lane) return lane;
    }

    const lanes = graph.getElements().filter(isSwimlane);

    return lanes.find((lane) => lane.getBBox().containsPoint(point)) ?? lanes[0] ?? null;
}

/**
 * A free spot for a new shape on the given side of `source`, sliding along
 * the other axis until it clears whatever is already there — a fixed offset
 * would drop it on top of the next shape in the flow.
 */
export function findFreeSpotBeside(
    graph: dia.Graph,
    source: dia.Element,
    size: dia.Size,
    gap: number,
    direction: Direction = 'right'
): g.PlainPoint {

    const bbox = source.getBBox();
    const horizontal = direction === 'left' || direction === 'right';

    // Fixed on the axis the direction runs along, centred on the other.
    let x = horizontal
        ? (direction === 'right' ? bbox.x + bbox.width + gap : bbox.x - gap - size.width)
        : bbox.x + (bbox.width - size.width) / 2;
    let y = horizontal
        ? bbox.y + (bbox.height - size.height) / 2
        : (direction === 'down' ? bbox.y + bbox.height + gap : bbox.y - gap - size.height);

    // Only what shares the source's lane can be in the way: the neighbour is
    // embedded in that lane, and the lane grows to hold it, so nothing there
    // ends up overlapped. Counting another lane's shapes slid the neighbour
    // past empty space — and where the spot falls outside the lane, another
    // pool's shapes cannot be avoided by sliding anyway, since the pool
    // occupies that ground whatever we do. A source outside every lane is
    // measured against the other loose shapes.
    const lane = getSwimlaneParent(source);
    const others = graph.getElements().filter((element) => element !== source
        && !isSwimlane(element)
        && !isPool(element)
        && getSwimlaneParent(element) === lane);

    // Bounded: give up rather than loop if everything around is taken.
    for (let attempt = 0; attempt < 20; attempt++) {
        const candidate = new g.Rect(x, y, size.width, size.height).inflate(gap / 2);
        if (!others.some((element) => candidate.intersect(element.getBBox()))) break;

        // Slide along the axis the direction does not run along.
        if (horizontal) {
            y += size.height + gap;
        } else {
            x += size.width + gap;
        }
    }

    // The centre, which is what the callers position from.
    return { x: x + size.width / 2, y: y + size.height / 2 };
}
