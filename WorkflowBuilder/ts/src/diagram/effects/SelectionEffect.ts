import { dia } from '@joint/plus';
import { Attribute } from '../const';

import type { OutlineNode } from '../types';

export default class SelectionEffect extends dia.HighlighterView {

    preinitialize(): void {
        this.UPDATABLE = false;
        this.MOUNTABLE = false;
    }

    protected highlight(view: dia.CellView, node: SVGElement): void {
        node.classList.add('selected');

        const model = view.model;
        if (!model.get(Attribute.Outline)) return;

        const outlineNode = model as OutlineNode;

        outlineNode.attr('outline', outlineNode.getSelectedOutlineAttributes());
    }

    protected unhighlight(view: dia.CellView, node: SVGElement): void {
        node.classList.remove('selected');

        const model = view.model;
        if (!model.get(Attribute.Outline)) return;

        const outlineNode = model as OutlineNode;

        outlineNode.attr('outline', outlineNode.getDefaultOutlineAttributes());
    }
}
