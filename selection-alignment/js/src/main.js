import { dia, ui, shapes, V } from '@joint/plus';
import './styles.scss';

// Asset imports
import alignmentSvg from '../assets/icons/alignment.svg?no-inline';

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

graph.fromJSON({
    cells: [
        {
            type: 'standard.Rectangle',
            position: { x: 150, y: 100 },
            size: { width: 80, height: 60 }
        },
        {
            type: 'standard.Ellipse',
            position: { x: 300, y: 300 },
            size: { width: 80, height: 60 }
        },
        {
            type: 'standard.Rectangle',
            position: { x: 400, y: 200 },
            size: { width: 80, height: 60 }
        }
    ]
});

const selection = new ui.Selection({
    theme: 'material',
    paper,
    useModelGeometry: true,
    handles: [
        {
            name: 'group',
            position: 'nw',
            icon: alignmentSvg,
            events: {
                pointerdown: (evt) => openAlignmentOptions(evt.target)
            }
        }
    ]
});

selection.collection.reset(graph.getElements());

paper.on('blank:pointerdown', (evt) => selection.startSelecting(evt));

function openAlignmentOptions(target) {
    const elements = selection.collection.toArray();
    const { x, y, width, height } = graph.getCellsBBox(elements);
    const align = (coordinate, value) => {
        graph.startBatch('alignment');
        elements.forEach((el) => {
            const { width, height } = el.size();
            el.prop(
                ['position', coordinate],
                value(coordinate === 'x' ? width : height)
            );
        });
        graph.stopBatch('alignment');
    };

    const menu = new ui.ContextToolbar({
        target,
        vertical: true,
        tools: [
            { action: 'align-left', content: 'Align Left' },
            { action: 'align-right', content: 'Align Right' },
            { action: 'align-top', content: 'Align Top' },
            { action: 'align-bottom', content: 'Align Bottom' },
            { action: 'align-v-center', content: 'Center Vertically' },
            { action: 'align-h-center', content: 'Center Horizontally' }
        ]
    });
    menu.render();
    menu.on({
        'action:align-left': () => align('x', () => x),
        'action:align-right': () => align('x', (elWidth) => x + width - elWidth),
        'action:align-top': () => align('y', () => y),
        'action:align-bottom': () =>
            align('y', (elHeight) => y + height - elHeight),
        'action:align-v-center': () =>
            align('x', (elWidth) => x + (width - elWidth) / 2),
        'action:align-h-center': () =>
            align('y', (elHeight) => y + (height - elHeight) / 2),
        all: () => menu.remove()
    });
}

// Command Manager

const history = new dia.CommandManager({
    graph
});

// Toolbar

const toolbar = new ui.Toolbar({
    autoToggle: true,
    tools: [{ name: 'undo', type: 'undo' }, 'redo'],
    references: {
        commandManager: history
    }
});

document.getElementById('toolbar-container').appendChild(toolbar.render().el);

// Demo Text

const demoText = V('text')
    .attr({
        x: 255,
        y: 35,
        'font-family': 'monospace',
        'font-size': 16,
        'text-anchor': 'end'
    })
    .addClass('demo-text')
    .text('Click to open\na context\n↙      menu', {
        annotations: [{ start: 24, end: 25, attrs: { 'font-size': 40 }}]
    })
    .appendTo(paper.layers);

const removeDemoText = () => demoText.remove();

selection.collection.once('reset', removeDemoText);
graph.once('change', removeDemoText);
history.on('stack:push', () => {
    toolbar.getWidgetByName('undo').el.classList.add('undo-available');
});
