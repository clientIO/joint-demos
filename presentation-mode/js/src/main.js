import { dia, ui, shapes, highlighters, util } from '@joint/plus';
import './styles.scss';

// Paper

const graph = new dia.Graph({}, { cellNamespace: shapes });
const paper = new dia.Paper({
    model: graph,
    cellViewNamespace: shapes,
    async: true,
    sorting: dia.Paper.sorting.APPROX,
    defaultConnectionPoint: { name: 'boundary' },
    background: { color: '#F3F7F6' },
    restrictTranslate: true,
    clickThreshold: 10
});

const scroller = new ui.PaperScroller({
    paper
});

document.getElementById('paper-container').appendChild(scroller.el);

paper.on('blank:pointerdown', (evt) => scroller.startPanning(evt));
// Selection

const selection = new ui.Selection({
    paper,
    useModelGeometry: true,
    theme: 'material',
    boxContent: false
});

selection.removeHandle('resize');
selection.removeHandle('rotate');
selection.removeHandle('remove');

selection.collection.on('reset', function() {
    openInspector();
});

// Inspector

let _inspector = null;

function openInspector() {
    const container = document.getElementById('inspector-container');

    if (_inspector) {
        _inspector.remove();
        _inspector = null;
    }

    const cells = selection.collection.models;
    if (cells.length !== 1) return;

    const [cell] = cells;

    const inspector = new ui.Inspector({
        cell,
        theme: 'material',
        inputs: {
            'attrs/label/text': {
                type: 'content-editable',
                label: 'Label',
                index: 1
            },
            presentationOrder: {
                type: 'number',
                label: 'Presentation Order',
                defaultValue: 0,
                index: 2
            }
        }
    });

    container.append(inspector.el);
    inspector.render();

    _inspector = inspector;
}

// Example

graph.fromJSON({
    cells: [
        {
            id: 'r3',
            presentationOrder: 1,
            type: 'standard.Rectangle',
            position: { x: 200, y: 80 },
            size: { width: 100, height: 60 },
            attrs: {
                body: {
                    rx: 20,
                    ry: 20
                },
                label: {
                    text: 'Start'
                }
            }
        },
        {
            id: 'p2',
            presentationOrder: 2,
            type: 'standard.Path',
            position: { x: 200, y: 230 },
            size: { width: 100, height: 60 },
            attrs: {
                body: {
                    d: 'M 20 0 H calc(w) L calc(w-20) calc(h) H 0 Z'
                },
                label: {
                    text: 'Input'
                }
            }
        },
        {
            id: 'p1',
            presentationOrder: 3,
            type: 'standard.Path',
            position: { x: 200, y: 400 },
            size: { width: 100, height: 100 },
            attrs: {
                body: {
                    d:
                        'M 0 calc(0.5 * h) calc(0.5 * w) 0 calc(w) calc(0.5 * h) calc(0.5 * w) calc(h) Z'
                },
                label: {
                    text: 'Decision'
                }
            }
        },
        {
            id: 'r4',
            type: 'standard.Rectangle',
            presentationOrder: 4,
            position: { x: 200, y: 600 },
            size: { width: 100, height: 60 },
            attrs: {
                label: {
                    text: 'Process'
                }
            }
        },
        {
            id: 'e1',
            presentationOrder: 5,
            type: 'standard.Ellipse',
            position: { x: 220, y: 750 },
            size: { width: 60, height: 60 },
            attrs: {
                label: {
                    text: 'End'
                }
            }
        },
        {
            id: 'l1',
            type: 'standard.Link',
            source: { id: 'r3' },
            target: { id: 'p2' }
        },
        {
            id: 'l2',
            type: 'standard.Link',
            source: { id: 'p2' },
            target: { id: 'p1' }
        },
        {
            id: 'l3',
            type: 'standard.Link',
            source: { id: 'p1' },
            target: { id: 'r4' },
            labels: [{ attrs: { text: { text: 'Yes' }}}]
        },
        {
            id: 'l4',
            type: 'standard.Link',
            source: { id: 'p1' },
            target: { id: 'p2' },
            vertices: [
                { x: 400, y: 450 },
                { x: 400, y: 260 }
            ],
            labels: [{ attrs: { text: { text: 'No' }}}]
        },
        {
            id: 'l5',
            type: 'standard.Link',
            source: { id: 'r4' },
            target: { id: 'e1' }
        }
    ]
});

paper.fitToContent({
    useModelGeometry: true,
    padding: 200,
    allowNewOrigin: 'any'
});
scroller.centerContent({ useModelGeometry: true });

// Toolbar

const toolbar = new ui.Toolbar({
    theme: 'modern',
    tools: [
        {
            type: 'button',
            text: 'Next',
            name: 'next'
        },
        {
            type: 'button',
            text: 'Previous',
            name: 'prev'
        },
        {
            type: 'button',
            text: 'Start',
            name: 'start'
        },
        {
            type: 'button',
            text: 'Stop',
            name: 'stop'
        }
    ]
});

document.getElementById('toolbar-container').appendChild(toolbar.render().el);

// Presentation Logic

let controls = null;
start();

toolbar.on('next:pointerclick', () => controls.goNext());
toolbar.on('prev:pointerclick', () => controls.goPrev());
toolbar.on('stop:pointerclick', () => stop());
toolbar.on('start:pointerclick', () => start());

function start() {
    document.getElementById('app').classList.add('presentation');
    selection.collection.reset([]);
    paper.setInteractivity(false);
    controls = getPresentationControls(scroller);
    controls.goNext();
    toolbar.getWidgetByName('next').enable();
    toolbar.getWidgetByName('prev').enable();
    toolbar.getWidgetByName('start').disable();
    toolbar.getWidgetByName('stop').enable();
}

function stop() {
    if (!controls) return;
    document.getElementById('app').classList.remove('presentation');
    const [el] = graph.getElements();
    if (el) selection.collection.reset([el]);
    paper.setInteractivity(true);
    controls.stop();
    controls = null;
    toolbar.getWidgetByName('next').disable();
    toolbar.getWidgetByName('prev').disable();
    toolbar.getWidgetByName('start').enable();
    toolbar.getWidgetByName('stop').disable();
}

function getPresentationControls(scroller) {
    const paper = scroller.options.paper;
    const graph = paper.model;

    const order = util.sortBy(
        graph.getElements(),
        (el) => el.get('presentationOrder') || 0
    );

    let j = -1;
    let highlighter;

    const goNext = () => {
        j++;
        if (j === order.length) j = 0;
        selectElement(order[j]);
    };

    const goPrev = () => {
        j--;
        if (j === -1) j = order.length - 1;
        selectElement(order[j]);
    };

    const goTo = (element) => {
        const k = order.findIndex((el) => el === element);
        if (k === -1) return;
        selectElement(element);
        j = k;
    };

    const stop = () => {
        if (highlighter) highlighter.remove();
    };

    function selectElement(element) {
        scroller.scrollToElement(element, { animation: true });
        if (highlighter) {
            highlighter.remove();
        }
        highlighter = highlighters.mask.add(
            element.findView(paper),
            'body',
            'focus',
            {
                attrs: {
                    stroke: '#60AAEE',
                    'stroke-width': 4
                }
            }
        );
    }

    return { goNext, goPrev, goTo, stop };
}

// Interactions

paper.on('element:pointerclick', function(elementView) {
    const element = elementView.model;
    if (controls) {
        controls.goTo(elementView.model);
    } else {
        selection.collection.reset([element]);
    }
});

paper.on('blank:pointerclick', function() {
    selection.collection.reset([]);
});
