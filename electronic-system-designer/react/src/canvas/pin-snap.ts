import type { Point } from '@/model/design';
import type { Side } from '@/symbols/port-markup';

/** Where one end of a wire meets its pin: the port's absolute position and side. */
export interface PinExit {
  readonly point: Point;
  readonly side: Side;
}

/** A route end anchor as the avoid router writes it: an offset from the port. */
export interface OffsetAnchor {
  readonly name: string;
  readonly args?: { readonly dx?: number; readonly dy?: number };
}

export interface SnappableRoute {
  readonly sourceAnchor?: OffsetAnchor;
  readonly targetAnchor?: OffsetAnchor;
  readonly vertices: readonly Point[];
}

const isVerticalExit = (side: Side): boolean => side === 'top' || side === 'bottom';

function snapAnchor(anchor: OffsetAnchor | undefined, side: Side): OffsetAnchor | undefined {
    if (anchor?.args === undefined) return anchor;
    // Keep the offset ALONG the exit direction, drop the sideways nudge.
    const args = isVerticalExit(side) ? { ...anchor.args, dx: 0 } : { ...anchor.args, dy: 0 };
    return { name: anchor.name, args };
}

function snapBend(bend: Point, exit: PinExit): Point {
    return isVerticalExit(exit.side) ? { x: exit.point.x, y: bend.y } : { x: bend.x, y: exit.point.y };
}

/**
 * Puts both ends of a libavoid route back on their pins. The router nudges
 * every segment attached to a shape apart (`nudgeOrthogonalSegmentsConnected
 * ToShapes`, hard-wired on in @joint/router-avoid), so wires sharing a pin
 * ended up to 16 px beside it, along the body edge, off the drawn stub.
 * Moving the end anchor's sideways offset to zero and the neighbouring bend
 * onto the pin's axis keeps the route orthogonal: that bend's other segment
 * runs across the exit direction, so only its length changes. Shared-pin
 * wires now meet at the pin and fan out after their first bend. A route
 * without bends is left alone — snapping both ends of a straight run could
 * tilt it.
 */
export function snapRouteToPins(route: SnappableRoute, source?: PinExit, target?: PinExit): SnappableRoute {
    const { vertices } = route;
    if (vertices.length === 0) return route;
    const snapped = [...vertices];
    const first = snapped[0];
    if (source !== undefined && first !== undefined) snapped[0] = snapBend(first, source);
    const last = snapped[snapped.length - 1];
    if (target !== undefined && last !== undefined) snapped[snapped.length - 1] = snapBend(last, target);
    return {
        sourceAnchor: source === undefined ? route.sourceAnchor : snapAnchor(route.sourceAnchor, source.side),
        targetAnchor: target === undefined ? route.targetAnchor : snapAnchor(route.targetAnchor, target.side),
        vertices: snapped,
    };
}
