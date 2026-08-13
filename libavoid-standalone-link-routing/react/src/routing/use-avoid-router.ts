import type { dia } from '@joint/plus';
import { useGraph } from '@joint/react-plus';
import { useEffect, useState } from 'react';
import { setLinkAwaiting } from './awaiting';
import type { CellJSON, RoutedLink, RouterCommand, RouterResponse } from './protocol';

/** What the router is doing, for the status readout. */
export interface RoutingStatus {
    /** `true` between handing an edit to the worker and its reply landing. */
    readonly isRouting: boolean;
    /** How long the last completed routing pass took, in ms. */
    readonly durationMs: number | null;
}

/** A link the worker can do something with: both ends attached to a cell. */
function isRoutable(link: dia.Link): boolean {
    return Boolean(link.source()?.id && link.target()?.id);
}

/**
 * One routed link as a single `set` payload.
 *
 * `router` is `normal` when Libavoid's own route won: the vertices *are* the
 * route, so they are drawn through as they came rather than being sent through a
 * router a second time. It is `null` when Libavoid had nothing usable, which
 * hands the link back to the paper's own orthogonal routing — the way JointJS is
 * told to fall back to the paper default, though the typings only allow a router
 * or `undefined`, hence the cast.
 */
function applyRoute(routed: RoutedLink): Partial<dia.Link.Attributes> {
    return {
        vertices: routed.vertices as dia.Point[],
        source: routed.source as dia.Link.EndJSON,
        target: routed.target as dia.Link.EndJSON,
        router: routed.router,
    } as unknown as Partial<dia.Link.Attributes>;
}

/**
 * Runs the Libavoid router for this `<Diagram>`, in a Web Worker.
 *
 * Mount it once inside the diagram. It ships the graph to the worker, keeps the
 * two in step as cells are added, moved and reconnected, and writes each route
 * back onto its link when the worker answers.
 *
 * Everything here goes through the JointJS graph rather than through React
 * state. The graph is what both sides own — the worker replays cell JSON onto
 * a graph of its own and answers with geometry, and that geometry is set on the
 * models directly. `@joint/react-plus` is subscribed to the graph, so the
 * canvas follows without a single route passing through a React render.
 *
 * The hook owns the worker for the lifetime of the component, which is why the
 * app remounts the whole `<Diagram>` when a different graph is chosen: a fresh
 * worker cannot carry over a pending debounce or a stale Libavoid shape from
 * the graph before it.
 */
export function useAvoidRouter(): RoutingStatus {
    const { graph } = useGraph();
    const [status, setStatus] = useState<RoutingStatus>({ isRouting: true, durationMs: null });

    useEffect(() => {
        const worker = new Worker(new URL('./router-worker.ts', import.meta.url), {
            type: 'module',
        });
        const post = (message: RouterCommand) => worker.postMessage(message);

        /** When the pass in flight began, or `null` when the graph is settled. */
        let startedAt: number | null = null;

        const beginRouting = () => {
            if (startedAt === null) startedAt = performance.now();
            // A drag fires this on every pointer move; re-rendering the status
            // on each one would be a frame's work for no visible change.
            setStatus((previous) => (previous.isRouting ? previous : { ...previous, isRouting: true }));
        };

        worker.onmessage = ({ data }: MessageEvent<RouterResponse>) => {
            if (data.command !== 'routed') return;

            const elapsed = startedAt === null ? null : performance.now() - startedAt;
            startedAt = null;
            setStatus((previous) => ({ isRouting: false, durationMs: elapsed ?? previous.durationMs }));

            // One JointJS batch for the whole reply: on the large graph this is
            // ~450 links, and the paper repaints once at the end rather than
            // after each one.
            graph.startBatch('avoid-router');
            data.cells.forEach((routed) => {
                const model = graph.getCell(routed.id);
                if (!model || model.isElement()) return;
                const link = model as dia.Link;
                // The user may have pulled an end off while the worker was
                // routing; applying the route would snap it back.
                if (!isRoutable(link)) return;
                link.set(applyRoute(routed), { fromWorker: true });
                setLinkAwaiting(link, false);
            });
            graph.stopBatch('avoid-router');
        };

        const onChange = (cell: dia.Cell, opt: dia.Cell.Options) => {
            // Skip what this hook itself just wrote.
            if (opt.fromWorker) return;

            if (cell.isLink()) {
                const link = cell as dia.Link;
                // Only the endpoints matter to the router.
                if (!link.hasChanged('source') && !link.hasChanged('target')) return;
                // Dangling before and dangling still: nothing to route.
                const wasRoutable = Boolean(link.previous('source')?.id && link.previous('target')?.id);
                if (!wasRoutable && !isRoutable(link)) return;
                setLinkAwaiting(link, true);
            }

            beginRouting();
            post({ command: 'change', cell: cell.toJSON() as CellJSON });

            if (cell.isElement() && (cell.hasChanged('position') || cell.hasChanged('size'))) {
                graph.getConnectedLinks(cell).forEach((link) => setLinkAwaiting(link, true));
            }
        };

        const onAdd = (cell: dia.Cell) => {
            beginRouting();
            post({ command: 'add', cell: cell.toJSON() as CellJSON });
            if (cell.isLink()) setLinkAwaiting(cell as dia.Link, true);
        };

        const onRemove = (cell: dia.Cell) => {
            beginRouting();
            post({ command: 'remove', id: String(cell.id) });
        };

        graph.on('change', onChange);
        graph.on('add', onAdd);
        graph.on('remove', onRemove);

        // The graph is fully seeded by the time this effect runs, so the first
        // message is the whole diagram rather than a cell at a time.
        beginRouting();
        post({ command: 'reset', cells: graph.toJSON().cells as CellJSON[] });

        return () => {
            graph.off('change', onChange);
            graph.off('add', onAdd);
            graph.off('remove', onRemove);
            worker.onmessage = null;
            worker.terminate();
        };
    }, [graph]);

    return status;
}
