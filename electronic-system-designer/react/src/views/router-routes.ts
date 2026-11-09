import type { LinkAnchor, Point } from '@/model/design';

/**
 * The route the auto-router last gave each wire: end anchors and bends.
 * Presentation state, deliberately outside the Design: the router rewrites
 * it on every pass, and a Design commit per pass would be an undo entry per
 * pass. The derived wire records read it back, so
 * - a controlled re-sync finds the geometry the graph already holds and
 *   changes nothing (without this, every commit reset all 47 wire ends to
 *   bare pins and libavoid re-routed the whole sheet);
 * - the connectivity sheet REMOUNTS (tab switch) with every wire already on
 *   its route, instead of straight lines that jump twice as the router
 *   starts up again.
 * A route is only valid for the part positions it was computed for (`at`):
 * after an edit made off the sheet (undo on another tab, a fix, a reset) or
 * for a brand-new wire there is no valid route, and the wire stays hidden
 * until libavoid has routed it.
 */

export interface RouterRoute {
  /** Where the wire's two pins stood when the route was computed: {@link routeSignature}. */
  readonly at: string;
  readonly from?: LinkAnchor;
  readonly to?: LinkAnchor;
  readonly vertices?: readonly Point[];
}

/** The geometry a route depends on: both ends' part, position and pin. */
export function routeSignature(
    from: { readonly id: string; readonly position: Point; readonly pin: string },
    to: { readonly id: string; readonly position: Point; readonly pin: string },
): string {
    return `${from.id}@${from.position.x},${from.position.y}:${from.pin}|${to.id}@${to.position.x},${to.position.y}:${to.pin}`;
}

const routesByWire = new Map<string, RouterRoute>();

export function rememberRouterRoute(wireId: string, route: RouterRoute): void {
    routesByWire.set(wireId, route);
}

/** The remembered route, only when it was computed for the given geometry. */
export function routerRouteOf(wireId: string, at: string): RouterRoute | undefined {
    const route = routesByWire.get(wireId);
    return route?.at === at ? route : undefined;
}

/** Test seam. */
export function clearRouterRoutes(): void {
    routesByWire.clear();
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

/**
 * A JointJS end anchor read back as a plain `{ name, args }`. Kept EXACT for
 * the router memory: the record must repeat what the graph holds to the last
 * decimal, or the re-sync sees a change and the router routes again.
 */
export function readLinkAnchor(anchor: unknown): LinkAnchor | undefined {
    if (!isRecord(anchor) || typeof anchor.name !== 'string') return undefined;
    const args: Record<string, number> = {};
    if (isRecord(anchor.args)) {
        for (const [key, value] of Object.entries(anchor.args)) {
            if (typeof value === 'number') args[key] = value;
        }
    }
    return Object.keys(args).length === 0 ? { name: anchor.name } : { name: anchor.name, args };
}
