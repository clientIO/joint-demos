import { dia, util, shapes, layout, g } from '@joint/plus';

import './styles.css';

const namespace = { ...shapes, Node };
const graph = new dia.Graph({}, { cellNamespace: namespace });

// Generate random nodes.
// -----------------------

const colors = ['#592941', '#498467', '#52b788', '#b2d3a8', '#ede5a6'];
const cells = Array.from({ length: 100 }).map((_, index) => {
    const size = 30 + (Math.random() - 0.5) * 20;
    return {
        id: `Node-${index}`,
        type: 'standard.Ellipse',
        position: { x: 100 + Math.random() * 500, y: 100 + Math.random() * 600 },
        size: { width: size, height: size },
        forceDirectedAttributes: {
            radius: size / 2 + 1,
        },
        attrs: {
            body: {
                stroke: 0,
                fill: colors[g.random(0, colors.length - 1)],
            },
        },
    };
});

graph.fromJSON({ cells: cells });

// Create paper and populate the graph.
// ------------------------------------

const paper = new dia.Paper({
    el: document.getElementById('paper'),
    cellViewNamespace: namespace,
    width: 800,
    height: 800,
    gridSize: 1,
    model: graph,
    async: true,
    clickThreshold: 10,
    interactive: false,
    frozen: true,
    overflow: true,
});

// Create and start a graph layout object with the graph as a model.
// -----------------------------------------------------------------

const forceLayout = new layout.ForceDirected({
    graph,
    gravity: 0,
    layoutArea: paper.getArea().inflate(-20),
    radialForceStrength: 1000,
    charge: 0,
    tTarget: 0.4,
});

forceLayout.finalize();
paper.unfreeze();

let frameId = 0;
function animate(nextFrameIfRunning = false) {
    if (frameId > 0 && !nextFrameIfRunning) {
        return;
    }
    if (forceLayout.t < forceLayout.tMin) {
        frameId = 0;
        return;
    }
    frameId = util.nextFrame(animate, null, true);
    forceLayout.step();
}

function dragstart(elementView) {
    const element = elementView.model;
    forceLayout.changeElementData(element.id, {
        fixed: true,
        v: { x: 0, y: 0 },
    });
}

function drag(elementView, evt, x, y) {
    const element = elementView.model;
    forceLayout.changeElementData(element.id, { p: { x, y } });
    animate();
}

function dragend(elementView) {
    let element = elementView.model;
    forceLayout.changeElementData(element.id, { fixed: false });
}

paper.on({
    'element:pointerdown': dragstart,
    'element:pointermove': drag,
    'element:pointerup': dragend,
});
