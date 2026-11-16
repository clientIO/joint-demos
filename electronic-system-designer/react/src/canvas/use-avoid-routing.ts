// Obstacle-avoiding link routing with @joint/router-avoid (libavoid compiled
// to WebAssembly, run in a Worker), the documented setup: the service watches
// the graph and writes each route (vertices and end anchors) into its link.
// Those writes come back through `onCellsChange` like any other change, and
// the store keeps them, so a controlled sync never undoes them.
//
// See also vite.config.ts: a build-time workaround keeps route ends on their
// ports (https://github.com/clientIO/joint/issues/3595).

import { useGraph } from '@joint/react-plus';
import { initAvoidRouter, type InitAvoidOptions, type RouterService } from '@joint/router-avoid';
import type { dia } from '@joint/plus';
import { useEffect, useState } from 'react';
// `libavoid-js-dist` is a vite.config alias for the package's dist folder:
// `libavoid-js` does not export its wasm asset.
import libavoidWasmUrl from 'libavoid-js-dist/libavoid.wasm?url';

/** Which cells libavoid routes around (obstacles) and routes (links). */
export type AvoidTracking = Pick<InitAvoidOptions, 'trackElement' | 'trackLink'>;

/** The `opt` flag the service marks its own writes with (its default name). */
const ROUTER_FLAG = { avoidRouter: true };

/** True when libavoid has routed the link before: it writes end anchors with
 * every route (a straight route has no vertices, but still has anchors). */
function hasRoute(link: dia.Link): boolean {
    return link.source().anchor !== undefined;
}

/**
 * Keeps the current graph's links routed by libavoid while mounted.
 *
 * @returns true once every link shows a real route: right away when they all
 * already carry one (a saved document), else after libavoid's first pass, so
 * a link is never shown straight or on a placeholder route on load.
 */
export function useAvoidRouting(tracking: AvoidTracking): boolean {
    const { graph } = useGraph();
    const [isRouted, setIsRouted] = useState(false);

    useEffect(() => {
        let disposed = false;
        let service: RouterService | undefined;
        // On `start()` the service gives every link a placeholder (a plain
        // right-angle route) while libavoid computes the real one. A link that
        // already carries a route keeps it instead: libavoid's answer for an
        // unchanged sheet is that same route, so the placeholder would only
        // flash a wrong route for a few frames.
        let isStarting = false;
        initAvoidRouter(graph, {
            ...tracking,
            libavoidFilePath: libavoidWasmUrl,
            worker: true,
            // Wider than the 14 px pin stubs, so a route's first bend clears the stub.
            shapeBufferDistance: 24,
            idealNudgingDistance: 8,
            setRouteAttributes: ({ link, attributes, origin }) => {
                if (isStarting && origin === 'fallback' && hasRoute(link)) return;
                link.set(attributes, ROUTER_FLAG);
            },
        }).then(
            (created) => {
                if (disposed) {
                    created.destroy();
                    return;
                }
                service = created;
                const links = graph.getLinks().filter((link) => tracking.trackLink?.({ link }) ?? true);
                const isAlreadyRouted = links.every(hasRoute);
                if (!isAlreadyRouted) {
                    // Shown once every link has its first real route.
                    const waiting = new Set(links.map((link) => link.id));
                    created.on('link:routed', (link) => {
                        waiting.delete(link.id);
                        if (waiting.size === 0 && !disposed) setIsRouted(true);
                    });
                }
                isStarting = true;
                created.start();
                isStarting = false;
                if (isAlreadyRouted) setIsRouted(true);
            },
            // WASM failing to load leaves the links on the paper's own routing.
            () => {
                if (!disposed) setIsRouted(true);
            },
        );
        return () => {
            disposed = true;
            service?.destroy();
        };
    }, [graph, tracking]);

    return isRouted;
}
