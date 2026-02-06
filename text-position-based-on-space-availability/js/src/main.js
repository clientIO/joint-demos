import { dia, ui, shapes as defaultShapes, util, g } from '@joint/plus';
import './styles.scss';

const TextPosition = {
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
            text: '',
            type: 'TextElement',
            preferredTextPosition: TextPosition.CENTER,
            textPosition: TextPosition.CENTER,
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
                'textPosition' in changed ||
                'textMargin' in changed ||
                'text' in changed
            ) {
                this.updateBindings(opt);
            }
        });
        this.updateBindings();
    }

    updateBindings(opt) {
        const { text, textPosition, textMargin } = this.attributes;
        const attrs = {
            root: {
                cursor: 'move'
            },
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
        switch (textPosition) {
            case TextPosition.LEFT: {
                label.textAnchor = 'end';
                label.textVerticalAnchor = 'middle';
                label.x = -textMargin;
                label.y = 'calc(0.5*h)';
                break;
            }
            case TextPosition.RIGHT: {
                label.textAnchor = 'start';
                label.textVerticalAnchor = 'middle';
                label.x = `calc(w + ${textMargin})`;
                label.y = 'calc(0.5*h)';
                break;
            }
            case TextPosition.TOP: {
                label.textAnchor = 'middle';
                label.textVerticalAnchor = 'bottom';
                label.x = 'calc(0.5*w)';
                label.y = -textMargin;
                break;
            }
            case TextPosition.BOTTOM: {
                label.textAnchor = 'middle';
                label.textVerticalAnchor = 'top';
                label.x = 'calc(0.5*w)';
                label.y = `calc(h + ${textMargin})`;
                break;
            }
            default:
            case TextPosition.CENTER: {
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
        type: 'TextElement',
        text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
        preferredTextPosition: TextPosition.BOTTOM,
        textPosition: TextPosition.CENTER
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
            preferredTextPosition: {
                label: 'Preferred Text Position',
                type: 'select',
                options: [
                    {
                        content: 'Left',
                        value: TextPosition.LEFT
                    },
                    {
                        content: 'Right',
                        value: TextPosition.RIGHT
                    },
                    {
                        content: 'Top',
                        value: TextPosition.TOP
                    },
                    {
                        content: 'Bottom',
                        value: TextPosition.BOTTOM
                    },
                    {
                        content: 'Center',
                        value: TextPosition.CENTER
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
    preferredTextPosition: TextPosition.LEFT,
    textPosition: TextPosition.LEFT,
    textMargin: 8,
    text: 'Vivamus blandit feugiat justo, non posuere massa dignissim et.'
});

const te2 = new TextElement({
    position: { x: 300, y: 200 },
    preferredTextPosition: TextPosition.BOTTOM,
    textPosition: TextPosition.BOTTOM,
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

paper.on('element:pointerdown', onElementPointerdown);
paper.on('element:pointermove', onElementPointermove);
paper.on('element:pointerup', onElementPointerup);

selection.on('selection-box:pointerdown', onElementPointerdown);
selection.on('selection-box:pointermove', onElementPointermove);
selection.on('selection-box:pointerup', onElementPointerup);

graph.on('change:preferredTextPosition', (element) => {
    adjustLabel(element);
});

stencil.on('element:drop', (elementView) => {
    findVicinityElements(elementView.model).forEach((el) => adjustLabel(el));
    adjustLabel(elementView.model);
});

function onElementPointerdown(elementView, evt) {
    evt.data.previousVicinityElements = findVicinityElements(elementView.model);
}

function onElementPointermove(elementView, evt) {
    evt.data.moved = true;
    adjustLabel(elementView.model);
    // Alternatively, we could adjust all labels in vicinity while moving
    // Note: we don't need to adjust them again on pointerup
    // findVicinityElements(elementView.model).forEach(el => adjustLabel(el));
}

function onElementPointerup(elementView, evt) {
    if (!evt.data.moved) return;
    const vicinityElements = util.uniq([
        ...evt.data.previousVicinityElements,
        ...findVicinityElements(elementView.model)
    ]);
    vicinityElements.forEach((el) => adjustLabel(el));
}

function adjustLabel(element) {
    const preferredDirection = element.get('preferredTextPosition');
    if (preferredDirection === TextPosition.CENTER) {
        element.set('textPosition', TextPosition.CENTER);
        return;
    }
    const directions = util.uniq([
        preferredDirection,
        TextPosition.LEFT,
        TextPosition.RIGHT,
        TextPosition.TOP,
        TextPosition.BOTTOM
    ]);
    const vicinityElements = findVicinityElements(element);
    const availableDirection = directions.find((direction) => {
        const area = getElementArea(element, { direction, self: false });
        return !vicinityElements.some((el) =>
            g.intersection.rectWithRect(getElementArea(el), area)
        );
    });
    element.set('textPosition', availableDirection || TextPosition.CENTER);
}

function findVicinityElements(element) {
    const bbox = element.getBBox();
    const vicinityArea = bbox.inflate(bbox.width * 2, bbox.height * 2);
    const vicinityElements = graph
        .findCellsInArea(vicinityArea)
        .filter((el) => el !== element);
    return vicinityElements;
}

function getElementArea(
    element,
    { direction = element.get('textPosition'), self = true } = {}
) {
    const area = element.getBBox();
    const text = element.get('text');
    if (!text) return area;
    switch (direction) {
        case TextPosition.LEFT: {
            area.x -= area.width;
            if (self) area.width *= 2;
            break;
        }
        case TextPosition.RIGHT: {
            if (self) {
                area.width *= 2;
            } else {
                area.x += area.width;
            }
            break;
        }
        case TextPosition.TOP: {
            area.y -= area.height;
            if (self) area.height *= 2;
            break;
        }
        case TextPosition.BOTTOM: {
            if (self) {
                area.height *= 2;
            } else {
                area.y += area.height;
            }
            break;
        }
        case TextPosition.CENTER: {
            // do nothing
            break;
        }
    }
    return area;
}
