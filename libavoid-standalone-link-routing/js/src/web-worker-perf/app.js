import { dia, V, g } from '@joint/core';
import { cellNamespace } from './shapes';
import { initAvoidRouter } from '@joint/router-avoid';
import { markAwaiting, unmarkAwaiting } from '../shared/awaiting';
import diagram1 from './example-1.json';
import diagram2 from './example-2.json';

const DIAGRAMS = {
    '1': { label: 'Diagram 1 (TEST_1)', json: diagram1 },
    '2': { label: 'Diagram 2 (TEST_2)', json: diagram2 }
};

export const init = async() => {

    document.documentElement.classList.add('web-worker-perf');

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

    // Start the Avoid Router in a Web Worker. The `@joint/router-avoid`
    // package spawns and manages the worker itself (`worker: true`) and
    // batches graph changes before sending them to the worker. The router
    // service's events drive the awaiting-update visuals; the `idle` event
    // (fired when the worker has no more routing to do) closes the timer
    // started in `loadDiagram()`.

    const routerService = await initAvoidRouter(graph, {
        shapeBufferDistance: 20,
        idealNudgingDistance: 10,
        worker: true,
    });

    routerService.on('link:routing', (link) => {
        const linkView = link.findView(paper);
        if (linkView) markAwaiting(linkView);
    });

    routerService.on('link:routed', (link) => {
        const linkView = link.findView(paper);
        if (linkView) unmarkAwaiting(linkView);
    });

    routerService.on('link:routing:cancelled', (link) => {
        const linkView = link.findView(paper);
        if (linkView) unmarkAwaiting(linkView);
    });

    let timing = false;

    routerService.on('idle', () => {
        if (!timing) return;
        timing = false;
        // eslint-disable-next-line no-console
        console.timeEnd('worker routed');
    });

    routerService.start();

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
        timing = true;
        // eslint-disable-next-line no-console
        console.time('worker routed');

        // `fromJSON` fires the graph's `reset` event — the router service
        // reacts to it by re-syncing its whole avoid state from scratch,
        // so no manual worker recreation is needed.
        graph.fromJSON(json);

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
