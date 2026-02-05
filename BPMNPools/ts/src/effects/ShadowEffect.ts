import { dia, V } from '@joint/plus';

export const ShadowEffect = dia.HighlighterView.extend({
    tagName: 'g',
    className: 'shadow-effect',
    MOUNTABLE: false,
    highlight(cellView: dia.CellView, node: SVGElement) {
        const { offset = 5 } = this.options;
        const shadow = V(node).clone().attr({
            transform: `translate(${offset}, ${offset})`,
            stroke: 'none',
            fill: 'black',
            opacity: 0.2,
            'fill-rule': 'nonzero'
        });
        this.vel.append(shadow);
        cellView.el.prepend(this.el);
    },
});
