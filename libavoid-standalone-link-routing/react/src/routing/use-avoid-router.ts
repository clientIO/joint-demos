import { useGraph } from '@joint/react-plus';
import { initAvoidRouter } from '@joint/router-avoid';
import type { RouterService } from '@joint/router-avoid';
import type { dia } from '@joint/plus';
import { useEffect, useState } from 'react';
import wasmUrl from 'libavoid-wasm?url';
import { setLinkAwaiting } from './awaiting';
import { IDEAL_NUDGING_DISTANCE, SHAPE_BUFFER_DISTANCE } from './settings';

/** What the router is doing, for the status readout. */
export interface RoutingStatus {
    /** `true` while the router still owes at least one link a route. */
    readonly isRouting: boolean;
    /** How long the last completed routing pass took, in ms. */
    readonly durationMs: number | null;
    /**
     * `true` once the router service is running — from that point on, every
     * link in the graph carries at least the service's interim route.
     */
    readonly ready: boolean;
}

/**
 * Runs the Libavoid router for this `<Diagram>`, in a Web Worker.
 *
 * Mount it once inside the diagram. All of the worker plumbing lives in
 * `@joint/router-avoid` (`worker: true`): the package spawns the worker, ships
 * the graph to it, keeps the two in step as cells are added, moved and
 * reconnected, and writes each route back onto its link when Libavoid answers.
 * What is left here is wiring the service's events to this app's UI — the
 * awaiting-update style on the links and the timing readout in the toolbar.
 *
 * Everything still goes through the JointJS graph rather than through React
 * state: the service sets geometry on the link models directly, and
 * `@joint/react-plus` is subscribed to the graph, so the canvas follows
 * without a single route passing through a React render.
 *
 * The hook owns the service for the lifetime of the component, which is why
 * the app remounts the whole `<Diagram>` when a different graph is chosen:
 * `destroy()` terminates the worker, and the next mount starts a fresh one
 * with no pending debounce or stale Libavoid shape from the graph before it.
 */
export function useAvoidRouter(): RoutingStatus {
    const { graph } = useGraph();
    const [status, setStatus] = useState<RoutingStatus>({
        isRouting: true,
        durationMs: null,
        ready: false,
    });

    useEffect(() => {
        let service: RouterService | null = null;
        let disposed = false;

        /** When the pass in flight began, or `null` when the graph is settled. */
        let startedAt: number | null = null;

        initAvoidRouter(graph, {
            worker: true,
            // The wasm binary as a Vite asset URL (see `vite.config.ts`); the
            // package forwards it into its worker, where Libavoid loads it.
            libavoidFilePath: wasmUrl,
            shapeBufferDistance: SHAPE_BUFFER_DISTANCE,
            idealNudgingDistance: IDEAL_NUDGING_DISTANCE,
        }).then((routerService) => {
            // The component may be gone before the wasm module has loaded —
            // the graph dropdown remounts the diagram — in which case the
            // service is torn down before it ever starts.
            if (disposed) {
                routerService.destroy();
                return;
            }
            service = routerService;

            routerService.on('link:routing', (link) => {
                if (startedAt === null) startedAt = performance.now();
                setLinkAwaiting(link, true);
                // A drag fires this on every pointer move; re-rendering the
                // status on each one would be a frame's work for no visible
                // change.
                setStatus((previous) =>
                    previous.isRouting ? previous : { ...previous, isRouting: true });
            });
            // One handler for both closing events. The combined form is
            // untyped (the service's event map types single names only),
            // hence the explicit parameter type.
            routerService.on('link:routed link:routing:cancelled', (link: dia.Link) => {
                setLinkAwaiting(link, false);
            });
            // Fired when no link is owed a route any more — the end of a pass.
            routerService.on('idle', () => {
                const elapsed = startedAt === null ? null : performance.now() - startedAt;
                startedAt = null;
                setStatus((previous) => ({
                    ...previous,
                    isRouting: false,
                    durationMs: elapsed ?? previous.durationMs,
                }));
            });

            // Not auto-started: `start()` syncs every cell the graph already
            // holds — the graph is fully seeded by the time this effect runs —
            // and begins listening for changes. It also applies the interim
            // route to every link synchronously, which is what `ready` vouches
            // for: from here on, no link is routeless.
            routerService.start();
            setStatus((previous) => ({ ...previous, ready: true }));
        });

        return () => {
            disposed = true;
            service?.destroy();
        };
    }, [graph]);

    return status;
}
