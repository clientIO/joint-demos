import type { WorkerElk } from '@joint/layout-elk';
import elkWorkerModule from 'elkjs/lib/elk-worker.js';

type ElkGraph = Parameters<WorkerElk['layout']>[0];

/** The parts of elkjs' main-thread `FakeWorker` used here. */
interface FakeWorker {
    onmessage: (message: { data: { data?: ElkGraph; error?: unknown }}) => void;
    /** Not in elkjs' typings — see `createSyncElk`. */
    dispatcher: { saveDispatch: (message: { data: object }) => void };
}

/**
 * A CommonJS module whose `module.exports` is `{ default, Worker }` — both the
 * `FakeWorker` class — so the default import is that object, not the class.
 * Its typings declare no value export at all.
 */
const { Worker: ElkFakeWorker } = elkWorkerModule as unknown as { Worker: new () => FakeWorker };

/**
 * An ELK that settles within the same task it was started in.
 *
 * ELK computes a layout synchronously, but elkjs' main-thread API defers it
 * twice with `setTimeout(…, 0)` — once before the computation, once before
 * resolving the result — so the browser always paints a frame in between:
 * a node just added shows at its pre-layout position (the origin) before
 * jumping into place. Handing the job straight to the worker's dispatcher
 * resolves the promise at once, so `layout()` from `@joint/layout-elk` applies
 * the result in microtasks, before the next paint — just like dagre.
 *
 * TODO: relies on an elkjs internal — `FakeWorker.dispatcher`, which elkjs'
 * typings do not declare. A synchronous main-thread mode in
 * `@joint/layout-elk` would make this unnecessary.
 */
export function createSyncElk(): WorkerElk {
    const worker = new ElkFakeWorker();
    // What elkjs' `ELK` constructor sends first: no algorithm is known until
    // registered. Only `layered` is used here.
    worker.onmessage = () => {};
    worker.dispatcher.saveDispatch({ data: { cmd: 'register', id: 0, algorithms: ['layered'] }});
    return {
        layout: (graph, options) => new Promise((resolve, reject) => {
            if (options?.signal?.aborted) {
                reject(options.signal.reason);
                return;
            }
            worker.onmessage = ({ data }) => {
                if (data.error !== undefined || !data.data) {
                    reject(data.error);
                } else {
                    resolve(data.data);
                }
            };
            worker.dispatcher.saveDispatch({ data: { cmd: 'layout', id: 0, graph }});
        }),
        terminate: () => {},
    };
}
