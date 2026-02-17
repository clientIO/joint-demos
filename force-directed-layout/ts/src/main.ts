import { dia, util, shapes, ui, layout } from '@joint/plus';
import { Entity, Relationship, Attribute, Connection } from './shapes';
import ERDGraph from './graph';

import './styles.css';

const namespace = {
    ...shapes,
    erd: {
        Entity,
        Relationship,
        Attribute,
        Connection,
    },
};

const graph = new dia.Graph({}, { cellNamespace: namespace });

graph.fromJSON(ERDGraph);

// Create paper and populate the graph.
// ------------------------------------

const paper = new dia.Paper({
    cellViewNamespace: namespace,
    gridSize: 1,
    model: graph,
    async: true,
    clickThreshold: 10,
    interactive: false,
    frozen: true,
    sorting: dia.Paper.sorting.APPROX,
    defaultAnchor: { name: 'center' },
    defaultConnectionPoint: { name: 'boundary' },
});

const paperScroller = new ui.PaperScroller({
    autoResizePaper: true,
    padding: 50,
    paper,
    cursor: 'grab',
});

const el = document.getElementById('paper') as HTMLElement;

el.appendChild(paperScroller.render().el);
paperScroller.center();

const forceLayout = new layout.ForceDirected({
    graph: graph,
    linkDistance: 100,
    linkBias: false,
    radialForceStrength: 500,
});

forceLayout.start();

let layoutFinished = false;

forceLayout.on('end', () => {
    layoutFinished = true;
});

let isAnimating = false;

function animate() {
    if (layoutFinished) {
        isAnimating = false;
        return;
    }
    isAnimating = true;
    util.nextFrame(animate);
    forceLayout.step();
}

paper.unfreeze();

let dragging = false;

function drag(
    elementView: dia.ElementView,
    _event: any,
    clientX: number,
    clientY: number
) {
    let element = elementView.model;
    const forceLayoutNode = forceLayout.getElementData(element.id);

    let x = forceLayoutNode.p.x;
    let y = forceLayoutNode.p.y;

    if (!forceLayoutNode.restrictX) {
        x = clientX;
    }

    if (!forceLayoutNode.restrictY) {
        y = clientY;
    }

    if (!dragging) {
        forceLayoutNode.fixed = true;
        forceLayoutNode.v = { x: 0, y: 0 };

        dragging = true;
    }

    forceLayoutNode.p = { x, y };

    if (layoutFinished) {
        layoutFinished = false;
    }

    if (!isAnimating) {
        animate();
    }

    forceLayout.restart(0.6);
}

function dragend(elementView: dia.ElementView) {
    let element = elementView.model;

    if (!elementView.model.prop('forceDirectedAttributes/fixed')) {
        forceLayout.changeElementData(element.id, {
            fixed: false,
        });
    }

    forceLayout.restart(1);

    dragging = false;
}

paper.on({
    'element:pointermove': drag,
    'element:pointerup': dragend,
});

paper.on('blank:pointerdown', (evt: dia.Event) => paperScroller.startPanning(evt));

paper.on('paper:pan', (evt: dia.Event, tx: number, ty: number) => {
    evt.preventDefault();
    paperScroller.el.scrollLeft += tx;
    paperScroller.el.scrollTop += ty;
});

paper.on(
    'paper:pinch',
    (_evt: dia.Event, ox: number, oy: number, scale: number) => {
        // the default is already prevented
        paperScroller.zoom(paperScroller.zoom() * scale, {
            min: 0.2,
            max: 4,
            ox,
            oy,
            absolute: true,
        });
    }
);

forceLayout.finalize();

paperScroller.zoom(-0.3);
