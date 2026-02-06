import { dia, shapes } from '@joint/plus';

export const SwimlanePreview = dia.HighlighterView.extend({

    tagName: 'path',

    attributes: {
        'fill': 'none',
        'stroke': '#0075f2',
        'stroke-width': 3,
    },

    highlight(elementView: dia.ElementView, _node: SVGElement) {
        const { index = 0 } = this.options;
        const pool = elementView.model as shapes.bpmn2.CompositePool;
        if (!shapes.bpmn2.CompositePool.isPool(pool)) {
            throw new Error('SwimlanePreview can be added only to a CompositePool.');
        }

        const swimlanes = pool.getSwimlanes();
        const swimlane = swimlanes[index];
        const poolBBox = pool.getBBox();
        const poolPadding = pool.getPadding();
        const horizontal = pool.isHorizontal();
        if (horizontal) {
            let y = 0;
            let x = poolPadding.left;
            if (!swimlane) {
                y = poolBBox.height - poolPadding.bottom;
            } else {
                y = swimlane.position().y - poolBBox.y;
            }
            const width = poolBBox.width - poolPadding.left - poolPadding.right;
            this.vel.attr({
                'd': `M 0 0 l -20 -10 m 20 10 l -20 10 m 20 -10 H ${width} l 20 -10 m -20 10 l 20 10`,
                transform: `translate(${x}, ${y})`
            });
        } else {
            let x = 0;
            let y = poolPadding.top;
            if (!swimlane) {
                x = poolBBox.width - poolPadding.right;
            } else {
                x = swimlane.position().x - poolBBox.x;
            }
            const height = poolBBox.height - poolPadding.top - poolPadding.bottom;
            this.vel.attr({
                'd': `M 0 0 l -10 -20 m 10 20 l 10 -20 m -10 20 V ${height} l -10 20 m 10 -20 l 10 20`,
                transform: `translate(${x}, ${y})`
            });
        }
    }
});
