import type { dia } from '@joint/plus';
import { ui } from '@joint/plus';
import FAIcon from './FAIcon';

export function createStencil(paper: dia.Paper): ui.Stencil {
    const stencil = new ui.Stencil({
        paper,
        width: 120,
        height: '100%',
        usePaperGrid: true,
        dropAnimation: true,
        paperOptions: {
            background: { color: '#ecf0f8' }
        },
        layout: {
            columns: 1,
            marginX: 20,
            marginY: 20,
            rowGap: 40
        }
    });
    document.getElementById('stencil-container')!.appendChild(stencil.el);
    stencil.render();
    stencil.load([
        new FAIcon({
            attrs: {
                label: { text: 'Border' }
            }
        }),
        new FAIcon({
            attrs: {
                body: { fill: 'transparent', stroke: 'none' },
                label: { text: 'No border' }
            }
        })
    ]);
    return stencil;
}
