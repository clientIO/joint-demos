import { linkTools, elementTools, dia, shapes, highlighters } from '@joint/core';
import { Node, Edge } from '../shared/shapes';
import ResizeTool from '../shared/resize-tool';
import { AvoidRouter } from '../shared/avoid-router';
import { createExampleCells } from '../shared/example-graph';
import { markAwaiting, unmarkAwaiting } from '../shared/awaiting';

// Web Worker variant — the libavoid router runs in a dedicated Worker so
// routing never blocks the main thread. The main thread owns the JointJS
// graph; the worker owns a mirror graph plus a libavoid instance, and the
// two stay in sync via the `add` / `remove` / `change` / `reset` commands
// wired up below. The worker posts `routed` back with the computed link
// geometry, and in the meantime each affected link wears an
// `awaiting-update` highlighter so the user sees a pending state.
//
// Libavoid docs: https://www.adaptagrams.org/documentation/annotated.html
//
// Note: JointJS does not currently allow port ids that are pure numbers.

export const init = async() => {

    document.documentElement.classList.add('web-worker');

    await AvoidRouter.load();

    const canvasEl = document.getElementById('canvas');

    const cellNamespace = {
        ...shapes,
        Node,
        Edge,
    };

    const graph = new dia.Graph({}, { cellNamespace });
    const paper = new dia.Paper({
        model: graph,
        cellViewNamespace: cellNamespace,
        gridSize: 10,
        interactive: { linkMove: false },
        linkPinning: false,
        async: true,
        frozen: true,
        background: { color: '#F3F7F6' },
        snapLinks: { radius: 30 },
        overflow: true,
        defaultConnector: {
            name: 'straight',
            args: {
                cornerType: 'cubic',
                cornerRadius: 4,
            },
        },
        highlighting: {
            default: {
                name: 'mask',
                options: {
                    padding: 2,
                    attrs: {
                        stroke: '#EA3C24',
                        strokeWidth: 2,
                    },
                },
            },
        },
        defaultLink: () => new Edge(),
        validateConnection: (
            sourceView,
            sourceMagnet,
            targetView,
            targetMagnet,
            end
        ) => {
            const source = sourceView.model;
            const target = targetView.model;
            if (source.isLink() || target.isLink()) return false;
            if (targetMagnet === sourceMagnet) return false;
            if (end === 'target' ? targetMagnet : sourceMagnet) {
                return true;
            }
            if (source === target) return false;
            return end === 'target' ? !target.hasPorts() : !source.hasPorts();
        },
    });

    // Seed the graph from the shared sample. Every link starts in the
    // awaiting-update state until the worker's first `routed` reply lands.
    graph.addCells(createExampleCells());

    graph.getLinks().forEach((link) => markAwaiting(link.findView(paper)));


    canvasEl.appendChild(paper.el);

    paper.unfreeze();
    paper.fitToContent({
        useModelGeometry: true,
        padding: 100,
        allowNewOrigin: 'any',
    });

    // Add tools to the elements.
    graph.getElements().forEach((el) => addElementTools(el, paper));
    graph.on('add', (cell) => {
        if (cell.isLink()) return;
        addElementTools(cell, paper);
    });

    function addElementTools(el, paper) {
        const tools = [
            new ResizeTool({
                selector: 'body',
            }),
            new elementTools.Remove({
                useModelGeometry: true,
                x: -10,
                y: -10,
            }),
        ];
        if (!el.hasPorts()) {
            tools.push(
                new elementTools.Connect({
                    useModelGeometry: true,
                    x: 'calc(w + 10)',
                    y: 'calc(h - 20)',
                })
            );
        }

        el.findView(paper).addTools(new dia.ToolsView({ tools }));
    }

    // Add tools to the links.
    paper.on('link:mouseenter', (linkView) => {
        linkView.addTools(
            new dia.ToolsView({
                tools: [
                    new linkTools.Remove(),
                    new linkTools.TargetArrowhead(),
                ],
            })
        );
    });

    paper.on('link:mouseleave', (linkView) => {
        linkView.removeTools();
    });

    paper.on('blank:pointerdblclick', (evt, x, y) => {
        const node = new Node({
            position: { x: x - 50, y: y - 50 },
            size: { width: 100, height: 100 },
        });
        graph.addCell(node);
    });

    // Add a class to the links when they are being interacted with.
    // See `styles.css` for the styles.

    paper.on('link:pointerdown', (linkView) => {
        highlighters.addClass.add(linkView, 'line', 'active-link', {
            className: 'active-link'
        });
    });

    paper.on('link:pointerup', (linkView) => {
        highlighters.addClass.remove(linkView);
    });

    // --- Avoid Router (Web Worker) ---
    //
    // Commands we send:
    //   reset  — full cell set; called on bootstrap, and any time we want the
    //            worker to start from a clean libavoid state.
    //   add    — new cell appeared in the graph.
    //   remove — cell was removed.
    //   change — routing-relevant change on a cell (see the `change` handler
    //            below for the filters we apply before posting).
    //
    // Messages we receive:
    //   routed — array of links with worker-computed { vertices, source, target }.

    let routerWorker;

    function createRouterWorker() {
        const w = new Worker(new URL('./worker.js', import.meta.url));
        w.onmessage = (e) => {
            const { command, ...data } = e.data;
            switch (command) {
                case 'routed': {
                    const { cells } = data;
                    cells.forEach((cell) => {
                        const model = graph.getCell(cell.id);
                        if (model.isElement()) return;
                        // Skip if the user has disconnected an endpoint locally while
                        // the worker was routing — applying would snap it back.
                        if (!model.source()?.id || !model.target()?.id) return;
                        model.set({
                            vertices: cell.vertices,
                            source: cell.source,
                            target: cell.target,
                            router: null
                        }, {
                            fromWorker: true
                        });
                        unmarkAwaiting(model.findView(paper));
                    });
                    break;
                }
                default:
                    console.log('Unknown command', command);
                    break;
            }
        };
        return w;
    }

    // `reset` tears down any prior worker so libavoid never sees stale state.
    function resetRouter(cells) {
        routerWorker?.terminate();
        routerWorker = createRouterWorker();
        routerWorker.postMessage([{ command: 'reset', cells }]);
    }

    resetRouter(graph.toJSON().cells);

    graph.on('change', (cell, opt) => {

        if (opt.fromWorker) {
            return;
        }

        if (cell.isLink()) {
            // The worker only cares about source/target changes on links.
            if (!cell.hasChanged('source') && !cell.hasChanged('target')) return;
            // If the link was dangling and is still dangling, there's nothing to route.
            const wasRoutable = Boolean(cell.previous('source')?.id && cell.previous('target')?.id);
            const isRoutable = Boolean(cell.source()?.id && cell.target()?.id);
            if (!wasRoutable && !isRoutable) return;
        }

        routerWorker.postMessage([{
            command: 'change',
            cell: cell.toJSON()
        }]);

        // When an element moves or resizes, fall connected links back to the
        // rightAngle router for the duration of the worker round-trip — it gives
        // a reasonable-looking route immediately instead of freezing the stale
        // libavoid vertices in place.
        if (cell.isElement() && (cell.hasChanged('position') || cell.hasChanged('size'))) {
            const links = graph.getConnectedLinks(cell);
            links.forEach((link) => {
                link.router() || link.router('rightAngle');
                markAwaiting(link.findView(paper));
            });
        }

    });

    graph.on('remove', (cell) => {
        routerWorker.postMessage([{
            command: 'remove',
            id: cell.id
        }]);
    });

    graph.on('add', (cell) => {
        routerWorker.postMessage([{
            command: 'add',
            cell: cell.toJSON()
        }]);
        if (cell.isLink()) {
            markAwaiting(cell.findView(paper));
        }
    });

    // When the user drops a dragged endpoint onto a port, show a rightAngle
    // route as a placeholder until the worker's computed route arrives.
    paper.on('link:snap:connect', (linkView) => {
        linkView.model.router('rightAngle');
    });

    // When the user drags an endpoint off a port, clear the stale libavoid
    // geometry immediately. The link then stays in 'awaiting-update' until
    // the user reconnects it or removes it.
    paper.on('link:snap:disconnect', (linkView) => {
        linkView.model.set({
            vertices: [],
            router: null
        });
        markAwaiting(linkView);
    });

};
