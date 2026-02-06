import { dia, ui, shapes as defaultShapes } from '@joint/plus';
import './styles.scss';

const TextAlignment = {
    LEFT: 'left',
    CENTER: 'center',
    RIGHT: 'right',
    TOP: 'top',
    BOTTOM: 'bottom'
};

class TextElement extends dia.Element {
    defaults() {
        return {
            ...super.defaults,
            text: 'Text',
            type: 'TextElement',
            textAlignment: TextAlignment.CENTER,
            textMargin: 4,
            size: {
                width: 80,
                height: 80
            }
        };
    }

    preinitialize() {
        this.markup = [
            {
                tagName: 'rect',
                selector: 'body'
            },
            {
                tagName: 'text',
                selector: 'label'
            }
        ];
    }

    initialize(...args) {
        super.initialize(...args);
        this.on('change', ({ changed }, opt) => {
            if (
                'textAlignment' in changed ||
                'textMargin' in changed ||
                'text' in changed
            ) {
                this.updateBindings(opt);
            }
        });
        this.updateBindings();
    }

    updateBindings(opt) {
        const { text, textAlignment, textMargin } = this.attributes;
        const attrs = {
            body: {
                width: 'calc(w)',
                height: 'calc(h)',
                fill: 'white',
                stroke: '#333333',
                strokeWidth: 2
            },
            label: {
                text,
                fontSize: 13,
                fontFamily: 'sans-serif',
                fill: '#333333',
                textWrap: {
                    ellipsis: true,
                    width: -2 * textMargin,
                    height: -2 * textMargin
                }
            }
        };
        const label = attrs.label;
        switch (textAlignment) {
            case TextAlignment.LEFT: {
                label.textAnchor = 'start';
                label.textVerticalAnchor = 'middle';
                label.x = textMargin;
                label.y = 'calc(0.5*h)';
                break;
            }
            case TextAlignment.RIGHT: {
                label.textAnchor = 'end';
                label.textVerticalAnchor = 'middle';
                label.x = `calc(w - ${textMargin})`;
                label.y = 'calc(0.5*h)';
                break;
            }
            case TextAlignment.TOP: {
                label.textAnchor = 'middle';
                label.textVerticalAnchor = 'top';
                label.x = 'calc(0.5*w)';
                label.y = textMargin;
                break;
            }
            case TextAlignment.BOTTOM: {
                label.textAnchor = 'middle';
                label.textVerticalAnchor = 'bottom';
                label.x = 'calc(0.5*w)';
                label.y = `calc(h - ${textMargin})`;
                break;
            }
            default:
            case TextAlignment.CENTER: {
                label.textAnchor = 'middle';
                label.textVerticalAnchor = 'middle';
                label.x = 'calc(0.5*w)';
                label.y = 'calc(0.5*h)';
                break;
            }
        }
        // set() will not merge the old attrs with the new attrs.
        this.set('attrs', attrs, opt);
    }

    toJSON() {
        const json = super.toJSON();
        // presentation attributes are controlled via
        // top level attributes only (color, name, number)
        delete json.attrs;
        // element is never rotated
        delete json.angle;
        // size will never change
        delete json.size;
        return json;
    }
}

const shapes = { ...defaultShapes, TextElement };

// Paper

const graph = new dia.Graph({}, { cellNamespace: shapes });
const paper = new dia.Paper({
    model: graph,
    cellViewNamespace: shapes,
    width: '100%',
    height: '100%',
    gridSize: 20,
    drawGrid: { name: 'mesh' },
    async: true,
    sorting: dia.Paper.sorting.APPROX,
    background: { color: '#F3F7F6' },
    restrictTranslate: true,
    clickThreshold: 10
});

document.getElementById('paper-container').appendChild(paper.el);

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
        type: 'TextElement'
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
    const type = cell.get('type');

    const inputs = {
        TextElement: {
            text: {
                type: 'content-editable',
                label: 'Label'
            },
            textAlignment: {
                label: 'Text Alignment',
                type: 'select',
                options: [
                    {
                        content: 'Left',
                        value: TextAlignment.LEFT
                    },
                    {
                        content: 'Right',
                        value: TextAlignment.RIGHT
                    },
                    {
                        content: 'Top',
                        value: TextAlignment.TOP
                    },
                    {
                        content: 'Bottom',
                        value: TextAlignment.BOTTOM
                    },
                    {
                        content: 'Center',
                        value: TextAlignment.CENTER
                    }
                ]
            },
            textMargin: {
                label: 'Text Margin',
                type: 'range',
                min: 0,
                max: 20
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
}

// Example

const te1 = new TextElement({
    position: { x: 100, y: 100 },
    textAlignment: TextAlignment.LEFT,
    textMargin: 8
});

const te2 = new TextElement({
    position: { x: 300, y: 200 },
    textAlignment: TextAlignment.CENTER,
    textMargin: 4,

    text:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum dapibus enim in hendrerit rutrum.'
});

graph.addCells([te1, te2]);

selection.collection.reset([te1]);

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
