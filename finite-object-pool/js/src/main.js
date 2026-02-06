import { dia, ui, shapes, elementTools } from '@joint/plus';
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
    defaultConnectionPoint: { name: 'boundary' }
});
document.getElementById('paper-container').appendChild(paper.el);

// Set mesh grid on paper when paper is attached so the dimensions are known.
paper.setGrid('mesh');

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

const elements = [
    {
        type: 'standard.Rectangle',
        size: { width: 80, height: 60 },
        attrs: {
            body: {
                fill: '#80ffd5'
            }
        }
    },
    {
        type: 'standard.Rectangle',
        size: { width: 80, height: 60 },
        attrs: {
            body: {
                rx: 10,
                ry: 10,
                fill: '#48cba4'
            }
        }
    },
    {
        type: 'standard.Path',
        size: { width: 80, height: 60 },
        attrs: {
            body: {
                d: 'M calc(0.5*w) 0 calc(w) calc(h) H 0 Z',
                fill: '#ff9580'
            }
        }
    },
    {
        type: 'standard.Path',
        size: { width: 80, height: 60 },
        attrs: {
            body: {
                d:
                    'M calc(0.5*w) 0 calc(w) calc(0.5*h) calc(0.5*w) calc(h) 0 calc(0.5*h) Z',
                fill: '#c86653'
            }
        }
    },
    {
        type: 'standard.Circle',
        size: { width: 60, height: 60 },
        attrs: {
            body: {
                fill: '#80aaff'
            }
        }
    },
    {
        type: 'standard.Ellipse',
        size: { width: 80, height: 60 },
        attrs: {
            body: {
                fill: '#4a7bcb'
            }
        }
    }
];

function setStencilElementJSONId(el, id) {
    // Help to find a stencil element with `getCell()`.
    el.id = id;
    // The reference to the related stencil element.
    // A new `id` is generated for the elements dropped on the canvas
    // (this is like a backup of the original `id`)
    el.stencilId = id;
    // It keeps the order of elements in the stencil
    // (when an element is removed and added back to the stencil collection)
    el.z = id;
}

elements.forEach((elJSON, index) => setStencilElementJSONId(elJSON, index));

stencil.load(elements);

const stencilGraph = stencil.getGraph();

// Remove element from stencil after drop
stencil.on('element:drop', (elementView, evt) => {
    stencilGraph.getCell(elementView.model.get('stencilId')).remove();
    stencil.layoutGroup(stencilGraph);
    // Add some tools to the newly dropped element
    elementView.addTools(
        new dia.ToolsView({
            tools: [
                new elementTools.Remove({
                    y: 10,
                    x: '100%',
                    offset: { x: 10 }
                }),
                new elementTools.Connect({
                    y: 30,
                    x: '100%',
                    offset: { x: 10 }
                })
            ]
        })
    );
});

// Return the element to the stencil after removal
graph.on('remove', (cell) => {
    if (cell.isLink()) return;
    const stencilElJSON = cell.toJSON();
    setStencilElementJSONId(stencilElJSON, cell.get('stencilId'));
    stencilGraph.addCell(stencilElJSON);
    stencil.layoutGroup(stencilGraph);
});
