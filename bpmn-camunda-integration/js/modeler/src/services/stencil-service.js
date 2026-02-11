import { ui } from '@joint/plus';
import { stencilShapes } from '../configs/stencil-config';
import { getShapeConstructorByType } from '../utils';
import StencilController from '../controllers/stencil-controller';
import { StencilHoverHighlighter } from '../configs/stencil-config';

export default class StencilService {
    
    constructor(stencilElement) {
        this.stencilElement = stencilElement;
    }
    
    create(paperScroller, selection, snaplines) {
        const stencil = this.stencil = new ui.Stencil({
            cellCursor: 'pointer',
            el: this.stencilElement,
            paper: paperScroller,
            usePaperGrid: true,
            width: 48,
            height: 336,
            dropAnimation: true,
            layout: {
                columns: 1,
                columnWidth: 48,
                rowHeight: 48
            },
            snaplines,
            scaleClones: true,
            dragStartClone: (cell) => {
                const type = cell.get('dropType');
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
            const elView = el.findView(stencil.getPaper());
            StencilHoverHighlighter.add(elView, 'root', 'stencil-highlight', {
                className: 'stencil-background-highlight',
                padding: 4
            });
            const tooltip = el.get('tooltip');
            if (tooltip) {
                elView.el.setAttribute('data-tooltip', tooltip);
                elView.el.setAttribute('data-tooltip-position', 'right');
            }
        });
        
        this.stencilController = new StencilController({ stencil, paper: paperScroller.options.paper, selection });
        this.stencilController.startListening();
    }
}
