import { dia } from '@joint/plus';
import { Attribute } from '../const';

import type { OutlineNode } from '../types';

export default class HoverEffect extends dia.HighlighterView {

    preinitialize(): void {
        this.UPDATABLE = false;
        this.MOUNTABLE = false;
    }

    protected highlight(view: dia.CellView, node: SVGElement): void {
        node.classList.add('hover');

        // Do not override selection outline with hover outline
        if (node.classList.contains('selected')) return;

        const model = view.model;
        if (!model.get(Attribute.Outline)) return;

        const outlineNode = model as OutlineNode;

        outlineNode.attr('outline', outlineNode.getHoverOutlineAttributes());
    }

    protected unhighlight(view: dia.CellView, node: SVGElement): void {
        node.classList.remove('hover');

        // Do not override selection outline with hover outline
        if (node.classList.contains('selected')) return;

        const model = view.model;
        if (!model.get(Attribute.Outline)) return;

        const outlineNode = model as OutlineNode;

        outlineNode.attr('outline', outlineNode.getDefaultOutlineAttributes());
    }

}
