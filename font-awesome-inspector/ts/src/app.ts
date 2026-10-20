import { dia, setTheme, shapes, ui } from '@joint/plus';
import FAIcon from './FAIcon';
import { ICONS } from './icons';
import { inspectorOptions } from './inspector';
import { createStencil } from './stencil';

const cellNamespace = { ...shapes, FAIcon };

export function init(): void {
    setTheme('material');

    const graph = new dia.Graph({}, { cellNamespace });

    const paper = new dia.Paper({
        model: graph,
        cellViewNamespace: cellNamespace,
        width: '100%',
        height: '100%',
        gridSize: 10,
        drawGrid: true,
        async: true,
        clickThreshold: 10,
        background: { color: '#f4f7f9' }
    });
    document.getElementById('paper-container')!.appendChild(paper.el);

    createStencil(paper);

    function select(element: dia.Element | null): void {
        ui.FreeTransform.clear(paper);
        ui.Inspector.close();
        if (!element) {
            return;
        }
        const freeTransform = new ui.FreeTransform({
            cellView: element.findView(paper),
        });
        freeTransform.render();
        ui.Inspector.create('#inspector-container', {
            ...inspectorOptions,
            cell: element
        });
    }

    paper.on('element:pointerclick', (elementView: dia.ElementView) => select(elementView.model));
    paper.on('blank:pointerclick', () => select(null));

    const elements = [
        new FAIcon({
            position: { x: 80, y: 80 },
            attrs: {
                icon: { text: ICONS[9].char, fill: '#ed2637' },
                label: { text: ICONS[9].name }
            }
        }),
        new FAIcon({
            position: { x: 240, y: 80 },
            size: { width: 120, height: 120 },
            attrs: {
                icon: { text: ICONS[16].char, fill: '#0075f2' },
                label: { text: ICONS[16].name }
            }
        }),
        new FAIcon({
            position: { x: 420, y: 100 },
            attrs: {
                body: { fill: 'transparent', stroke: 'none' },
                icon: { text: ICONS[17].char, fill: '#10b981' },
                label: { text: ICONS[17].name }
            }
        })
    ];
    graph.resetCells(elements);

    select(elements[1]);
}
