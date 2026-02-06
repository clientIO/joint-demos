import { dia, ui, util, shapes, layout, V } from '@joint/plus';
import './styles.scss';

const graph = new dia.Graph({}, { cellNamespace: shapes });
const paper = new dia.Paper({
    model: graph,
    cellViewNamespace: shapes,
    interactive: false,
    async: true,
    sorting: dia.Paper.sorting.NONE,
    background: { color: '#F3F7F6' }
});

const scroller = new ui.PaperScroller({
    paper,
    borderless: true,
    baseWidth: 1,
    baseHeight: 1,
    autoResizePaper: true,
    minVisiblePaperSize: 300,
    contentOptions: {
        useModelGeometry: true,
        allowNewOrigin: 'any'
    }
});

const paperContainerEl = document.getElementById('paper-container');
const jsonInputEl = document.getElementById('json-input');

paperContainerEl.appendChild(scroller.el);

paper.on('blank:pointerdown', (evt) => scroller.startPanning(evt));

const tree = new layout.TreeLayout({ graph, direction: 'R' });

loadJSON();

const debouncedLoadJSON = util.debounce(loadJSON, 1000);

jsonInputEl.addEventListener('input', debouncedLoadJSON, { capture: false });

// Functions

function loadJSON() {
    let json;
    try {
        json = JSON.parse(jsonInputEl.value);
    } catch {
        jsonInputEl.classList.add('invalid');
        return;
    }
    jsonInputEl.classList.remove('invalid');
    const cells = generateCells(json);
    graph.resetCells(cells);
    tree.layout();
    scroller.positionRect(tree.getLayoutBBox(), 'left', { padding: 10 });
}

function generateCells(json) {
    const cells = [];

    function _generateCells(value, parent, options = {}) {
        const isArray = Array.isArray(value);
        const isObject = util.isPlainObject(value);

        const { name = '', table = false } = options;

        if (!isArray && !isObject) {
            const group = typeof value;
            if (table) {
                parent.addItemAtIndex(0, Infinity, {
                    id: V.uniqueId(),
                    label: name
                });
                parent.addItemAtIndex(1, Infinity, {
                    id: V.uniqueId(),
                    label: value,
                    group
                });
            } else {
                parent.addItemAtIndex(0, Infinity, {
                    id: V.uniqueId(),
                    label: value,
                    group
                });
            }
            return;
        }

        const child = makeElement(name);
        cells.push(child);

        if (parent) {
            const link = makeLink(parent, child);
            cells.push(link);
        }

        if (isArray) {
            value.forEach((item) => {
                _generateCells(item, child, { table: false });
            });
        }

        if (isObject) {
            child.attr(['itemLabels_0', 'fontWeight'], 'bold');
            Object.entries(value).forEach(([key, value]) => {
                _generateCells(value, child, { name: key, table: true });
            });
        }
    }

    _generateCells(json, null, { name: 'JSON' });

    return cells;
}

function makeLink(parentElement, childElement) {
    return new shapes.standard.Link({
        source: { id: parentElement.id },
        target: { id: childElement.id },
        attrs: {
            line: {
                stroke: '#666',
                targetMarker: {
                    type: 'path',
                    d: 'M 6 -3 0 0 6 3 z'
                }
            }
        }
    });
}

function makeElement(name) {
    const coloredValues = () => {
        return {
            itemLabels_number: {
                fill: '#b75d32'
            },
            itemLabels_string: {
                fill: '#3c4260'
            },
            itemLabels_boolean: {
                fill: '#31d0c6'
            },
            itemLabels_object: {
                fill: '#7c68fc'
            }
        };
    };
    const coloredBody = (color) => {
        return {
            body: {
                stroke: color,
                strokeWidth: 2
            },
            itemBodies: {
                stroke: color
            },
            itemLabels: {
                fontFamily: 'sans-serif',
                fontSize: 12
            }
        };
    };

    if (name) {
        return new shapes.standard.HeaderedRecord({
            name,
            size: { width: 300 },
            attrs: {
                headerLabel: {
                    fontWeight: 'bold',
                    fontFamily: 'sans-serif',
                    fontSize: 17,
                    text: name,
                    textWrap: {
                        ellipsis: true,
                        maxLineCount: 1
                    }
                },
                header: {
                    stroke: '#fe854f',
                    fill: '#fe854f',
                    fillOpacity: 0.3,
                    strokeWidth: 2
                },
                ...coloredBody('#fe854f'),
                ...coloredValues()
            }
        });
    } else {
        return new shapes.standard.BorderedRecord({
            name,
            padding: { vertical: 4 },
            size: { width: 300 },
            attrs: {
                ...coloredBody('#30d0c6'),
                ...coloredValues()
            }
        });
    }
}
