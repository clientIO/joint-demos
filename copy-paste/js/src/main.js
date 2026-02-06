import { dia, ui, shapes } from '@joint/plus';
import './styles.scss';

const paperContainerEl = document.getElementById('paper-container');
const stencilContainerEl = document.getElementById('stencil-container');

const graph = new dia.Graph({}, { cellNamespace: shapes });
const paper = new dia.Paper({
    model: graph,
    cellViewNamespace: shapes,
    width: '100%',
    height: '100%',
    gridSize: 20,
    async: true,
    clickThreshold: 10,
    sorting: dia.Paper.sorting.APPROX,
    background: { color: '#F3F7F6' },
    preventDefaultBlankAction: false,
});
paperContainerEl.appendChild(paper.el);

// Set mesh grid on paper when paper is attached so the dimensions are known.
paper.setGrid('mesh');

// UI STENCIL
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
stencilContainerEl.appendChild(stencil.el);
stencil.load([
    {
        type: 'standard.Rectangle',
        size: { width: 80, height: 60 },
        attrs: {
            body: {
                fill: '#ff7e42'
            }
        }
    },
    {
        type: 'standard.Ellipse',
        size: { width: 80, height: 60 },
        attrs: {
            body: {
                fill: '#ff4265'
            }
        }
    }
]);

// UI SELECTION
const selection = new ui.Selection({
    paper,
    useModelGeometry: true,
    theme: 'material',
    boxContent: false
});
//selection.removeHandle("resize");
selection.removeHandle('rotate');
//selection.removeHandle("remove");
paper.on('element:pointerclick', function(elementView) {
    selection.collection.reset([elementView.model]);
});
paper.on('blank:pointerclick', function() {
    selection.collection.reset([]);
});
paper.on('blank:pointerdown', function(evt) {
    selection.startSelecting(evt);
});
stencil.on('element:drop', function(elementView) {
    const element = elementView.model;
    selection.collection.reset([element]);
});

// UI CLIPBOARD
const clipboard = new ui.Clipboard();

// Keep track of mouse position
let cx = 0;
let cy = 0;
paperContainerEl.addEventListener('mousemove', (evt) => {
    cx = evt.clientX;
    cy = evt.clientY;
});
paperContainerEl.addEventListener('mouseleave', (evt) => {
    cx = null;
    cy = null;
});

// Copy & Paste Listeners
document.addEventListener('paste', (event) => {
    if (cx === null || cy === null) return;
    // Paste An Image
    const { x, y } = paper.snapToGrid(cx, cy);
    const [file] = event.clipboardData.files;
    if (file) {
        const reader = new FileReader();
        reader.addEventListener(
            'load',
            () => {
                const img = new Image();
                img.onload = () => {
                    const el = createImage(reader.result, {
                        position: { x, y },
                        size: {
                            width: img.naturalWidth / 2,
                            height: img.naturalHeight / 2
                        }
                    }).addTo(graph);
                    selection.collection.reset([el]);
                };
                img.src = reader.result;
            },
            false
        );
        reader.readAsDataURL(file);
        return;
    }
    // Paste A Text
    const text = event.clipboardData.getData('text');
    if (text) {
        const el = createText(text, { position: { x, y }}).addTo(graph);
        selection.collection.reset([el]);
        return;
    }
    // Paste JointJS Elements
    const pastedCells = clipboard.pasteCells(graph, {
        translate: {
            dx: 20,
            dy: 20
        }
    });
    const elements = pastedCells.filter((cell) => cell.isElement());
    selection.collection.reset(elements);
});

paperContainerEl.addEventListener('copy', (event) => {
    event.clipboardData.setData('text/plain', '');
    event.preventDefault();
    clipboard.copyElements(selection.collection, graph);
});

createText(
    `- try to copy and paste shapes
- try to copy a text and paste it as a shape
- try to copy an image and paste it as a shape

ctrl+c ctrl+v / cmd+c cmd+v
`,
    {
        position: { x: 50, y: 50 },
        size: { width: 200, height: 120 }
    }
).addTo(graph);

// Helpers

function createText(text, attributes) {
    return new shapes.standard.TextBlock({
        size: { width: 100, height: 100 },
        attrs: {
            body: {
                fill: '#ffdc42'
            },
            label: {
                text,
                style: {
                    fontFamily: 'sans-serif',
                    fontSize: '14px',
                    whiteSpace: 'pre-wrap',
                    textAlign: 'left',
                }
            }
        },
        ...attributes
    });
}

function createImage(href, attributes) {
    return new shapes.standard.BorderedImage({
        attrs: {
            image: {
                href,
                preserveAspectRatio: 'none'
            }
        },
        ...attributes
    });
}
