import { linkTools, elementTools, dia, shapes, highlighters } from '@joint/core';
import { Node, Edge } from '../shared/shapes';
import ResizeTool from '../shared/resize-tool';
import { initAvoidRouter } from '@joint/router-avoid';
import { createExampleCells } from '../shared/example-graph';
import { markAwaiting, unmarkAwaiting } from '../shared/awaiting';

// Web Worker variant — the libavoid routing runs in a Worker spawned by the
// `@joint/router-avoid` package (`worker: true`), so routing never blocks
// the main thread. While a link's route is being computed in the worker,
// the link wears an `awaiting-update` highlighter so the user sees a
// pending state (driven by the router service's `link:routing` /
// `link:routed` / `link:routing:cancelled` events).
//
// Libavoid docs: https://www.adaptagrams.org/documentation/annotated.html
//
// Note: JointJS does not currently allow port ids that are pure numbers.

export const init = async() => {

    document.documentElement.classList.add('web-worker');

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

    // Seed the graph from the shared sample. The router service marks every
    // link as `link:routing` when it syncs the graph on `start()`, which puts
    // it into the awaiting-update state until the worker routes it.
    graph.addCells(createExampleCells());

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
    // The `@joint/router-avoid` package spawns and manages the worker itself.
    // We only listen to the router service's events to drive the
    // awaiting-update visuals:
    //   link:routing           — the link was sent to the worker for routing
    //                            (a provisional rightAngle route is applied
    //                            in the meantime by the service).
    //   link:routed            — the computed route arrived and was applied.
    //   link:routing:cancelled — the pending routing became obsolete
    //                            (e.g. the link was removed or disconnected).

    const routerService = await initAvoidRouter(graph, {
        shapeBufferDistance: 20,
        idealNudgingDistance: 10,
        worker: true,
    });

    routerService.on('link:routing', (link) => {
        const linkView = link.findView(paper);
        if (linkView) markAwaiting(linkView);
    });

    routerService.on('link:routed link:routing:cancelled', (link) => {
        const linkView = link.findView(paper);
        if (linkView) unmarkAwaiting(linkView);
    });

    routerService.start();
};
