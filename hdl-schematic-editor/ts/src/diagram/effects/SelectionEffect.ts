import { dia } from '@joint/plus';

export default class SelectionEffect extends dia.HighlighterView {

    preinitialize(): void {
        this.UPDATABLE = false;
        this.MOUNTABLE = false;
    }

    protected highlight(_view: dia.CellView, node: SVGElement): void {
        node.classList.add('selected');
    }

    protected unhighlight(_view: dia.CellView, node: SVGElement): void {
        node.classList.remove('selected');
    }
}
