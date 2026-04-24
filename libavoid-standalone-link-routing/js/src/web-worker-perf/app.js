import { dia, V, g } from '@joint/core';
import { cellNamespace } from './shapes';
import { AvoidRouter } from '../shared/avoid-router';
import { markAwaiting, unmarkAwaiting } from '../shared/awaiting';
import diagram1 from './example-1.json';
import diagram2 from './example-2.json';

const DIAGRAMS = {
    '1': { label: 'Diagram 1 (TEST_1)', json: diagram1 },
    '2': { label: 'Diagram 2 (TEST_2)', json: diagram2 }
};

export const init = async() => {

    document.documentElement.classList.add('web-worker-perf');

    await AvoidRouter.load();

    const canvasEl = document.getElementById('canvas');

    const graph = new dia.Graph({}, { cellNamespace });
    const paper = new dia.Paper({
        width: '100%',
        height: '100%',
        model: graph,
        cellViewNamespace: cellNamespace,
        gridSize: 10,
        interactive: { linkMove: false },
        linkPinning: false,
        async: true,
        autoFreeze: true,
        background: { color: '#F3F7F6' },
        snapLinks: { radius: 30 },
        overflow: true,
        clickThreshold: 5,
        defaultConnector: {
            name: 'straight',
            args: {
                cornerType: 'cubic',
                cornerRadius: 4,
            },
        },
        defaultAnchor: { name: 'modelCenter' },
        defaultRouter: { name: 'rightAngle' },
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
        defaultLink: () => new cellNamespace.app.Link(),
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

    canvasEl.appendChild(paper.el);

    // Start the Avoid Router in a Web Worker. We recreate the worker on every
    // diagram reset to guarantee no stale state carries over (pending debounce,
    // lingering libavoid shape/connection refs, etc.).
    let routerWorker;

    function createRouterWorker() {
        const w = new Worker(new URL('./worker.js', import.meta.url));
        w.onmessage = (e) => {
            const { command, ...data } = e.data;
            switch (command) {
                case 'routed': {
                    // eslint-disable-next-line no-console
                    console.timeEnd('worker routed');
                    const { cells } = data;
                    cells.forEach((cell) => {
                        const model = graph.getCell(cell.id);
                        if (!model || model.isElement()) return;
                        // Skip if the user has disconnected an endpoint locally while
                        // the worker was routing — applying would snap it back.
                        if (!model.source()?.id || !model.target()?.id) return;
                        model.set({
                            vertices: cell.vertices,
                            source: cell.source,
                            target: cell.target,
                            router: { name: 'normal' }
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

    routerWorker = createRouterWorker();

    // When loading a diagram we suspend the worker sync listeners because
    // we send a single `reset` command with the full cell list instead.
    let loading = false;

    graph.on('change', (cell, opt) => {
        if (opt.fromWorker || loading) return;

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

        if (cell.isElement() && (cell.hasChanged('position') || cell.hasChanged('size'))) {
            const links = graph.getConnectedLinks(cell);
            links.forEach((link) => {
                link.unset('router');
                markAwaiting(link.findView(paper));
            });
        }
    });

    graph.on('remove', (cell) => {
        if (loading) return;
        routerWorker.postMessage([{
            command: 'remove',
            id: cell.id
        }]);
    });

    graph.on('add', (cell) => {
        if (loading) return;
        routerWorker.postMessage([{
            command: 'add',
            cell: cell.toJSON()
        }]);
        if (cell.isLink()) {
            markAwaiting(cell.findView(paper));
        }
    });

    paper.on('link:snap:connect', (linkView) => {
        linkView.model.router('rightAngle');
    });

    paper.on('link:snap:disconnect', (linkView) => {
        linkView.model.set({
            vertices: [],
            router: null
        });
        markAwaiting(linkView);
    });

    const FIT_OPTIONS = {
        useModelGeometry: true,
        padding: 50,
        allowNewOrigin: 'any',
        verticalAlign: 'middle',
        horizontalAlign: 'middle',
    };

    const DRAG_THRESHOLD = 5;
    let drag = null;

    function fitToContent() {
        paper.transformToFitContent(FIT_OPTIONS);
    }

    // Drag on blank frames a region and zooms the paper to fit it.
    // A click (on blank or cell) resets the paper back to fit-to-content.
    paper.on('blank:pointerdown', (_evt, x, y) => {
        drag = { ox: x, oy: y, vel: null, bbox: null };
    });

    paper.on('blank:pointermove', (_evt, x, y) => {
        if (!drag) return;
        const dx = x - drag.ox;
        const dy = y - drag.oy;
        if (!drag.vel) {
            if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
            drag.vel = V('rect', {
                fill: 'rgba(77, 100, 221, 0.1)',
                stroke: '#4D64DD',
                'stroke-width': 1,
                'stroke-dasharray': '4 2',
                'pointer-events': 'none'
            });
            drag.vel.appendTo(paper.viewport);
        }
        const bbox = new g.Rect(drag.ox, drag.oy, dx, dy).normalize();
        drag.vel.attr(bbox.toJSON());
        drag.bbox = bbox;
    });

    paper.on('blank:pointerup', () => {
        if (!drag) return;
        if (drag.vel) {
            drag.vel.remove();
            if (drag.bbox && drag.bbox.width > 1 && drag.bbox.height > 1) {
                paper.transformToFitContent({
                    contentArea: drag.bbox,
                    padding: 50,
                    allowNewOrigin: 'any',
                    verticalAlign: 'middle',
                    horizontalAlign: 'middle'
                });
            }
        }
        drag = null;
    });

    paper.on('blank:pointerclick', () => fitToContent());
    paper.on('cell:pointerclick', () => fitToContent());

    function loadDiagram(json) {
        loading = true;
        graph.fromJSON(json);
        loading = false;

        // Mark links as awaiting-update while the worker routes them.
        graph.getLinks().forEach((link) => markAwaiting(link.findView(paper)));

        // Spin up a fresh worker so no state from the previous diagram leaks in.
        routerWorker.terminate();
        routerWorker = createRouterWorker();

        // Tell the worker to reset with the full new cell set.
        // eslint-disable-next-line no-console
        console.time('worker routed');
        routerWorker.postMessage([{
            command: 'reset',
            cells: json.cells
        }]);

        paper.transformToFitContent(FIT_OPTIONS);
    }

    // Build the diagram-picker UI.
    const selector = document.createElement('select');
    selector.className = 'diagram-selector';
    Object.entries(DIAGRAMS).forEach(([key, { label }]) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = label;
        selector.appendChild(option);
    });
    selector.addEventListener('change', () => {
        loadDiagram(DIAGRAMS[selector.value].json);
    });
    document.body.appendChild(selector);

    // Initial diagram.
    loadDiagram(DIAGRAMS['1'].json);
};
