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
        size: { width: 80, height: 60 }
    },
    {
        type: 'standard.Ellipse',
        size: { width: 80, height: 60 }
    },
    {
        type: 'standard.HeaderedRectangle',
        size: { width: 80, height: 60 }
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
selection.removeHandle('remove');

paper.on('element:pointerclick', function(elementView) {
    selection.collection.reset([elementView.model]);
});

paper.on('blank:pointerclick', function() {
    selection.collection.reset([]);
});

stencil.on('element:drop', function(elementView) {
    const element = elementView.model;
    selection.collection.reset([element]);
});

selection.collection.on('reset', function() {
    openInspector();
});

// Inspector

function changeElementType(currentElement, NewElConstructor) {
    graph.startBatch('change-element-type');
    // do not copy type and id
    const { ...attributes } = currentElement.toJSON();
    delete attributes.type;
    delete attributes.id;

    const newElement = new NewElConstructor(attributes);
    graph.addCell(newElement);
    const links = graph.getConnectedLinks(currentElement);
    links.forEach((link) => {
        if (link.getSourceCell() === currentElement) {
            link.prop(['source', 'id'], newElement.id);
        }
        if (link.getTargetCell() === currentElement) {
            link.prop(['target', 'id'], newElement.id);
        }
    });
    currentElement.remove();
    graph.stopBatch('change-element-type');
    selection.collection.reset([newElement]);
}

let _inspector = null;
let _selectBox = null;

function openInspector() {
    const container = document.getElementById('inspector-container');
    const customFieldsEl = container.querySelector('.custom-fields');

    if (_inspector) {
        _inspector.remove();
        _inspector = null;
        _selectBox.remove();
        _selectBox = null;
        customFieldsEl.innerHTML = '';
    }

    const cells = selection.collection.models;
    if (cells.length !== 1) return;

    const [cell] = cells;
    const type = cell.get('type');

    const labelEl = document.createElement('label');
    labelEl.textContent = 'Type:';
    customFieldsEl.append(labelEl);

    const selectBox = new ui.SelectBox({
        theme: 'material',
        target: container,
        options: [
            {
                content: 'Rectangle',
                value: 'standard.Rectangle',
                fn: shapes.standard.Rectangle
            },
            {
                content: 'Ellipse',
                value: 'standard.Ellipse',
                fn: shapes.standard.Ellipse
            },
            {
                content: 'Table',
                value: 'standard.HeaderedRectangle',
                fn: shapes.standard.HeaderedRectangle
            }
        ]
    });

    selectBox.render();
    selectBox.selectByValue(type);
    selectBox.on('option:select', (option) => {
        changeElementType(cell, option.fn);
        openInspector();
    });
    customFieldsEl.append(selectBox.el);

    const inputs = {
        'standard.Rectangle': {
            attrs: {
                label: {
                    text: {
                        type: 'content-editable',
                        label: 'Rectangle Label'
                    }
                }
            }
        },
        'standard.Ellipse': {
            attrs: {
                label: {
                    text: {
                        type: 'content-editable',
                        label: 'Ellipse Label'
                    }
                }
            }
        },
        'standard.HeaderedRectangle': {
            attrs: {
                headerText: {
                    text: {
                        type: 'content-editable',
                        label: 'Header Label'
                    }
                },
                bodyText: {
                    text: {
                        type: 'content-editable',
                        label: 'Body Label'
                    }
                }
            }
        }
    };

    const inspector = new ui.Inspector({
        cell,
        theme: 'material',
        inputs: inputs[type]
    });

    container.append(inspector.el);
    inspector.render();

    _inspector = inspector;
    _selectBox = selectBox;
}

// Command Manager

const history = new dia.CommandManager({
    graph
});

history.on('stack:undo stack:redo', function() {
    selection.collection.reset(
        selection.collection.filter((cell) => graph.getCell(cell))
    );
});

// Toolbar

const toolbar = new ui.Toolbar({
    autoToggle: true,
    tools: ['undo', 'redo'],
    references: {
        commandManager: history
    }
});

document.getElementById('toolbar-container').appendChild(toolbar.render().el);

// Example

const rectangle1 = new shapes.standard.Rectangle({
    position: { x: 200, y: 200 },
    size: { width: 80, height: 60 },
    attrs: {
        label: {
            text: 'A'
        },
        body: {
            stroke: '#222138',
            fill: '#f6f6f6'
        }
    }
});

graph.addCells([rectangle1]);

selection.collection.reset([rectangle1]);
