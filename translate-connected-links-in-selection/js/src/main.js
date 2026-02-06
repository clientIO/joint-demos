import { dia, ui, shapes } from '@joint/plus';
import './styles.css';

const graph = new dia.Graph({}, { cellNamespace: shapes });
const paper = new dia.Paper({
    model: graph,
    cellViewNamespace: shapes,
    width: '100%',
    height: '100%',
    gridSize: 20,
    async: true,
    sorting: dia.Paper.sorting.APPROX,
    restrictTranslate: true,
    background: { color: '#F3F7F6' },
    defaultLink: () => new shapes.standard.Link(),
    defaultConnectionPoint: { name: 'boundary' },
    interactive: true
});
document.getElementById('paper-container').appendChild(paper.el);

// Set mesh grid on paper when paper is attached so the dimensions are known.
paper.setGrid('mesh');

const settings = {
    type: 'none'
};

const selection = new ui.Selection({
    theme: 'material',
    useModelGeometry: true,
    paper: paper,
    translateConnectedLinks: settings.type,
    handles: []
});

const tbar = new ui.Toolbar({
    tools: [
        { type: 'label', text: 'Link transition type: ' },
        {
            type: 'selectBox',
            name: 'type',
            width: 150,
            selected: 0,
            options: [
                { content: 'none', value: 'none' },
                { content: 'subgraph', value: 'subgraph' },
                { content: 'all', value: 'all' }
            ]
        }
    ]
});

tbar.on('type:option:select', (option) => {
    settings.type = option.value;
    selection.options.translateConnectedLinks = settings.type;
});

tbar.render();

document.getElementById('toolbar-container').append(tbar.el);

const rect1 = new shapes.standard.Rectangle({
    size: { width: 80, height: 60 },
    position: { x: 300, y: 150 }
});

const rect2 = new shapes.standard.Rectangle({
    size: { width: 80, height: 60 },
    position: { x: 450, y: 280 }
});

const circle1 = new shapes.standard.Circle({
    size: { width: 80, height: 80 },
    position: { x: 100, y: 100 }
});

const circle2 = new shapes.standard.Circle({
    size: { width: 80, height: 80 },
    position: { x: 200, y: 400 }
});

const link1 = new shapes.standard.Link({
    source: rect1,
    target: rect2,
    vertices: [{ x: 350, y: 300 }]
});

const link2 = new shapes.standard.Link({
    source: circle1,
    target: rect1,
    vertices: [{ x: 250, y: 200 }]
});

const link3 = new shapes.standard.Link({
    source: rect2,
    target: circle2,
    vertices: []
});

graph.addCells([rect1, rect2, circle1, circle2, link1, link2, link3]);

paper.on('blank:pointerdown', selection.startSelecting);

paper.on('element:pointerup', function(cellView, evt) {
    // Select an element if CTRL/Meta key is pressed while the element is clicked.
    if (evt.ctrlKey || evt.metaKey) {
        selection.collection.add(cellView.model);
    }
});

selection.on('selection-box:pointerdown', function(cellView, evt) {
    // Unselect an element if the CTRL/Meta key is pressed while a selected element is clicked.
    if (evt.ctrlKey || evt.metaKey) {
        selection.collection.remove(cellView.model);
    }
});

selection.collection.reset([rect1, rect2]);
