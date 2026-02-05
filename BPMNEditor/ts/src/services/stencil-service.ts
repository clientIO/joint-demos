import type { dia } from '@joint/plus';
import { ui } from '@joint/plus';
import { stencilShapes } from '../configs/stencil-config';
import { getShapeConstructorByType } from '../utils';
import StencilController from '../controllers/stencil-controller';
import { StencilHoverHighlighter } from '../configs/stencil-config';

export default class StencilService {

    stencil?: ui.Stencil;
    stencilController?: StencilController;

    constructor(private readonly stencilElement: HTMLDivElement) { }

    create(paperScroller: ui.PaperScroller, selection: ui.Selection, snaplines: ui.Snaplines) {
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
                const shape = getShapeConstructorByType(type);

                return new shape();
            }
        });

        stencil.render();

        stencil.load(stencilShapes);

        stencil
            .getGraph()
            .getElements()
            .forEach((el) => {
                StencilHoverHighlighter.add(
                    el.findView(stencil.getPaper()),
                    'root',
                    'stencil-highlight',
                    {
                        className: 'stencil-background-highlight',
                        padding: 4
                    }
                );
            });

        this.stencilController = new StencilController({ stencil, paper: paperScroller.options.paper, selection });
        this.stencilController.startListening();
    }
}
