import { dia } from '@joint/plus';

export default class HoverEffect extends dia.HighlighterView {

    preinitialize(): void {
        this.UPDATABLE = false;
        this.MOUNTABLE = false;
    }

    protected highlight(_view: dia.CellView, node: SVGElement): void {
        node.classList.add('hover');
    }

    protected unhighlight(_view: dia.CellView, node: SVGElement): void {
        node.classList.remove('hover');
    }
}
