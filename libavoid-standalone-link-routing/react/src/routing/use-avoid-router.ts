import { useGraph } from '@joint/react-plus';
import { initAvoidRouter } from '@joint/router-avoid';
import type { RouterService } from '@joint/router-avoid';
import type { dia } from '@joint/plus';
import { useEffect, useState } from 'react';
import wasmUrl from 'libavoid-wasm?url';
import type { FlowCell } from '@/data/cells';
import { setLinkAwaiting } from './awaiting';
import { IDEAL_NUDGING_DISTANCE, SHAPE_BUFFER_DISTANCE } from './settings';

/** What the router is doing, for the status readout. */
export interface RoutingStatus {
    /** `true` while the router still owes at least one link a route. */
    readonly isRouting: boolean;
    /** How long the last completed routing pass took, in ms. */
    readonly durationMs: number | null;
    /** `true` once the graph is seeded and the router service is running. */
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
 * The hook also owns seeding the graph: `initAvoidRouter` resolves only after
 * the worker has booted and loaded the wasm binary, and a link rendered before
 * then would be a bare straight line — nothing has written a route yet. So the
 * graph stays empty until the service is ready, and the cells go in right
 * before `start()`, in the same synchronous tick: by the time the paper draws
 * them, every link already carries the service's interim orthogonal route.
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
export function useAvoidRouter(cells: readonly FlowCell[]): RoutingStatus {
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
            routerService.on('link:routed', (link) => {
                setLinkAwaiting(link, false);
            });
            routerService.on('link:routing:cancelled', (link) => {
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

            // Seed and start back to back: `start()` syncs every cell the
            // graph holds and applies the interim routes synchronously, so
            // the links are never painted routeless.
            // The cast: `FlowCell` leaves `id` optional (the graph assigns
            // one), which the stricter `fromJSON` cell type does not model.
            graph.fromJSON({ cells: cells as unknown as dia.Cell.JSON[] });
            routerService.start();
            setStatus((previous) => ({ ...previous, ready: true }));
        });

        return () => {
            disposed = true;
            service?.destroy();
        };
    }, [graph, cells]);

    return status;
}
