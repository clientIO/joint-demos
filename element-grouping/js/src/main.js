import { dia, ui, shapes } from '@joint/plus';
import './styles.css';

// Asset imports
import groupSvg from '../assets/icons/group.svg?no-inline';
import ungroupSvg from '../assets/icons/ungroup.svg?no-inline';

const graph = new dia.Graph({}, { cellNamespace: shapes });
const paper = new dia.Paper({
    model: graph,
    cellViewNamespace: shapes,
    width: '100%',
    height: '100%',
    gridSize: 20,
    async: true,
    sorting: dia.Paper.sorting.APPROX,
    clickThreshold: 10,
    background: { color: '#F3F7F6' },
    interactive: {
        stopDelegation: false
    }
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

stencil.load([
    {
        type: 'standard.Rectangle',
        size: { width: 80, height: 60 }
    },
    {
        type: 'standard.Ellipse',
        size: { width: 80, height: 60 }
    }
]);

const selection = new ui.Selection({
    theme: 'material',
    paper,
    useModelGeometry: true,
    filter: (el) => el.isEmbedded(),
    handles: []
});

selection.collection.on('reset', () => {
    const elements = selection.collection.toArray();
    selection.removeHandle('group');
    if (elements.length === 0) return;
    const [element] = elements;
    if (elements.length > 1) {
        selection.addHandle({
            name: 'group',
            position: 'nw',
            icon: groupSvg,
            attrs: {
                '.handle': { title: `Group ${elements.length} Elements.` }
            },
            events: {
                pointerdown: () => toggleSelection()
            }
        });
    } else if (element.getEmbeddedCells().length > 0) {
        selection.addHandle({
            name: 'group',
            position: 'nw',
            icon: ungroupSvg,
            attrs: {
                '.handle': {
                    title: `Ungroup ${element.getEmbeddedCells().length} Elements.`
                }
            },
            events: {
                pointerdown: () => toggleSelection()
            }
        });
    }
});

paper.on('blank:pointerdown', (evt) => selection.startSelecting(evt));

paper.on('element:pointerclick', (elementView) => {
    const element = elementView.model;
    const [group = element] = element.getAncestors().reverse();
    selection.collection.reset([group]);
});

const groupTemplate = new shapes.standard.Rectangle({
    attrs: {
        root: {
            pointerEvents: 'none'
        },
        body: {
            // display: 'none',
            // For the purpose of the demo it has a color (it should be `none` in fact)
            stroke: '#FF4468',
            strokeDasharray: '5,5',
            strokeWidth: 2,
            fill: '#FF4468',
            fillOpacity: 0.2
        }
    }
});

function toggleSelection() {
    const elements = selection.collection.toArray();
    if (elements.length === 0) return;
    if (elements.length === 1) {
        ungroupElement(elements[0]);
    } else {
        groupElements(elements);
    }
}

function groupElements(elements) {
    const minZ = elements.reduce(
        (z, el) => Math.min(el.get('z') || 0, z),
        -Infinity
    );
    const group = groupTemplate.clone();
    group.set('z', minZ - 1);
    group.addTo(graph);
    group.embed(elements);
    group.fitEmbeds();
    selection.collection.reset([group]);
}

function ungroupElement(element) {
    const embeds = element.getEmbeddedCells();
    if (embeds.length === 0) return;
    element.unembed(embeds);
    element.remove();
    selection.collection.reset(embeds);
}

graph.resetCells([
    {
        id: 'el1',
        type: 'standard.Rectangle',
        position: { x: 50, y: 50 },
        size: { width: 80, height: 60 }
    },
    {
        id: 'el2',
        type: 'standard.Ellipse',
        position: { x: 50, y: 150 },
        size: { width: 80, height: 60 }
    },
    {
        id: 'el3',
        type: 'standard.Rectangle',
        position: { x: 250, y: 50 },
        size: { width: 80, height: 60 }
    },
    {
        id: 'el4',
        type: 'standard.Ellipse',
        position: { x: 350, y: 150 },
        size: { width: 80, height: 60 }
    }
]);

groupElements([graph.getCell('el1'), graph.getCell('el2')]);
