import { g, mvc } from '@joint/core';
import type { dia } from '@joint/core';
import { getAvoid, loadAvoid } from './libavoid';
import type { Avoid, AvoidConnRef, AvoidPolyLine, AvoidRouterInstance, AvoidShapeRef } from './libavoid';

/** Pin id of the single centre pin every shape gets, for links without a port. */
const DEFAULT_PIN = 1;

/** A link end the router writes: an anchor offset from the port or the centre. */
interface RoutedEnd {
    id: dia.Cell.ID;
    port: string | null;
    anchor: { name: string; args?: { dx: number; dy: number }};
}

/**
 * The router a routed link is drawn with.
 *
 * `normal` draws the Libavoid vertices as they are. `null` hands the link back
 * to the paper's default router, which is what happens when Libavoid's route is
 * unusable and the paper's own orthogonal routing has to stand in.
 */
type RoutedRouter = { name: string; args?: Record<string, unknown> } | null;

/** Everything the router writes onto a link, in one `set`. */
interface RoutedLinkAttributes {
    source: RoutedEnd | dia.Link.EndJSON;
    target: RoutedEnd | dia.Link.EndJSON;
    vertices: dia.Point[];
    router: RoutedRouter;
}

/**
 * Writes a route onto a link.
 *
 * `router: null` is how JointJS is told to fall back to the paper's default,
 * but the typings only allow a router or `undefined`, so the cast is here in
 * one place instead of at both call sites.
 */
function setRoute(link: dia.Link, attributes: RoutedLinkAttributes): void {
    link.set(attributes as unknown as Partial<dia.Link.Attributes>, { avoidRouter: true });
}

export interface AvoidRouterOptions {
    /** Clearance kept around every shape when routing, in px. */
    readonly shapeBufferDistance?: number;
    /** Spacing used to nudge overlapping segments apart, in px. */
    readonly idealNudgingDistance?: number;
    /**
     * Re-route on every graph change. The worker turns this off and drives
     * `processTransaction()` itself on a debounce, so a burst of changes costs
     * one routing pass rather than one per change.
     */
    readonly commitTransactions?: boolean;
}

/**
 * Keeps a Libavoid router in step with a JointJS graph.
 *
 * Every element becomes a Libavoid shape with a connection pin per port, every
 * link becomes a connector, and Libavoid writes the route it computes back onto
 * the link as `vertices` plus a pair of anchors. It never touches the DOM, which
 * is what lets the worker run it.
 */
export class AvoidRouter {

    static load(): Promise<void> {
        return loadAvoid();
    }

    readonly graph: dia.Graph;
    readonly avoidRouter: AvoidRouterInstance;

    private readonly avoid: Avoid;
    private readonly connDirections: Record<string, number>;
    private readonly shapeRefs: Record<string, AvoidShapeRef> = {};
    private readonly edgeRefs: Record<string, AvoidConnRef> = {};

    /**
     * Maps a JointJS port id to the numeric pin id Libavoid requires.
     * Keyed by `${element.id}:${port.id}`.
     */
    private readonly pinIds: Record<string, number> = {};

    /**
     * Finds the JointJS link behind a connector callback.
     *
     * `libavoid-js` misbehaves when a connector is added, removed and added
     * again under the same id, so the connectors are left to generate their
     * own — which means `connRef.id()` cannot identify the link, and the raw
     * pointer (`connRef.g`) is used as the key instead.
     */
    private readonly linksByPointer: Record<number, dia.Link> = {};

    private readonly commitTransactions: boolean;
    private margin: number;
    private nextPinId = 100_000;
    private graphListener: mvc.Listener<unknown[]> | null = null;

    constructor(graph: dia.Graph, options: AvoidRouterOptions = {}) {
        const avoid = getAvoid();
        this.avoid = avoid;
        this.graph = graph;

        this.connDirections = {
            top: avoid.ConnDirUp,
            right: avoid.ConnDirRight,
            bottom: avoid.ConnDirDown,
            left: avoid.ConnDirLeft,
            all: avoid.ConnDirAll,
        };

        const {
            shapeBufferDistance = 0,
            idealNudgingDistance = 10,
            commitTransactions = true,
        } = options;

        this.commitTransactions = commitTransactions;
        this.margin = shapeBufferDistance;

        const router = new avoid.Router(avoid.OrthogonalRouting);

        // Spacing used when nudging overlapping corners and segments apart.
        router.setRoutingParameter(avoid.idealNudgingDistance, idealNudgingDistance);
        // Padding added to each shape when it is treated as an obstacle, so
        // connectors never graze a shape's border.
        router.setRoutingParameter(avoid.shapeBufferDistance, shapeBufferDistance);

        // Off: it would move the anchor point of even a single link, which is
        // wrong for links attached to ports.
        router.setRoutingOption(avoid.nudgeOrthogonalTouchingColinearSegments, false);
        // A preprocessing pass that unifies segments and centres them in free
        // space. Better ordering and nudging, at a cost worth watching on very
        // large graphs.
        router.setRoutingOption(avoid.performUnifyingNudgingPreprocessingStep, true);
        router.setRoutingOption(avoid.nudgeSharedPathsWithCommonEndPoint, true);
        router.setRoutingOption(avoid.nudgeOrthogonalSegmentsConnectedToShapes, true);

        this.avoidRouter = router;
    }

    private getAvoidRectFromElement(element: dia.Element) {
        const { avoid } = this;
        const { x, y, width, height } = element.getBBox();
        return new avoid.Rectangle(
            new avoid.Point(x, y),
            new avoid.Point(x + width, y + height)
        );
    }

    private getVerticesFromAvoidRoute(route: AvoidPolyLine): dia.Point[] {
        const vertices: dia.Point[] = [];
        for (let i = 1; i < route.size() - 1; i++) {
            const { x, y } = route.get_ps(i);
            vertices.push({ x, y });
        }
        return vertices;
    }

    updateShape(element: dia.Element): void {
        const { avoid, shapeRefs, avoidRouter } = this;
        const shapeRect = this.getAvoidRectFromElement(element);
        const existing = shapeRefs[element.id];
        if (existing) {
            // Only the position and size can have changed.
            avoidRouter.moveShape(existing, shapeRect);
            return;
        }

        const shapeRef = new avoid.ShapeRef(avoidRouter, shapeRect);
        shapeRefs[element.id] = shapeRef;

        // One central pin per shape, for links that connect to the element
        // itself rather than to one of its ports.
        const centerPin = new avoid.ShapeConnectionPin(
            shapeRef,
            DEFAULT_PIN,
            0.5,
            0.5,
            true,
            0,
            avoid.ConnDirAll
        );
        centerPin.setExclusive(false);

        // One pin per port, facing away from the side it sits on.
        element.getPortGroupNames().forEach((group) => {
            const portsPositions = element.getPortsPositions(group);
            const { width, height } = element.size();
            const rect = new g.Rect(0, 0, width, height);
            Object.keys(portsPositions).forEach((portId) => {
                const { x, y } = portsPositions[portId];
                const side = rect.sideNearestToPoint({ x, y });
                const pin = new avoid.ShapeConnectionPin(
                    shapeRef,
                    this.getConnectionPinId(element.id, portId),
                    x / width,
                    y / height,
                    true,
                    0,
                    this.connDirections[side]
                );
                pin.setExclusive(false);
            });
        });
    }

    /**
     * Numeric pin id for a JointJS port. Libavoid only accepts numbers, and
     * only requires them to be unique per shape; these are unique graph-wide.
     */
    private getConnectionPinId(elementId: dia.Cell.ID, portId: string): number {
        const pinKey = `${elementId}:${portId}`;
        if (pinKey in this.pinIds) return this.pinIds[pinKey];
        const pinId = this.nextPinId++;
        this.pinIds[pinKey] = pinId;
        return pinId;
    }

    updateConnector(link: dia.Link): AvoidConnRef | null {
        const { avoid, shapeRefs, edgeRefs } = this;

        const { id: sourceId, port: sourcePortId = null } = link.source();
        const { id: targetId, port: targetPortId = null } = link.target();

        if (!sourceId || !targetId) {
            // Libavoid can route a connector with a free end; this demo does not.
            this.deleteConnector(link);
            return null;
        }

        const sourceConnEnd = new avoid.ConnEnd(
            shapeRefs[sourceId],
            sourcePortId ? this.getConnectionPinId(sourceId, sourcePortId) : DEFAULT_PIN
        );
        const targetConnEnd = new avoid.ConnEnd(
            shapeRefs[targetId],
            targetPortId ? this.getConnectionPinId(targetId, targetPortId) : DEFAULT_PIN
        );

        const existing = edgeRefs[link.id];
        const connRef = existing ?? new avoid.ConnRef(this.avoidRouter);
        if (!existing) {
            this.linksByPointer[connRef.g] = link;
        }

        connRef.setSourceEndpoint(sourceConnEnd);
        connRef.setDestEndpoint(targetConnEnd);

        // Already registered — the endpoints above were the whole update.
        if (existing) return connRef;

        edgeRefs[link.id] = connRef;
        connRef.setCallback((pointer) => this.onAvoidConnectorChange(pointer), connRef);
        return connRef;
    }

    deleteConnector(link: dia.Link): void {
        const connRef = this.edgeRefs[link.id];
        if (!connRef) return;
        this.avoidRouter.deleteConnector(connRef);
        delete this.linksByPointer[connRef.g];
        delete this.edgeRefs[link.id];
    }

    deleteShape(element: dia.Element): void {
        const shapeRef = this.shapeRefs[element.id];
        if (!shapeRef) return;
        this.avoidRouter.deleteShape(shapeRef);
        delete this.shapeRefs[element.id];
    }

    /**
     * Offset from a link end's natural anchor (the port, or the element centre)
     * to where Libavoid actually wants the line to start.
     */
    private getLinkAnchorDelta(element: dia.Element, portId: string | null, point: g.Point): g.Point {
        let anchorPosition: g.Point;
        if (portId) {
            const port = element.getPort(portId);
            const portPosition = element.getPortsPositions(port.group as string)[portId];
            anchorPosition = element.position().offset(portPosition);
        } else {
            anchorPosition = element.getBBox().center();
        }
        return point.difference(anchorPosition);
    }

    routeLink(link: dia.Link): void {
        const connRef = this.edgeRefs[link.id];
        if (!connRef) return;

        const route = connRef.displayRoute();
        const sourcePoint = new g.Point(route.get_ps(0));
        const targetPoint = new g.Point(route.get_ps(route.size() - 1));

        const { port: sourcePortId = null } = link.source();
        const { port: targetPortId = null } = link.target();

        const sourceElement = link.getSourceElement();
        const targetElement = link.getTargetElement();
        if (!sourceElement || !targetElement) return;

        const source: RoutedEnd = { id: sourceElement.id, port: sourcePortId || null, anchor: { name: 'modelCenter' }};
        const target: RoutedEnd = { id: targetElement.id, port: targetPortId || null, anchor: { name: 'modelCenter' }};
        let vertices: dia.Point[];
        let router: RoutedRouter;

        if (this.isRouteValid(route, sourceElement, targetElement, sourcePortId, targetPortId)) {
            const sourceAnchorDelta = this.getLinkAnchorDelta(sourceElement, sourcePortId, sourcePoint);
            const targetAnchorDelta = this.getLinkAnchorDelta(targetElement, targetPortId, targetPoint);
            source.anchor.args = { dx: sourceAnchorDelta.x, dy: sourceAnchorDelta.y };
            target.anchor.args = { dx: targetAnchorDelta.x, dy: targetAnchorDelta.y };
            vertices = this.getVerticesFromAvoidRoute(route);
            router = { name: 'normal' };
        } else {
            // Nothing usable to draw through: hand the link back to the paper's
            // own orthogonal router, which is also what drew it while the route
            // was pending.
            vertices = [];
            router = null;
        }

        setRoute(link, { source, target, vertices, router });
    }

    routeAll(): void {
        const { graph, avoidRouter } = this;
        graph.getElements().forEach((element) => this.updateShape(element));
        graph.getLinks().forEach((link) => this.updateConnector(link));
        avoidRouter.processTransaction();
    }

    /** Straightens a link that has lost an end, dropping the route it carried. */
    resetLink(link: dia.Link): void {
        const source = { ...link.source() };
        const target = { ...link.target() };
        // The anchors are the router's own work: without a route they would go
        // on offsetting the line from a point that no longer means anything.
        delete source.anchor;
        delete target.anchor;
        setRoute(link, { source, target, vertices: [], router: null });
    }

    addGraphListeners(): void {
        this.removeGraphListeners();
        const listener = new mvc.Listener();
        listener.listenTo(this.graph, {
            remove: (cell: dia.Cell) => this.onCellRemoved(cell),
            add: (cell: dia.Cell) => this.onCellAdded(cell),
            change: (cell: dia.Cell, opt: dia.Cell.Options) => this.onCellChanged(cell, opt),
            reset: (_: unknown, opt: { previousModels?: dia.Cell[] }) => this.onGraphReset(opt.previousModels),
        });
        this.graphListener = listener;
    }

    removeGraphListeners(): void {
        this.graphListener?.stopListening();
        this.graphListener = null;
    }

    private onCellRemoved(cell: dia.Cell): void {
        if (cell.isElement()) {
            this.deleteShape(cell as dia.Element);
        } else {
            this.deleteConnector(cell as dia.Link);
        }
        this.avoidRouter.processTransaction();
    }

    private onCellAdded(cell: dia.Cell): void {
        if (cell.isElement()) {
            this.updateShape(cell as dia.Element);
        } else {
            this.updateConnector(cell as dia.Link);
        }
        this.avoidRouter.processTransaction();
    }

    private onCellChanged(cell: dia.Cell, opt: dia.Cell.Options): void {
        if (opt.avoidRouter) return;
        let needsRerouting = false;
        if ('source' in cell.changed || 'target' in cell.changed) {
            if (!cell.isLink()) return;
            if (!this.updateConnector(cell as dia.Link)) {
                // The link is no longer routable; drop the route it had.
                this.resetLink(cell as dia.Link);
            }
            needsRerouting = true;
        }
        if ('position' in cell.changed || 'size' in cell.changed) {
            if (!cell.isElement()) return;
            this.updateShape(cell as dia.Element);
            needsRerouting = true;
        }
        if (this.commitTransactions && needsRerouting) {
            this.avoidRouter.processTransaction();
        }
    }

    private onGraphReset(previousModels: dia.Cell[] = []): void {
        previousModels.forEach((cell) => {
            if (cell.isElement()) {
                this.deleteShape(cell as dia.Element);
            } else {
                this.deleteConnector(cell as dia.Link);
            }
        });
        this.routeAll();
    }

    private onAvoidConnectorChange(connRefPtr: number): void {
        const link = this.linksByPointer[connRefPtr];
        if (!link) return;
        this.routeLink(link);
    }

    /**
     * Decides whether to keep Libavoid's route or hand the link back to the
     * paper's own router.
     *
     * Libavoid offers no validity check of its own, so this is a heuristic: a
     * route with a bend is always taken, and a straight one is rejected when it
     * is diagonal or when it ends up inside the element at the other end.
     */
    private isRouteValid(
        route: AvoidPolyLine,
        sourceElement: dia.Element,
        targetElement: dia.Element,
        sourcePortId: string | null,
        targetPortId: string | null
    ): boolean {
        const size = route.size();
        // More than two points means the route bends, which is always valid.
        if (size > 2) return true;

        const sourcePs = route.get_ps(0);
        const targetPs = route.get_ps(size - 1);
        // A two-point route that is neither horizontal nor vertical is diagonal.
        if (sourcePs.x !== targetPs.x && sourcePs.y !== targetPs.y) return false;

        const { margin } = this;
        if (sourcePortId && targetElement.getBBox().inflate(margin).containsPoint(sourcePs)) {
            return false;
        }
        if (targetPortId && sourceElement.getBBox().inflate(margin).containsPoint(targetPs)) {
            return false;
        }
        return true;
    }
}
