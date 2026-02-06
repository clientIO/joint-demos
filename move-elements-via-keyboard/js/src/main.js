import { dia, ui, shapes } from '@joint/plus';
import './styles.scss';

// Paper

const graph = new dia.Graph({}, { cellNamespace: shapes });
const paper = new dia.Paper({
    model: graph,
    cellViewNamespace: shapes,
    width: '100%',
    height: '100%',
    gridSize: 20,
    async: true,
    sorting: dia.Paper.sorting.APPROX,
    background: { color: '#F3F7F6' },
    restrictTranslate: true,
    clickThreshold: 10
});
document.getElementById('paper-container').appendChild(paper.el);

// Set mesh grid on paper when paper is attached so the dimensions are known.
paper.setGrid('mesh');

// Stencil

const stencil = new ui.Stencil({
    paper,
    usePaperGrid: true,
    width: 100,
    height: '100%',
    paperOptions: () => {
        return {
            model: new dia.Graph({}, { cellNamespace: shapes }),
            cellViewNamespace: shapes,
            background: {
                color: '#FCFCFC'
            }
        };
    },
    layout: {
        columns: 1,
        rowHeight: 'compact',
        rowGap: 10,
        columnWidth: 100,
        marginY: 10,
        // reset defaults
        resizeToFit: false,
        dx: 0,
        dy: 0
    }
});

stencil.render();
document.getElementById('stencil-container').appendChild(stencil.el);

stencil.load([
    {
        type: 'standard.Rectangle',
        size: { width: 80, height: 60 },
        attrs: {
            body: {
                stroke: '#222138',
                fill: '#f6f6f6'
            }
        }
    }
]);

// Selection

const selection = new ui.Selection({
    paper,
    useModelGeometry: true,
    theme: 'material',
    boxContent: false
});

selection.removeHandle('resize');
selection.removeHandle('rotate');

paper.on('blank:pointerdown', function(evt, x, y) {
    selection.startSelecting(evt);
});

paper.on('element:pointerclick', function(elementView) {
    selection.collection.reset([elementView.model]);
});

// Example

const rectangle1 = new shapes.standard.Rectangle({
    position: { x: 100, y: 100 },
    size: { width: 180, height: 80 },
    attrs: {
        label: {
            text:
                'Select the element and\n use up, down, left, right keys\nto move it',
            fontSize: 12,
            fontFamily: 'sans-serif',
            lineHeight: 20
        },
        body: {
            stroke: '#222138',
            fill: '#f6f6f6'
        }
    }
});

const rectangle2 = new shapes.standard.Rectangle({
    position: { x: 250, y: 250 },
    size: { width: 180, height: 80 },
    attrs: {
        label: {
            text: 'Observe how\nthe command manager\nconsolidates changes',
            fontSize: 12,
            fontFamily: 'sans-serif',
            lineHeight: 20
        },
        body: {
            stroke: '#222138',
            fill: '#f6f6f6'
        }
    }
});

graph.addCells([rectangle1, rectangle2]);

// Command Manager

const history = new dia.CommandManager({
    graph,
    applyOptionsList: ['skipHistory']
});

history.on('stack:undo stack:redo', function() {
    selection.collection.reset(
        selection.collection.filter((cell) => graph.getCell(cell))
    );
});

history.on('stack:push', (batch) => {
    if (batch[batch.length - 1]?.options?.skipHistory) {
        history.squashUndo(2);
    }
});

// Toolbar

const toolbar = new ui.Toolbar({
    autoToggle: true,
    tools: [
        { type: 'label', name: 'undo-label' },
        'undo',
        'redo',
        { type: 'label', name: 'redo-label' }
    ],
    references: {
        commandManager: history
    }
});

document.getElementById('toolbar-container').appendChild(toolbar.render().el);

function updateToolbar() {
    toolbar.getWidgetByName(
        'undo-label'
    ).el.textContent = `${history.undoStack.length} action(s) to undo`;
    toolbar.getWidgetByName(
        'redo-label'
    ).el.textContent = `${history.redoStack.length} action(s) to redo`;
}

updateToolbar();

history.on('stack', () => updateToolbar());

// Keyboard

const keyboard = new ui.Keyboard();
const MOVE_STEP = 20;

keyboard.on({
    up: function(evt) {
        // Prevent Default Scrolling
        evt.preventDefault();
        moveCells(selection.collection.toArray(), 0, -MOVE_STEP);
    },
    down: function(evt) {
        evt.preventDefault();
        moveCells(selection.collection.toArray(), 0, MOVE_STEP);
    },
    left: function(evt) {
        evt.preventDefault();
        moveCells(selection.collection.toArray(), -MOVE_STEP, 0);
    },
    right: function(evt) {
        evt.preventDefault();
        moveCells(selection.collection.toArray(), MOVE_STEP, 0);
    }
});

let _movedElementsHash = '';

graph.on('change', () => (_movedElementsHash = ''));

function moveCells(cells, dx, dy) {
    const elements = cells.filter((cell) => cell.isElement());
    const hash = elements
        .map((el) => el.id)
        .sort()
        .join(' ');
    const movedPreviously = hash === _movedElementsHash;

    graph.startBatch('shift-selection');
    elements.forEach((el) =>
        el.translate(dx, dy, { skipHistory: movedPreviously })
    );
    graph.stopBatch('shift-selection');

    _movedElementsHash = hash;
}
