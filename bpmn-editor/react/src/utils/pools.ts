import { g } from '@joint/plus';
import { getPoolParent, getSwimlaneParent, isGroup, isPool, isSwimlane } from './elements';
import { DEFAULT_HORIZONTAL_POOL_SIZE, DEFAULT_VERTICAL_POOL_SIZE, SWIMLANE_HEADER_SIZE } from '../shapes/pool/pool-config';

import type { dia, shapes } from '@joint/plus';
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

/**
 * Where to put a shape of `size` inside the lane: as close to `preferred`
 * as the lane allows, so it lands on screen but never outside its parent.
 */
export function getPositionInSwimlane(lane: BpmnSwimlane, size: dia.Size, preferred: g.PlainPoint) {

    const bbox = lane.getBBox().moveAndExpand({
        x: lane.getHeaderSize(),
        y: 0,
        width: -lane.getHeaderSize(),
        height: 0
    });
    const margin = lane.getContentMargin();

    // The lane can be smaller than the shape plus its margins.
    const maxX = Math.max(bbox.x, bbox.x + bbox.width - size.width - margin);
    const maxY = Math.max(bbox.y, bbox.y + bbox.height - size.height - margin);

    return {
        x: Math.min(Math.max(preferred.x - size.width / 2, bbox.x + margin), maxX),
        y: Math.min(Math.max(preferred.y - size.height / 2, bbox.y + margin), maxY)
    };
}

/**
 * The top-most pool under the point, or `null` where there is none. Top-most
 * by `z`: pools can overlap, and the one drawn last is the one the pointer is
 * pointing at.
 */
export function findPoolViewAtPoint(paper: dia.Paper, point: g.PlainPoint): dia.ElementView<shapes.bpmn2.CompositePool> | null {

    const views = paper.findElementViewsAtPoint(point)
        .sort((a, b) => (b.model.get('z') ?? 0) - (a.model.get('z') ?? 0));

    return (views.find((view) => isPool(view.model)) ?? null) as dia.ElementView<shapes.bpmn2.CompositePool> | null;
}

/**
 * Whether the lane can leave the pool it is in: a pool must keep one.
 */
export function canMoveSwimlane(swimlane: shapes.bpmn2.Swimlane): boolean {
    const pool = swimlane.getParentCell() as shapes.bpmn2.CompositePool;
    return pool.getSwimlanes().length > 1;
}

/**
 * Sizes a new pool to hold the loose diagram content, which the first pool
 * must contain, and reports the box it has to cover. `null` where there is
 * nothing to wrap — an empty diagram, or one that already has a pool, whose
 * content is not the new pool's business.
 *
 * The pointer drag builds its preview from these dimensions and keeps the
 * pool over the box while it moves; the keyboard drop, which has neither a
 * preview nor a pointer, drops the pool on the box directly.
 */
export function sizePoolToContent(graph: dia.Graph, pool: BpmnPool) {

    const elements = graph.getElements();
    if (elements.length === 0 || elements.some(isPool)) return null;

    const contentMargin = pool.getContentMargin();
    const poolBoundaryElements = elements.filter(isPoolBoundaryRequired);

    const { moveAndExpandArgs, boundary: dimensions, sizeDiff } = calculatePoolDimensions(pool);

    // Inflate the graph boundary to account for the content margin and mandatory swimlane header size
    const graphBBox = graph.getCellsBBox(poolBoundaryElements)?.inflate(contentMargin).moveAndExpand(moveAndExpandArgs);
    const poolDimensions = new g.Rect(
        0,
        0,
        Math.max(graphBBox?.width ?? 0, dimensions.width),
        Math.max(graphBBox?.height ?? 0, dimensions.height)
    );

    pool.size(poolDimensions.width + sizeDiff.width, poolDimensions.height + sizeDiff.height);

    return { graphBBox: graphBBox ?? null, poolDimensions };
}

export function isPoolBoundaryRequired(element: dia.Element) {
    return !(isPool(element) || isSwimlane(element) || isGroup(element));
}

export function getClampedPoolPosition(encapsulatedBoundary: g.Rect, poolDimensions: g.Rect): { x: number, y: number } {

    const maxX = encapsulatedBoundary.x + encapsulatedBoundary.width - poolDimensions.width;
    const maxY = encapsulatedBoundary.y + encapsulatedBoundary.height - poolDimensions.height;

    if (!poolDimensions.containsRect(encapsulatedBoundary)) {
        const x = Math.min(encapsulatedBoundary.x, Math.max(poolDimensions.x, maxX));
        const y = Math.min(encapsulatedBoundary.y, Math.max(poolDimensions.y, maxY));

        // Return the capped position
        return {
            x,
            y,
        };
    }

    // Return the original position
    return {
        x: poolDimensions.x,
        y: poolDimensions.y,
    };
}

function calculatePoolDimensions(pool: BpmnPool) {

    const poolHeaderSize = pool.getHeaderSize();
    const offset = -poolHeaderSize - SWIMLANE_HEADER_SIZE;

    if (pool.isHorizontal()) {

        return {
            moveAndExpandArgs: {
                x: offset,
                y: 0,
                width: SWIMLANE_HEADER_SIZE,
                height: 0
            },
            boundary: {
                width: DEFAULT_HORIZONTAL_POOL_SIZE.width - poolHeaderSize,
                height: DEFAULT_HORIZONTAL_POOL_SIZE.height,
            },
            sizeDiff: {
                width: poolHeaderSize,
                height: 0,
            }
        };
    }

    return {
        moveAndExpandArgs: {
            x: 0,
            y: offset,
            width: 0,
            height: SWIMLANE_HEADER_SIZE
        },
        boundary: {
            width: DEFAULT_VERTICAL_POOL_SIZE.width,
            height: DEFAULT_VERTICAL_POOL_SIZE.height - poolHeaderSize,
        },
        sizeDiff: {
            width: 0,
            height: poolHeaderSize,
        }
    };
}
