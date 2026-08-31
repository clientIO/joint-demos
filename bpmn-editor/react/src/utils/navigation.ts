import { getPoolParent, isPool, isSwimlane } from './elements';

import type { dia, g } from '@joint/plus';

// A pool or a lane is skipped: its box spans everything inside it, so it
// would win nearly every direction and swallow the shapes the user is
// aiming for. Both stay reachable with `tab`, which walks every cell.
const isNavigable = (element: dia.Element) => !isPool(element) && !isSwimlane(element);

// Off-axis distance counts double, so a shape in the same row or column
// beats a nearer one sitting diagonally — the arrow follows the flow the
// diagram reads in rather than the closest thing in any direction.
const OFF_AXIS_WEIGHT = 2;

// Candidates are ranked on three things in order, so the nearer shape only
// wins among equals: the participant comes first, then whether the shape is
// square in the direction pressed, then distance.
type Rank = [pool: number, band: number, distance: number];

/**
 * The shape one arrow key press away from the selection, or `null` where the
 * direction runs off the diagram.
 *
 * Geometry, not the sequence flows: following the links reads well until one
 * bends back on itself, while the direction pressed always answers with
 * something the user can see that way.
 *
 * Two passes. A 90° cone opening in the direction pressed comes first, which
 * is what makes a row of tasks read as a row. Where that finds nothing the
 * whole side is considered — every shape wholly past the origin's edge,
 * however far off to the side it sits — so a start event tucked below and to
 * the left is still reachable with `left`. It is a fallback rather than the
 * rule because at 180° the nearest shape is often not the one the arrow
 * looks like it points at.
 *
 * Either way two things outrank being nearest. A shape in the same pool
 * wins, because an arrow is not expected to leave the participant while
 * there is anywhere left in it; and among those, one whose box is square in
 * the direction pressed wins over one sitting diagonally.
 *
 * Note it is not reversible: pressing the opposite arrow need not come back
 * where it started, since what lies right of A is not what lies left of B.
 * True of spatial navigation generally, and the price of not making the user
 * think about a traversal order.
 */
export function findInDirection(
    graph: dia.Graph,
    from: dia.Cell[],
    dx: number,
    dy: number
): dia.Element | null {

    const origin = graph.getCellsBBox(from);
    if (!origin) return null;

    const skipped = new Set(from.map((cell) => cell.id));
    const candidates = graph.getElements()
        .filter((element) => !skipped.has(element.id) && isNavigable(element));

    const closest = (within: (box: g.Rect) => boolean) => {

        let best: dia.Element | null = null;
        let bestRank: Rank | null = null;

        candidates.forEach((element) => {
            const box = element.getBBox();
            if (!within(box)) return;

            const rank = rankOf(box, origin, dx, dy, getPoolParent(element) === getPoolParent(from[0]));
            if (!bestRank || isCloser(rank, bestRank)) {
                bestRank = rank;
                best = element;
            }
        });

        return best;
    };

    return closest((box) => inCone(box, origin, dx, dy))
        ?? closest((box) => isBeside(box, origin, dx, dy));
}

// Whether the box's centre falls inside the 90° cone.
function inCone(box: g.Rect, origin: g.Rect, dx: number, dy: number) {

    const { along, across } = project(box, origin, dx, dy);

    return along > 0 && across <= along;
}

// Whether the box lies wholly past the origin's edge on the side pressed.
// Anything overlapping the origin's own rows or columns is directly above or
// below it, not beside it, and is left out.
function isBeside(box: g.Rect, origin: g.Rect, dx: number, dy: number) {

    if (dx > 0) return box.x >= origin.x + origin.width;
    if (dx < 0) return box.x + box.width <= origin.x;
    if (dy > 0) return box.y >= origin.y + origin.height;

    return box.y + box.height <= origin.y;
}

// The distance between the two centres, split into the part along the
// direction pressed and the part square across it.
function project(box: g.Rect, origin: g.Rect, dx: number, dy: number) {

    const delta = box.center().difference(origin.center());

    return {
        along: delta.x * dx + delta.y * dy,
        across: Math.abs(delta.x * dy + delta.y * dx)
    };
}

function rankOf(box: g.Rect, origin: g.Rect, dx: number, dy: number, samePool: boolean): Rank {

    const { along, across } = project(box, origin, dx, dy);

    // Whether the boxes overlap on the axis crossing the direction — the
    // same row for a horizontal press, the same column for a vertical one.
    const squareOn = dx !== 0
        ? box.y < origin.y + origin.height && origin.y < box.y + box.height
        : box.x < origin.x + origin.width && origin.x < box.x + box.width;

    return [samePool ? 0 : 1, squareOn ? 0 : 1, Math.abs(along) + across * OFF_AXIS_WEIGHT];
}

// Lexicographic: the first tier that differs decides.
function isCloser(rank: Rank, best: Rank) {
    for (let index = 0; index < rank.length; index++) {
        if (rank[index] !== best[index]) return rank[index] < best[index];
    }
    return false;
}
