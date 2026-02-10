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
    interactive: false
});
document.getElementById('paper-container').appendChild(paper.el);

// Set mesh grid on paper when paper is attached so the dimensions are known.
paper.setGrid('mesh');

const settings = {
    scale: 1,
    anchor: 'top'
};

const tbar = new ui.Toolbar({
    tools: [
        { type: 'label', text: 'Scale: ' },
        { type: 'range', name: 'scale', min: 1, max: 5, step: 1, value: 1 },
        { type: 'separator' },
        { type: 'label', text: 'Anchor: ' },
        {
            type: 'selectBox',
            name: 'anchor',
            width: 150,
            selected: 1,
            options: [
                { content: 'center', value: 'center' },
                { content: 'top', value: 'top' },
                { content: 'right', value: 'right' },
                { content: 'bottom', value: 'bottom' },
                { content: 'left', value: 'left' },
                { content: 'top-left', value: 'top-left' },
                { content: 'top-right', value: 'top-right' },
                { content: 'bottom-left', value: 'bottom-left' },
                { content: 'bottom-right', value: 'bottom-right' }
            ]
        }
    ]
});

tbar.on('scale:change', (value) => {
    settings.scale = value;
    renderContextToolbar();
});

tbar.on('anchor:option:select', (option) => {
    settings.anchor = option.value;
    renderContextToolbar();
});

tbar.render();

document.getElementById('toolbar-container').append(tbar.el);

let lastX = 200;
let lastY = 200;

const renderContextToolbar = () => {
    const contextToolbar = new ui.ContextToolbar({
        target: { x: lastX, y: lastY },
        root: paper.el,
        vertical: true,
        anchor: settings.anchor,
        scale: settings.scale,
        tools: [
            {
                action: 'prio1',
                content: '🔴 Priority 1'
            },
            {
                action: 'prio2',
                content: '🟠 Priority 2'
            },
            {
                action: 'prio3',
                content: '🔵 Priority 3'
            },
            {
                action: 'prio4',
                content: '🟢 Priority 4'
            }
        ]
    });

    contextToolbar.on(
        'action:prio1 action:prio2 action:prio3 action:prio4',
        (evt) => {
            alert(evt.target.textContent);
            contextToolbar.remove();
        }
    );
    contextToolbar.render();
};

paper.on('blank:contextmenu blank:pointerdown', (evt) => {
    lastX = evt.clientX;
    lastY = evt.clientY;
    renderContextToolbar();
});

renderContextToolbar();
