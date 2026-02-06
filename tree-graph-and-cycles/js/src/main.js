import {
    dia,
    shapes,
    anchors,
    ui,
    linkTools,
    elementTools,
    mvc,
    util,
    graphUtils,
    layout
} from '@joint/plus';
import './styles.css';

const list = {
    a: ['ab', 'ac', 'ad', 'ae', 'aa'],
    ab: ['aba'],
    ac: ['aca', 'acb'],
    aba: [],
    aca: ['acaa', 'acab'],
    acb: [],
    ad: ['ada'],
    ada: ['adaa', 'adab', 'adac'],
    ae: ['aea', 'aeb'],
    aea: ['aeaa', 'aeab'],
    aeb: [],
    aa: ['aaa', 'aab'],
    adaa: [],
    adab: [],
    adac: [],
    aeaa: [],
    aeab: [],
    acaa: [],
    acab: [],
    aaa: [],
    aab: []
};

const graph = new dia.Graph({}, { cellNamespace: shapes });
const treeGraph = new dia.Graph({}, { cellNamespace: shapes });
// Sync the graphs, omit the backwards links in the tree graph.
graph.on('add', (cell) => {
    if (cell.isLink() && cell.get('backwards')) return;
    treeGraph.addCell(cell, { dry: true, sort: false });
});

const linkColor = '#b5dbff';
const backLinkColor = '#80ffd5';
const outlineColor = '#80aaff';
const textColor = '#eaff80';

function makeLink(parentElement = {}, childElement = {}) {
    return new shapes.standard.Link({
        source: { id: parentElement.id },
        target: { id: childElement.id },
        z: 1,
        attrs: {
            line: {
                stroke: linkColor,
                targetMarker: {
                    type: 'path',
                    d: 'M 6 -3 0 0 6 3 z'
                }
            }
        }
    });
}

function makeBackwardsLink(parentElement = {}, childElement = {}) {
    return new shapes.standard.Link({
        backwards: true,
        z: 3,
        source: {
            id: childElement.id
        },
        target: {
            id: parentElement.id
        },
        connector: {
            name: 'curve'
        },
        attrs: {
            line: {
                stroke: backLinkColor,
                strokeDasharray: '2,2'
            }
        }
    });
}

function makeElement(id) {
    return new shapes.standard.Rectangle({
        id: id,
        z: 2,
        size: { width: 40, height: 40 },
        attrs: {
            label: {
                text: makeId(),
                fontSize: 16,
                fontFamily: 'monospace',
                fill: textColor
            },
            body: {
                rx: 5,
                ry: 5,
                stroke: outlineColor,
                strokeWidth: 3,
                fill: 'black',
                fillOpacity: 0.3
            }
        }
    });
}

// generate id in the form of 'a', 'b', 'c', ..., 'z', 'aa', 'ab', 'ac', ...
function numberToLetters(number) {
    let letters = '';
    while (number >= 0) {
        letters = String.fromCharCode(97 + (number % 26)) + letters;
        number = Math.floor(number / 26) - 1;
    }
    return letters;
}
let id = 0;
function makeId() {
    return numberToLetters(id++);
}

const cells = graphUtils.constructTree('a', {
    makeElement: (id) => makeElement(`id_${id}`),
    makeLink,
    children: (id) => list[id]
});

graph.addCells(cells);
graph.addCells([makeBackwardsLink({ id: 'id_ae' }, { id: 'id_adac' })]);

const [root] = graph.getSources();

// Create paper and populate the graph.
// ------------------------------------

const paper = new dia.Paper({
    width: '100%',
    height: '100%',
    model: graph,
    async: true,
    linkPinning: false,
    sorting: dia.Paper.sorting.APPROX,
    background: {
        color: '#002b33'
    },
    frozen: true,
    cellViewNamespace: shapes,
    defaultLink: () => makeBackwardsLink(),
    defaultConnector: {
        name: 'rounded'
    },
    defaultConnectionPoint: { name: 'anchor' },
    defaultAnchor: (elementView, magnet, ref, args, endType, linkView) => {
        if (linkView.model.get('backwards')) {
            const element = elementView.model;
            const [parent] = graph.getNeighbors(element, { inbound: true });
            const parentY = parent.getBBox().center().y;
            const elY = element.getBBox().center().y;
            let dy = 0;
            if (parentY === elY) {
                const childView = linkView.getEndView(
                    endType === 'source' ? 'target' : 'source'
                );
                if (childView) {
                    const childY = childView.model.getBBox().center().y;
                    dy = childY < elY ? -10 : 10;
                }
            } else {
                dy = parentY < elY ? 10 : -10;
            }
            return anchors.left(elementView, magnet, ref, { dy }, endType, linkView);
        }
        if (endType === 'source') {
            return anchors.right(elementView, magnet, ref, args, endType, linkView);
        }
        return anchors.left(elementView, magnet, ref, args, endType, linkView);
    }
});

document.getElementById('paper-container').appendChild(paper.el);

const tree = new layout.TreeLayout({
    graph: treeGraph,
    siblingGap: 30,
    parentGap: 30
});

runLayout();
paper.unfreeze();

// eslint-disable-next-line no-unused-vars
const treeView = new ui.TreeLayoutView({
    model: tree,
    paper,
    theme: 'modern',
    validatePosition: () => false,
    canInteract: (cellView) => cellView.model !== root,
    reconnectElements: (
        [element],
        target,
        siblingRank,
        direction,
        treeLayoutView
    ) => {
        treeLayoutView.reconnectElement(element, {
            id: target.id,
            siblingRank,
            direction
        });
        runLayout();
    }
});

paper.setInteractivity({
    arrowheadMove: true,
    elementMove: false,
    linkMove: false
});

const linkToolsView = new dia.ToolsView({
    tools: [
        new linkTools.Vertices(),
        new linkTools.SourceArrowhead(),
        new linkTools.TargetArrowhead(),
        new linkTools.Remove({
            markup: util.svg`
                  <circle r="10" fill="black" stroke="${outlineColor}" cursor="pointer" />
                  <path d="M -5 -5 5 5 M 5 -5 -5 5" stroke="${textColor}" stroke-width="2" pointer-events="none" />
              `
        })
    ]
});

const elementToolsView = new dia.ToolsView({
    tools: [
        new elementTools.Button({
            x: 'calc(w)',
            y: 'calc(h / 2)',
            markup: util.svg`
                  <circle r="10" fill="black" stroke="${outlineColor}" cursor="pointer" />
                  <path d="M -5 0 5 0 M 0 -5 0 5" stroke-width="2" stroke="${textColor}" fill="transparent" pointer-events="none" />
              `,
            action: (evt, view) => {
                const id = makeId();
                const element = makeElement(id);
                const parent = view.model;
                const link = makeLink(parent, element);
                graph.addCells([element, link]);
                runLayout();
            }
        }),
        new elementTools.Connect({
            y: 'calc(h / 2)',
            markup: util.svg`
                  <circle r="10" fill="black" stroke="${outlineColor}" cursor="pointer" />
                  <path d="M 5 -5 -5 0 5 5" stroke="${textColor}" stroke-width="2" fill="transparent" pointer-events="none" />
              `
        })
    ]
});

const listener = new mvc.Listener();

listener.listenTo(paper, {
    'link:mouseenter': (linkView) => {
        if (!linkView.model.get('backwards')) return;
        linkView.addTools(linkToolsView);
    },
    'link:mouseleave': (linkView) => {
        linkView.removeTools();
    },
    'element:mouseenter': (elementView) => {
        elementView.addTools(elementToolsView);
    },
    'element:mouseleave': (elementView) => {
        elementView.removeTools();
    }
});

function runLayout() {
    tree.layout();
    const bbox = tree.getLayoutBBox().inflate(50);
    const area = paper.getArea();
    if (bbox.union(area).equals(area)) return;
    // Scale down the paper only if the content overflows.
    paper.transformToFitContent({
        contentArea: bbox,
        padding: 50
    });
}
