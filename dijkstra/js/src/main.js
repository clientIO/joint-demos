import { dia, elementTools, graphUtils, highlighters, layout, linkTools, shapes, V } from '@joint/plus';
import { ViewController, invalidPathHighlightId, invalidPathClassName } from './controllers/view-controller.js';
import { EditController } from './controllers/edit-controller.js';
import './styles.css';

// Adjacency list.
// ------------
const m = {
    a: ['b', 'c'],
    b: ['d', 'e'],
    c: ['a'],
    d: ['f', 'g'],
    e: ['a', 'd'],
};
// Globals
// ------------
let startView;
let endView;
let directed = false;
let pathMembersViews = [];
const pathMemberHighlightId = 'path-member';
const pathMemberClassName = 'path-member';
const highlightId = 'start-highlight';
const blueColor = '#4666E5';
const blackColor = '#222222';
const invalidColor = '#FF4365';
const outlineColor = '#616161';
const startAttrs = {
    padding: 2,
    attrs: {
        stroke: blueColor,
        'stroke-width': 2
    }
};
let nextId = 8;
let editMode = false;
const size = 40;
const editModePopup = document.getElementById('popup');
const getTargetMarkerStyle = () => ({ type: 'path', d: directed ? 'M 6 -3 0 0 6 3 z' : null, fill: blackColor, stroke: blackColor });
const getLinkStyle = () => {
    return directed ?
        V.createSVGStyle(`
            .joint-link .${pathMemberClassName} {
                stroke: ${blueColor};
                stroke-dasharray: 5;
                stroke-dashoffset: 100;
                animation: dash 1.25s infinite linear;
            }
        `) : V.createSVGStyle(`
            .joint-link .${pathMemberClassName} {
                animation: stroke 0.6s ease-in-out infinite alternate;
            }
        `);
};
const getStartView = () => startView;
const getEndView = () => endView;

const graph = new dia.Graph;
const paperElement = document.getElementById('paper');
const paper = new dia.Paper({
    el: paperElement,
    width: 800,
    height: 400,
    gridSize: 1,
    model: graph,
    sorting: dia.Paper.sorting.APPROX,
    defaultLink: () => new shapes.standard.Link({ attrs: { line: { targetMarker: getTargetMarkerStyle(), stroke: outlineColor }}}),
    defaultConnectionPoint: { name: 'boundary', args: { offset: 4 }},
    linkPinning: false,
    async: true,
    frozen: true,
    interactive: () => editMode,
    validateConnection: (cellViewS, _magnetS, cellViewT) => {
        const id = [cellViewS.model.id, cellViewT.model.id].sort().join();
        const existingLink = graph.getCell(id);
        const isSameCell = cellViewS.model.id === cellViewT.model.id;

        return !isSameCell && !existingLink && !cellViewT.model.isLink();
    },
    highlighting: {
        connecting: {
            name: 'mask',
            options: {
                padding: 2,
                attrs: {
                    stroke: blueColor,
                    'stroke-width': 2
                }
            }
        }
    }
});

const viewController = new ViewController({ paper, showPath, hidePath, setStartView, setEndView, getStartView, getEndView });
const editController = new EditController({ graph, paper, createLink, createNode, setStartView, setEndView, getStartView, size, getNodeId });
// Helpers.
// ------------

// Create a node with `id`
function createNode(id) {
    const node = (new shapes.standard.Circle({
        id,
        size: { width: size, height: size },
        z: 1,
        attrs: {
            root: {
                highlighterSelector: 'body'
            },
            body: {
                fill: blackColor,
                stroke: outlineColor
            },
            label: {
                fill: '#fff',
                style: { textTransform: 'capitalize' },
                pointerEvents: 'none',
            }
        }
    })).addTo(graph);
    const view = node.findView(paper);
    view.addTools(new dia.ToolsView({
        tools: [
            new elementTools.HoverConnect({
                useModelGeometry: true,
                trackPath: V.convertCircleToPathData(V(`<circle cx="${size / 2}" cy="${size / 2}"  r="${size / 2}" />`))
            }),
        ]
    }));

    view.hideTools();

    node.attr('label/text', id);
    return node;
}

// Create a link between a source element with id `s` and target element with id `t`.
function createLink(s, t) {
    const link  = new shapes.standard.Link({
        id: [s,t].sort().join(),
        source: { id: s },
        target: { id: t },
        z: 1,
        attrs: {
            wrapper: {
                stroke: 'white',
                'stroke-width': 6
            },
            line: { targetMarker: getTargetMarkerStyle(), stroke: outlineColor }
        }
    });
    link.addTo(graph);

    const view = link.findView(paper);
    view.addTools(new dia.ToolsView({
        tools: [
            new linkTools.Vertices(),
            new linkTools.Remove({ distance: '10%' })
        ]
    }));

    view.hideTools();
}

function setStartView(elementView) {
    hidePath();
    if (startView) {
        highlighters.mask.remove(startView, highlightId);
        highlighters.addClass.remove(startView, invalidPathHighlightId);
    }

    if (endView) {
        highlighters.addClass.remove(endView, invalidPathHighlightId);
    }

    if (elementView) {
        highlighters.mask.add(elementView, 'body', highlightId, startAttrs);
    }
    startView = elementView;
}

function setEndView(elementView) {
    endView = elementView;
}

function getElementPath() {
    if (startView && endView) {
        return graphUtils.shortestPath(graph, startView.model, endView.model, { directed });
    }

    return [];
}

function getLinkPath(elementPath) {
    const linkPath = [];

    if (startView) {
        for (let i = 0; i < elementPath.length - 1; i++) {
            const sourceId = elementPath[i];
            const targetId = elementPath[i + 1];
            const link = graph.getCell([sourceId, targetId].sort().join());
            if (!link) continue;

            linkPath.push(link.id);
            link.label(0, {
                position: .5,
                attrs: {
                    text: { text: ' ' + (i + 1) + ' ', fontSize: 10, fill: 'white' },
                    rect: { rx: 8, ry: 8, fill: blueColor, stroke: blueColor, strokeWidth: 5 }
                },
            });
        }
    }

    return linkPath;
}

function showPath() {
    const elementPath = getElementPath();
    const isPathFound = elementPath.length > 0;

    if (!isPathFound && startView && endView && startView.id !== endView.id && !editMode) {
        highlighters.addClass.add(startView, 'body', invalidPathHighlightId, {
            className: invalidPathClassName
        });
        highlighters.addClass.add(endView, 'body', invalidPathHighlightId, {
            className: invalidPathClassName
        });
        hidePath();
        return;
    }

    if (startView) highlighters.addClass.remove(startView, invalidPathHighlightId);
    if (endView) highlighters.addClass.remove(endView, invalidPathHighlightId);
    hidePath();
    const linkPath = getLinkPath(elementPath);

    for (const elementId of [...elementPath, ...linkPath]) {
        const element = graph.getCell(elementId);
        const view = element.findView(paper);
        const isLink = view.model.isLink();
        highlighters.addClass.add(view, isLink ? 'line' : 'body', pathMemberHighlightId, {
            className: pathMemberClassName
        });

        if (isLink) {
            element.set('z', 2);
        }

        pathMembersViews.push(view);
    }

    document.getElementById('path').innerText = elementPath.join(' → ');
}

function hidePath() {
    for (const view of pathMembersViews) {
        const model = view.model;
        highlighters.addClass.remove(view, pathMemberHighlightId);

        if (model.isLink()) {
            model.set('z', 1);
            model.labels([]);
        }
    }

    pathMembersViews = [];
    document.getElementById('path').innerText = '';
}

function toggleLinkStyle() {
    if (linkStyle) paper.svg.removeChild(linkStyle);

    linkStyle = getLinkStyle();
    paper.svg.prepend(linkStyle);
}

function getNodeId() {
    let result = '';
    let num = 0;
    let currentId = nextId;

    while (currentId > 0) {
        num = (currentId - 1) % 26;
        result = String.fromCharCode(97 + num) + result;
        currentId = Math.floor((currentId - num) / 26);
    }

    nextId++;
    return result;
}

function toggleView() {
    for(const element of graph.getElements()) {
        element.attr('body/cursor', editMode ? 'move' : 'pointer');
    }

    if (editMode) {
        viewController.stopListening();
        editController.startListening();
        hidePath();
        if (startView) {
            highlighters.mask.remove(startView, highlightId);
            highlighters.addClass.remove(startView, invalidPathHighlightId);
        }
        if (endView) {
            highlighters.addClass.remove(endView, invalidPathHighlightId);
        }
    } else {
        viewController.startListening();
        editController.stopListening();
        showPath();
        if (startView) {
            highlighters.mask.add(startView, 'body', highlightId, startAttrs);
        }
    }
}

// UI.
// ------------

document.getElementById('directed-graph-toggle').addEventListener('change', (evt) => {
    directed = evt.target.checked;
    hidePath();
    if (!editMode) showPath();
    graph.getLinks().forEach((link) => {
        link.attr('line/targetMarker', getTargetMarkerStyle());
    });
    toggleLinkStyle();
});

document.getElementById('edit-mode-toggle').addEventListener('change', (evt) => {
    editMode = evt.target.checked;
    editModePopup.classList.toggle('displayed');
    toggleView();
});

// Styling
// ------------

const styles = V.createSVGStyle(`
    .joint-element .${pathMemberClassName} {
        stroke: ${blueColor};
        fill: ${blueColor};
        fill-opacity: 0.75;
    }
    .joint-element .${invalidPathClassName} {
        stroke: ${invalidColor};
        fill: ${invalidColor};
        fill-opacity: 0.2;
    }
    @keyframes dash {
        to {
            stroke-dashoffset: 0;
        }
    }
    @keyframes stroke {
        to {
            stroke: ${blueColor};
        }
    }
`);

let linkStyle = getLinkStyle();

paper.svg.prepend(styles);
paper.svg.prepend(linkStyle);

// Generating nodes, links and positioning them.
// ------------

// Construct nodes and links based on the adjacency list.
Object.keys(m).forEach((parent) => {
    createNode(parent);
    m[parent].forEach((adj) => {
        // Do not create the node if it's already in the graph.
        if (!graph.getCell(adj)) createNode(adj);
        createLink(parent, adj);
    });
});

// Apply force directed layout to randomly positioned nodes.
const graphLayout = new layout.ForceDirected({
    graph,
    layoutArea: paper.getArea().inflate(-size),
    gravityCenter: paper.getArea().center(),
    charge: 100,
    linkDistance: 100
});

graphLayout.start();
graphLayout.finalize();

const onStartElement = graph.getCell('a');
const onStartView = onStartElement.findView(paper);
setStartView(onStartView);
toggleView();

paper.unfreeze({ afterRender: () => paper.hideTools() });
