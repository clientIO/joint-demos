import { dia, util, shapes, layout } from '@joint/plus';

import './styles.css';

class Node extends shapes.standard.Ellipse {
    defaults() {
        return util.defaultsDeep(
            {
                type: 'Node',
                size: { width: 30, height: 30 },
                attrs: {
                    label: { text: '', fill: 'white' },
                    body: { fill: '#498467', stroke: 'none' },
                },
                z: 2,
            },
            super.defaults
        );
    }
}

class Link extends shapes.standard.Link {
    defaults() {
        return util.defaultsDeep(
            {
                type: 'Link',
                attrs: {
                    line: {
                        targetMarker: null,
                        stroke: '#4BCFE7',
                    },
                },
                z: 1,
            },
            super.defaults
        );
    }
}

const namespace = {
    ...shapes,
    Node,
    Link,
};
const graph = new dia.Graph({}, { cellNamespace: namespace });

const cells = [
    { type: 'Link', source: { id: 'A' }, target: { id: 'B' } },
    { type: 'Link', source: { id: 'A' }, target: { id: 'C' } },
    { type: 'Link', source: { id: 'A' }, target: { id: 'D' } },
    { type: 'Link', source: { id: 'A' }, target: { id: 'E' } },
    { type: 'Link', source: { id: 'A' }, target: { id: 'F' } },
    { type: 'Link', source: { id: 'A' }, target: { id: 'G' } },
    { type: 'Link', source: { id: 'B' }, target: { id: 'H' } },
    { type: 'Link', source: { id: 'B' }, target: { id: 'I' } },
    { type: 'Link', source: { id: 'B' }, target: { id: 'J' } },
    {
        id: 'A',
        type: 'Node',
        position: { x: 350, y: 400 },
        attrs: { label: { text: 'A' } },
    },
    {
        id: 'B',
        type: 'Node',
        position: { x: 450, y: 400 },
        attrs: { label: { text: 'B' } },
    },
    {
        id: 'C',
        type: 'Node',
        position: { x: 550, y: 400 },
        attrs: { label: { text: 'C' } },
    },
    {
        id: 'D',
        type: 'Node',
        position: { x: 650, y: 400 },
        attrs: { label: { text: 'D' } },
    },
    {
        id: 'E',
        type: 'Node',
        position: { x: 350, y: 500 },
        attrs: { label: { text: 'E' } },
    },
    {
        id: 'F',
        type: 'Node',
        position: { x: 450, y: 500 },
        attrs: { label: { text: 'F' } },
    },
    {
        id: 'G',
        type: 'Node',
        position: { x: 550, y: 500 },
        attrs: { label: { text: 'G' } },
    },
    {
        id: 'H',
        type: 'Node',
        position: { x: 650, y: 500 },
        attrs: { label: { text: 'H' } },
    },
    {
        id: 'I',
        type: 'Node',
        position: { x: 350, y: 600 },
        attrs: { label: { text: 'I' } },
    },
    {
        id: 'J',
        type: 'Node',
        position: { x: 450, y: 600 },
        attrs: { label: { text: 'J' } },
    },
];

graph.fromJSON({ cells: cells });

const colors = [
    '#354EC0',
    '#3F58CA',
    '#4F66CF',
    '#5F74D3',
    '#6F82D8',
    '#7F90DC',
    '#8F9EE0',
];

graph.search(graph.getCell('A'), (cell, distance) => {
    cell.prop({
        level: distance,
        attrs: {
            body: { fill: colors[Math.min(distance, colors.length - 1)] },
        },
    });
});

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
    defaultAnchor: { name: 'modelCenter' },
    defaultConnectionPoint: { name: 'anchor' },
});

// Create and start a graph layout object with the graph as a model.
// -----------------------------------------------------------------

const forceLayout = new layout.ForceDirected({
    graph,
    layoutArea: paper.getArea(),
    gravityCenter: paper.getArea().center(),
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
    forceLayout.restart(0.6);
    animate();
}

function dragend(elementView) {
    const element = elementView.model;
    forceLayout.changeElementData(element.id, { fixed: false });
    forceLayout.restart(1);
}

paper.on({
    'element:pointerdown': dragstart,
    'element:pointermove': drag,
    'element:pointerup': dragend,
});

// Add a new node and link it to the clicked element.
// --------------------------------------------------

let counter = 1;
paper.on('element:pointerclick', (elementView) => {
    const sourceElement = elementView.model;
    const level = sourceElement.get('level') + 1;

    // Create a new node and link it to the clicked element
    const targetElement = new Node({
        position: sourceElement.position().toJSON(),
        level,
        attrs: {
            label: { text: `${counter++}` },
            body: { fill: colors[Math.min(level, colors.length - 1)] },
        },
        z: 2,
    });
    const link = new Link({
        source: { id: sourceElement.id },
        target: { id: targetElement.id },
    });

    // Add the new node and link to the graph
    graph.addCells([targetElement, link]);

    // Update the simulation
    forceLayout.addElement(targetElement);
    forceLayout.addLink(link);
    forceLayout.restart(1);

    animate();
});
