import { dia, util } from '@joint/core';
import { AvoidRouter } from './avoid-router';
import type { RoutedLink, RouterCommand, RouterResponse } from './protocol';
import { IDEAL_NUDGING_DISTANCE, SHAPE_BUFFER_DISTANCE } from './settings';

/**
 * The Libavoid router, off the main thread.
 *
 * It keeps a `dia.Graph` of its own — a shadow of the paper's — and replays the
 * paper's edits onto it. The graph is the state on this side too: the router
 * listens to it, reads geometry off the models, and writes each route back onto
 * the link it belongs to, which is what this file then reports home.
 *
 * Routing a few hundred connectors takes long enough to be felt as a dropped
 * frame, so running it here is what keeps the canvas responsive while it happens.
 */

/**
 * The worker global, typed for the messages this file actually exchanges.
 *
 * The app compiles against the DOM lib, where `self` is a `Window`; casting
 * once here is cheaper than pulling the whole `webworker` lib into the project
 * and losing the DOM types the rest of `src/` needs.
 */
const workerScope = globalThis as unknown as {
    onmessage: ((event: MessageEvent<RouterCommand>) => void) | null;
    postMessage(message: RouterResponse): void;
};

/**
 * How the cell types the paper sends are built here.
 *
 * `@joint/react`'s `ElementModel` and `LinkModel` serialize as `'element'` and
 * `'link'`, and the plain `dia` classes deserialize them perfectly well: the
 * React half of those models is markup and a portal target, neither of which
 * means anything without a paper. Everything the router reads — position, size,
 * ports, endpoints — is `dia.Cell` state.
 */
const cellNamespace = { element: dia.Element, link: dia.Link };

/**
 * Links whose route changed since the last reply, keyed by id so a link that
 * is re-routed several times inside one debounce window is only sent once.
 */
let changed: Record<string, RoutedLink> = {};

let graph: dia.Graph;
let router: AvoidRouter;

/**
 * Routes, then replies — but only once the burst has settled.
 *
 * `processTransaction()` is the expensive call, so it is debounced rather than
 * run per change. The reply is deferred one more macrotask because the router's
 * connector callbacks fire synchronously inside the transaction and fill
 * `changed`; the `pending()` guard drops the reply if another burst started in
 * the meantime, so the paper receives one batch per settled edit rather than a
 * partial one per frame of a drag.
 */
const routeSoon = util.debounce(() => {
    router.avoidRouter.processTransaction();
    setTimeout(() => {
        if (routeSoon.pending()) return;
        workerScope.postMessage({ command: 'routed', cells: Object.values(changed) });
        changed = {};
    }, 0);
    // `pending()` is part of `util.debounce`'s runtime contract but missing
    // from its type, so it is declared here.
}, 100) as unknown as (() => void) & { pending(): boolean };

const ready = (async() => {
    await AvoidRouter.load();

    graph = new dia.Graph({}, { cellNamespace });
    router = new AvoidRouter(graph, {
        shapeBufferDistance: SHAPE_BUFFER_DISTANCE,
        idealNudgingDistance: IDEAL_NUDGING_DISTANCE,
        // The debounce above owns the routing pass; the router must not commit
        // a transaction of its own for every cell it is handed.
        commitTransactions: false,
    });
    router.addGraphListeners();

    // `fromPaper` marks a change that arrived over the wire. Those schedule a
    // routing pass; every other change is the router writing a route onto a
    // link, which is what has to be collected and sent home.
    graph.on('change', (cell, opt) => {
        if (opt.fromPaper) {
            routeSoon();
            return;
        }
        if (!cell.isLink()) return;
        const link = cell as dia.Link;
        changed[link.id] = {
            id: String(link.id),
            vertices: link.vertices(),
            source: link.source(),
            target: link.target(),
            router: (link.router() as RoutedLink['router']) ?? null,
        };
    });

    graph.on('reset', (_collection, opt) => {
        if (opt.fromPaper) routeSoon();
    });

    graph.on('add', (_cell, _collection, opt) => {
        if (opt.fromPaper) routeSoon();
    });

    graph.on('remove', (cell, _collection, opt) => {
        delete changed[cell.id];
        if (opt.fromPaper) routeSoon();
    });
})();

workerScope.onmessage = async(event) => {
    await ready;

    const message = event.data;
    switch (message.command) {
        case 'reset': {
            graph.resetCells([...message.cells], { fromPaper: true });
            break;
        }
        case 'add': {
            graph.addCell(message.cell, { fromPaper: true });
            break;
        }
        case 'change': {
            const { cell } = message;
            const model = graph.getCell(cell.id);
            if (!model) return;
            // Only the geometry is replayed. Everything else on the cell —
            // labels, styling, the React `data` — is the paper's business.
            if (model.isElement()) {
                model.set({ position: cell.position, size: cell.size } as dia.Element.Attributes, {
                    fromPaper: true,
                });
            } else {
                model.set({ source: cell.source, target: cell.target } as dia.Link.Attributes, {
                    fromPaper: true,
                });
            }
            break;
        }
        case 'remove': {
            graph.getCell(message.id)?.remove({ fromPaper: true });
            break;
        }
    }
};
