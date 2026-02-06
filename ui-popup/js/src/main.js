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
    hideArrow: false,
    scale: 1,
    position: 'bottom',
    anchor: 'top',
    padding: 10
};

const tbar = new ui.Toolbar({
    tools: [
        { type: 'checkbox', name: 'hideArrow', label: 'Hide arrow' },
        { type: 'separator' },
        { type: 'label', text: 'Scale: ' },
        { type: 'range', name: 'scale', min: 1, max: 5, step: 1, value: 1 },
        { type: 'separator' },
        { type: 'label', text: 'Padding: ' },
        { type: 'range', name: 'padding', min: 0, max: 30, step: 1, value: 10 },
        { type: 'separator' },
        { type: 'label', text: 'Position: ' },
        {
            type: 'selectBox',
            name: 'position',
            width: 150,
            selected: 3,
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
        },
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

tbar.on('hideArrow:change', (value) => {
    settings.hideArrow = value;
    renderPopup();
});

tbar.on('scale:change', (value) => {
    settings.scale = value;
    renderPopup();
});

tbar.on('padding:change', (value) => {
    settings.padding = value;
    renderPopup();
});

tbar.on('position:option:select', (option) => {
    settings.position = option.value;
    renderPopup();
});

tbar.on('anchor:option:select', (option) => {
    settings.anchor = option.value;
    renderPopup();
});

tbar.render();

document.getElementById('toolbar-container').append(tbar.el);

const rect = new shapes.standard.Rectangle({
    size: { width: 80, height: 60 },
    position: { x: 400, y: 200 }
});

const renderPopup = () => {
    const { scale } = settings;
    paper.translate(0, 0);
    paper.scale(scale, scale, 440, 230);
    const popup = new ui.Popup({
        content: 'I am a ui.Popup!',
        target: rect.findView(paper).el,
        padding: settings.padding * scale,
        anchor: settings.anchor,
        position: settings.position,
        scale,
        arrowPosition: settings.hideArrow ? 'none' : undefined
    });
    popup.render();
};

paper.on('cell:pointerclick', (cellView) => {
    renderPopup();
});

graph.addCells([rect], { async: false });

renderPopup();
