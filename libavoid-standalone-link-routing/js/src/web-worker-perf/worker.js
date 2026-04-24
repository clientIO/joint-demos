import { AvoidRouter } from '../shared/avoid-router';
import { dia, util } from '@joint/core';
import { cellNamespace } from './shapes';

const routerLoaded = AvoidRouter.load();

onmessage = async(e) => {

    await routerLoaded;

    const [{ command, ...data }] = e.data;
    switch (command) {
        case 'reset': {
            graph.resetCells(data.cells, {
                fromBrowser: true
            });
            break;
        }
        case 'change': {
            const { cell } = data;
            const model = graph.getCell(cell.id);
            if (!model) {
                console.warn(`Cell with id ${cell.id} not found.`);
                return;
            }
            if (model.isElement()) {
                model.set({
                    position: cell.position,
                    size: cell.size,
                }, {
                    fromBrowser: true
                });
            } else {
                model.set({
                    source: cell.source,
                    target: cell.target
                }, {
                    fromBrowser: true
                });
            }
            break;
        }
        case 'remove': {
            const { id } = data;
            const model = graph.getCell(id);
            if (!model) break;
            model.remove({ fromBrowser: true });
            break;
        }
        case 'add': {
            const { cell } = data;
            graph.addCell(cell, { fromBrowser: true });
            break;
        }
        default:
            console.log('Unknown command', command);
            break;
    }
};

await routerLoaded;

const graph = new dia.Graph({}, { cellNamespace });

const router = new AvoidRouter(graph, {
    shapeBufferDistance: 20,
    idealNudgingDistance: 10,
    portOverflow: 8,
    commitTransactions: false
});

let changed = {};

const debouncedProcessTransaction = util.debounce(() => {
    router.avoidRouter.processTransaction();
    setTimeout(() => {
        if (debouncedProcessTransaction.pending()) return;
        postMessage({
            command: 'routed',
            cells: Object.values(changed),
        });
        changed = {};
    }, 0);
}, 100);

router.addGraphListeners();

graph.on('change', (cell, opt) => {
    if (opt.fromBrowser) {
        debouncedProcessTransaction();
        return;
    }
    changed[cell.id] = cell.toJSON();
});

graph.on('reset', (_, opt) => {
    if (!opt.fromBrowser) return;
    debouncedProcessTransaction();
});

graph.on('add', (_, opt) => {
    if (!opt.fromBrowser) return;
    debouncedProcessTransaction();
});

graph.on('remove', (cell, opt) => {
    delete changed[cell.id];
    if (!opt.fromBrowser) return;
    debouncedProcessTransaction();
});
