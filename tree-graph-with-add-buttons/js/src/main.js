import { dia, ui, shapes, layout, graphUtils } from '@joint/plus';
import './styles.scss';

const graph = new dia.Graph({}, { cellNamespace: shapes });
const paper = new dia.Paper({
    model: graph,
    cellViewNamespace: shapes,
    async: true,
    sorting: dia.Paper.sorting.APPROX,
    restrictTranslate: true,
    background: { color: '#F3F7F6' },
    defaultLink: () => new shapes.standard.Link(),
    defaultConnectionPoint: { name: 'boundary' },
    interactive: false
});

document.getElementById('paper-container').appendChild(paper.el);

// Populate Graph
// --------------

const list = {
    e1: ['e2', 'e3'],
    e2: ['e4'],
    e3: ['e5', 'e6'],
    e4: ['e8'],
    e5: ['e7'],
    e6: ['e9'],
    e7: [],
    e8: [],
    e9: []
};

const cells = graphUtils.constructTree('e1', {
    makeElement: (id) => makeElement(id, 0),
    makeLink,
    children: (root) => list[root]
});

graph.resetCells(cells);

let lastId = graph.getElements().length;

const source = graph.getCell('e1');

// Root position is not changed by the layout.
source.position(80, 285).attr({
    body: { stroke: '#0057FF' },
    label: { fill: '#0057FF' }
});

// Create Tree Layout and View
// ---------------------------
const tree = new layout.TreeLayout({
    graph: graph,
    verticalGap: 20,
    horizontalGap: 40
});

// eslint-disable-next-line no-unused-vars
const treeView = new ui.TreeLayoutView({
    theme: 'modern',
    paper: paper,
    model: tree,
    validatePosition: () => false,
    validateConnection: (_child, _parent, _treeView, details) => {
        const { siblings, siblingRank } = details;
        if (siblingRank >= siblings.length - 1) return false;
        return true;
    },
    reconnectElements: (
        [element],
        target,
        siblingRank,
        direction,
        treeLayoutView
    ) => {
        treeLayoutView.reconnectElement(element, {
            siblingRank,
            direction,
            id: target.id
        });
        runLayout();
    },
    canInteract: ({ model }) => !graph.isSource(model) && !isButton(model)
});

// Layout and Render the Cells
// -----------------

function runLayout() {
    makeButtons(source);
    tree.layout();
    paper.fitToContent({
        allowNewOrigin: 'any',
        contentArea: tree.getLayoutBBox(),
        padding: 50
    });
}

runLayout();

paper.unfreeze();

paper.on('element:pointerclick', ({ model }) => {
    if (!isButton(model)) return;
    const [parent] = graph.getNeighbors(model, { inbound: true });
    const el = makeElement(`e${++lastId}`, model.get('siblingRank') - 0.5);
    const link = makeLink(parent, el);
    graph.addCells([el, link]);
    runLayout();
});

// Utils
// -----

function makeLink(parent = {}, child = {}) {
    return new shapes.standard.Link({
        source: { id: parent.id },
        target: { id: child.id },
        connector: { name: 'rounded' },
        z: -1,
        attrs: {
            line: {
                strokeWidth: 2,
                targetMarker: null
            }
        }
    });
}

function makeElement(id, siblingRank) {
    return new shapes.standard.Rectangle({
        id,
        siblingRank,
        size: { width: 30, height: 30 },
        attrs: {
            label: {
                text: id,
                fill: '#666666',
                fontSize: 13,
                fontFamily: 'sans-serif',
                style: {
                    textTransform: 'capitalize'
                }
            },
            body: {
                rx: 5,
                ry: 5,
                stroke: '#333333'
            }
        }
    });
}

function makeButton() {
    return new shapes.standard.Circle({
        siblingRank: Infinity,
        size: { width: 20, height: 20 },
        attrs: {
            root: {
                style: { cursor: 'pointer' }
            },
            body: {
                stroke: 'gray',
                strokeWidth: 1
            },
            label: {
                fontWeight: 'bold',
                text: '+'
            }
        }
    });
}

function makeButtons(root) {
    graph.search(root, (el) => {
        if (isButton(el)) return false;
        const existingButton = graph
            .getNeighbors(el, { outbound: true })
            .find(isButton);
        if (existingButton) return true;
        const button = makeButton();
        const link = makeLink(el, button);
        graph.addCells([button, link]);
        return true;
    });
}

function isButton(el) {
    return el.get('type') === 'standard.Circle';
}
