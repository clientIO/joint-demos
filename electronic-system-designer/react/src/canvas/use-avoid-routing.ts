// Live obstacle-avoiding wire routing for the connectivity sheet, via
// @joint/router-avoid (libavoid compiled to WebAssembly, run in a Worker).
//
// The service watches the graph and keeps every wire routed around the part
// symbols — drag a part and its wires re-route. Demo-specific choices:
//
// - Only PARTS are obstacles. Board outlines are elements too, but they
//   enclose everything on them — as obstacles they would wall the router in.
// - Only committed WIRES are routed. The dashed draft a user is dragging out
//   of a pin stays a straight rubber band.
// - The service owns the full route geometry: vertices AND end anchors
//   (libavoid nudges end segments apart and the wrapper compensates through
//   the anchors, so the two travel together). Every write is remembered in
//   views/router-routes and repeated by the derived wire records, so a store
//   re-sync or a remount (tab switch) lands on the route the graph holds.

import { useGraph } from '@joint/react-plus';
import { initAvoidRouter } from '@joint/router-avoid';
import type { RouterService } from '@joint/router-avoid';
import type { dia } from '@joint/plus';
import { useEffect } from 'react';
// `libavoid-js-dist` is a vite.config alias for the package's dist folder:
// `libavoid-js` does not export its wasm asset.
import libavoidWasmUrl from 'libavoid-js-dist/libavoid.wasm?url';
import type { Side } from '@/symbols/port-markup';
import { isComponentCell, isWireCell } from '@/views/cell-data';
import { readLinkAnchor, rememberRouterRoute, routeSignature } from '@/views/router-routes';
import { snapRouteToPins, type PinExit } from './pin-snap';

/** The `opt` flag on every write this service makes, so write-backs can tell them apart. */
const ROUTER_FLAG = { avoidRouter: true };

/**
 * The batches a user gesture moves parts in: a single-part drag and a
 * multi-selection drag. Only inside one is the router's interim elbow worth
 * drawing (see setRouteAttributes). Named on purpose — @joint/react runs
 * every store sync and auto-size pass in a batch of its own.
 */
const GESTURE_BATCHES = ['pointer', 'selection-translate'];

/** The batch the queued route writes of one frame are applied in. */
const ROUTE_BATCH = 'avoid-routes';


function isSide(value: unknown): value is Side {
    return value === 'left' || value === 'right' || value === 'top' || value === 'bottom';
}

/** The port position and side one end of a wire leaves its part from. */
function pinExit(link: dia.Link, end: 'source' | 'target'): PinExit | undefined {
    const element = end === 'source' ? link.getSourceElement() : link.getTargetElement();
    const portId = (end === 'source' ? link.source() : link.target()).port;
    if (!element || portId === undefined || !element.hasPort(portId)) return undefined;
    const side: unknown = element.portProp(portId, 'group');
    if (!isSide(side)) return undefined;
    const { x, y } = element.getPortCenter(portId);
    return { point: { x, y }, side };
}

/** The geometry this link's route is computed for: see `routeSignature`. */
function linkSignature(link: dia.Link): string | undefined {
    const source = link.getSourceElement();
    const target = link.getTargetElement();
    const fromPin = link.source().port;
    const toPin = link.target().port;
    if (!source || !target || fromPin === undefined || toPin === undefined) return undefined;
    return routeSignature(
        { id: String(source.id), position: source.position(), pin: fromPin },
        { id: String(target.id), position: target.position(), pin: toPin },
    );
}

/** A wire's data with the "not routed yet" flag dropped: the wire draws again. */
function routedData(data: { readonly kind: 'wire'; readonly wireId: string }) {
    return { kind: data.kind, wireId: data.wireId };
}

/** Keeps the current graph's wires continuously routed by libavoid. */
export function useAvoidRouting(): void {
    const { graph } = useGraph();

    useEffect(() => {
        let disposed = false;
        let service: RouterService | undefined;

        // The Worker answers one message per routed wire, each outside any
        // batch: applied as they arrive, every wire was its own @joint/react
        // commit (a cells copy plus a full write-back scan) and no batch ever
        // closed to refresh the jumpover arcs. Queue them and apply each frame's
        // routes in ONE batch: one commit and one arc sweep per frame.
        const queued = new Map<dia.Cell.ID, { readonly link: dia.Link; readonly attributes: dia.Link.Attributes }>();
        let flushFrame: number | undefined;
        const flushRoutes = (): void => {
            flushFrame = undefined;
            graph.startBatch(ROUTE_BATCH);
            for (const { link, attributes } of queued.values()) {
                // Removed while queued (a delete, an undo): nothing to route.
                if (graph.getCell(link.id) === link) link.set(attributes, ROUTER_FLAG);
            }
            queued.clear();
            graph.stopBatch(ROUTE_BATCH);
        };
        const writeRoute = (link: dia.Link, attributes: dia.Link.Attributes): void => {
            queued.set(link.id, { link, attributes });
            flushFrame ??= requestAnimationFrame(flushRoutes);
        };

        // A hidden (unrouted) wire is revealed one frame AFTER its route lands:
        // the paper repaints a link asynchronously, and React drew the revealed
        // wire from the previous layout — a straight pin-to-pin line — for that
        // frame.
        const toReveal = new Set<dia.Link>();
        let revealFrame: number | undefined;
        const revealWires = (): void => {
            revealFrame = undefined;
            for (const link of toReveal) {
                const data: unknown = link.get('data');
                if (graph.getCell(link.id) === link && isWireCell(data) && data.unrouted === true) {
                    link.set('data', routedData(data), ROUTER_FLAG);
                }
            }
            toReveal.clear();
        };
        const revealAfterPaint = (link: dia.Link): void => {
            toReveal.add(link);
            revealFrame ??= requestAnimationFrame(() => {
                revealFrame = requestAnimationFrame(revealWires);
            });
        };

        initAvoidRouter(graph, {
            libavoidFilePath: libavoidWasmUrl,
            // libavoid runs in a Worker: route passes never block a drag, and the
            // Worker's debounce folds libavoid's nudging passes into one result.
            worker: { debounceTime: 50 },
            // Wider than the 14 px pin stubs, so the first bend of every route
            // clears the stub tip and the exit segment stays a straight run.
            shapeBufferDistance: 24,
            idealNudgingDistance: 8,
            trackElement: ({ element }) => isComponentCell(element.get('data')),
            trackLink: ({ link }) => isWireCell(link.get('data')),
            setRouteAttributes: ({ link, attributes, routing }) => {
                const data: unknown = link.get('data');
                if (!isWireCell(data)) {
                    writeRoute(link, attributes);
                    return;
                }
                // `routing` marks the router's INTERIM elbow, drawn while libavoid
                // works. During a drag it keeps a moved part's wires orthogonal
                // under the pointer; anywhere else (mount, tab switch, undo, a store
                // sync) it would replace the current route with a throwaway elbow
                // and the wire would jump twice. Keep the current route instead.
                const inGesture = graph.hasActiveBatch(GESTURE_BATCHES);
                if (routing && !inGesture) return;
                const snapped = snapRouteToPins(
                    {
                        sourceAnchor: readLinkAnchor(attributes.source?.anchor),
                        targetAnchor: readLinkAnchor(attributes.target?.anchor),
                        vertices: attributes.vertices,
                    },
                    pinExit(link, 'source'),
                    pinExit(link, 'target'),
                );
                // Remember exactly what is written, and for which part positions: the
                // derived record repeats it, so the next controlled sync finds the
                // graph unchanged.
                const at = linkSignature(link);
                if (at !== undefined) {
                    rememberRouterRoute(data.wireId, { at, from: snapped.sourceAnchor, to: snapped.targetAnchor, vertices: snapped.vertices });
                }
                // A wire derived without a valid route waited hidden for this one.
                if (data.unrouted === true) revealAfterPaint(link);
                const route = {
                    source: { ...attributes.source, ...(snapped.sourceAnchor === undefined ? {} : { anchor: snapped.sourceAnchor }) },
                    target: { ...attributes.target, ...(snapped.targetAnchor === undefined ? {} : { anchor: snapped.targetAnchor }) },
                    vertices: snapped.vertices.map(({ x, y }) => ({ x, y })),
                };
                // Inside a drag the write lands now, in the drag's own frame: the
                // wires must follow the pointer. A newer write for the same wire
                // supersedes a queued one.
                if (inGesture) {
                    queued.delete(link.id);
                    link.set(route, ROUTER_FLAG);
                    return;
                }
                writeRoute(link, route);
            },
        }).then(
            (created) => {
                if (disposed) {
                    created.destroy();
                    return;
                }
                service = created;
                created.start();
            },
            // WASM failing to load leaves the wires on the paper's own routing —
            // a degraded look, not a broken canvas: draw the ones waiting hidden.
            () => {
                if (disposed) return;
                for (const link of graph.getLinks()) {
                    const data: unknown = link.get('data');
                    if (isWireCell(data) && data.unrouted === true) link.set('data', routedData(data), ROUTER_FLAG);
                }
            },
        );

        // Remembered routes are never forgotten on graph `remove`: tearing the
        // sheet down (a tab switch) removes every wire, and the remount needs
        // them. A stale one is harmless — it no longer matches its geometry.

        return () => {
            disposed = true;
            if (flushFrame !== undefined) cancelAnimationFrame(flushFrame);
            if (revealFrame !== undefined) cancelAnimationFrame(revealFrame);
            queued.clear();
            toReveal.clear();
            service?.destroy();
        };
    }, [graph]);
}
