import type { shapes } from '@joint/plus';
import { dia } from '@joint/plus';

interface Options {
    text?: string,
    margin?: number
}

export const Decorator = dia.HighlighterView.extend({

    tagName: 'text',

    attributes: {
        'fill': '#5755a1',
        'font-style': 'italic',
        'font-weight': 'bold',
        'text-anchor': 'end',
        'font-size': 12
    },

    events: {
        'click': 'onClick'
    },

    onClick(evt: dia.Event) {
        const { cellView, node } = this;
        const itemId = cellView.findAttribute('item-id', node);
        cellView.paper.trigger('element:decorator:pointerdown', cellView, evt, itemId);
    },

    options: {
        margin: 0,
        text: 'fn()'
    },

    highlight(cellView: dia.CellView, node: SVGElement) {
        const { vel, options } = this;
        const model = cellView.model as shapes.standard.HeaderedRecord;
        const itemId = cellView.findAttribute('item-id', node);
        if (!itemId || !model.isItemVisible(itemId) || !model.isItemInView(itemId)) {
            vel.attr('display', 'none');
            return;
        }
        const { margin, text } = options;
        const { width } = model.size();
        const padding = model.getPadding();
        const itemBBox = model.getItemBBox(itemId);
        const scroll = model.getScrollTop() || 0;
        vel.attr({
            x: width - margin,
            y: itemBBox.center().y + padding.top - scroll
        });
        vel.text(text, { textVerticalAnchor: 'middle' });
        vel.removeAttr('display');
    }

}, {

    create(view: dia.CellView, itemId: string, opt: Options = {}) {
        const { text, margin = 5 } = opt;
        const id = `decorator_${itemId}`;
        const selector = `itemBody_${itemId}`;
        this.add(view, selector, id, {
            layer: dia.Paper.Layers.FRONT,
            margin,
            text
        });
    }
});
