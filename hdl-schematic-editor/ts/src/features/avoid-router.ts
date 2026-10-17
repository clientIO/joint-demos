import { mvc } from '@joint/plus';
import { initAvoidRouter } from '@joint/router-avoid';
import { Edge } from '../diagram/models';
import { snapToGrid } from '../diagram/data/manipulation';

import type { dia } from '@joint/plus';
import type { RouterService } from '@joint/router-avoid';

/**
 * Internal parts of the main thread provider of the router service.
 * They're used to adjust libavoid routing options not exposed by the `@joint/router-avoid` API.
 */
interface AvoidProviderInternals {
    avoidRouter?: { setRoutingOption(option: unknown, value: boolean): void };
    getAvoidInstance?: () => {
        nudgeSharedPathsWithCommonEndPoint: unknown;
        nudgeOrthogonalSegmentsConnectedToShapes: unknown;
    };
}

/**
 * The flag marking the changes made by the router (they're ignored by the router itself).
 */
const CHANGE_FLAG = 'avoidRouter';

/**
 * Start routing the wires of the graph with libavoid (orthogonal, obstacle-avoiding routes).
 * The routes are applied to the links' vertices and anchors whenever the elements move.
 */
export async function startAvoidRouter(graph: dia.Graph): Promise<RouterService> {
    const routerService = await initAvoidRouter(graph, {
        // The space kept around the shapes
        shapeBufferDistance: 10,
        // The space between parallel wires
        idealNudgingDistance: 10,
        // The WebAssembly module is served next to the application bundle
        libavoidFilePath: 'libavoid.wasm',
        // Route the wires only (e.g. not the temporary link of a connection being drawn)
        trackLink: ({ link }) => link instanceof Edge,
        // Align the bends of the routes to the paper grid. The routes are orthogonal
        // and the pins are on the grid, so rounding the coordinates of all bends keeps
        // the segments horizontal or vertical (and on the grid lines).
        setRouteAttributes: ({ link, attributes }) => {
            link.set({
                ...attributes,
                vertices: (attributes.vertices || []).map(snapToGrid)
            }, { [CHANGE_FLAG]: true });
        },
        changeFlag: CHANGE_FLAG,
    });

    const provider = (routerService as unknown as { provider?: AvoidProviderInternals }).provider;
    const avoid = provider?.getAvoidInstance?.();
    if (avoid && provider?.avoidRouter) {
        // The wires of a net (connected to the same output port) are not nudged apart,
        // so they leave the port along a shared path (like a hyperedge) and the junction
        // points can be drawn where they split.
        provider.avoidRouter.setRoutingOption(avoid.nudgeSharedPathsWithCommonEndPoint, false);
        // The segments connected to the pins are not nudged either,
        // otherwise the wire ends would be moved away from the pins.
        provider.avoidRouter.setRoutingOption(avoid.nudgeOrthogonalSegmentsConnectedToShapes, false);
    }

    routerService.start();
    resyncOnPortChanges(graph, routerService);

    return routerService;
}

/**
 * The router creates the connection pins of a shape once (when the element is added)
 * and keeps them at the same relative position when the element is resized.
 * The ports of our shapes are rearranged when the cell changes (e.g. a NOT gate changed
 * to an AND gate gets a second input, a register gets a reset input), so the router
 * is synchronized again to recreate the pins. Otherwise the wire ends would point to the
 * old pin positions.
 */
function resyncOnPortChanges(graph: dia.Graph, routerService: RouterService) {
    let scheduled = false;
    const resync = () => {
        scheduled = false;
        if (!routerService.isStarted) return;
        // Restarting the service synchronizes all the shapes, pins and connectors
        routerService.stop();
        routerService.start();
    };
    const listener = new mvc.Listener();
    listener.listenTo(graph, 'change:ports change:size', (cell: dia.Cell) => {
        if (!cell.isElement() || scheduled) return;
        // Many elements can change at once (e.g. the layout), resync once afterwards
        scheduled = true;
        queueMicrotask(resync);
    });
    return listener;
}
