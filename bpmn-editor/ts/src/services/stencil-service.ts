import { ui } from '@joint/plus';
import { stencilShapes } from '../configs/stencil-config';
import StencilController from '../controllers/stencil-controller';
import { StencilHoverHighlighter } from '../configs/stencil-config';

import type { dia } from '@joint/plus';

export default class StencilService {

    stencil?: ui.Stencil;
    stencilController?: StencilController;

    constructor(private readonly stencilElement: HTMLDivElement) { }

    create(paperScroller: ui.PaperScroller, selection: ui.Selection, snaplines: ui.Snaplines) {
        const graph = paperScroller.options.paper.model;
        const stencil = this.stencil = new ui.Stencil({
            cellCursor: 'pointer',
            el: this.stencilElement,
            paper: paperScroller,
            usePaperGrid: true,
            width: 48,
            height: 528,
            dropAnimation: true,
            layout: {
                columns: 1,
                columnWidth: 48,
                rowHeight: 48
            },
            snaplines,
            scaleClones: true,
            dragStartClone: (cell: dia.Cell) => {
                const type: string = cell.get('dropType');
                const shape = graph.getTypeConstructor(type)!;

                return new shape();
            }
        });

        stencil.render();

        stencil.load(stencilShapes);

        stencil
            .getGraph()
            .getElements()
            .forEach((el) => {
                const view = el.findView(stencil.getPaper());

                StencilHoverHighlighter.add(
                    view,
                    'root',
                    'stencil-highlight',
                    {
                        className: 'stencil-background-highlight',
                        padding: 4
                    }
                );

                // Tooltip with the shape name (the global `ui.Tooltip`
                // targets `[data-tooltip]`).
                const shapeConstructor = graph.getTypeConstructor(el.get('dropType'))!;
                const { label } = shapeConstructor as unknown as { label?: string };
                if (label) {
                    view.el.dataset.tooltip = label;
                    view.el.dataset.tooltipPosition = 'right';
                }
            });

        this.stencilController = new StencilController({ stencil, paper: paperScroller.options.paper, selection });
        this.stencilController.startListening();
    }
}
