import { dia, shapes } from '@joint/plus';
import { MAIN_COLOR } from '../configs/theme';

export const SwimlanePreview = dia.HighlighterView.extend({
    
    tagName: 'path',
    
    attributes: {
        'fill': 'none',
        'stroke': MAIN_COLOR,
        'stroke-width': 3,
    },
    
    highlight(elementView, _node) {
        var _a, _b, _c, _d;
        const { index = 0 } = this.options;
        const pool = elementView.model;
        if (!shapes.bpmn2.CompositePool.isPool(pool)) {
            throw new Error('SwimlanePreview can be added only to a CompositePool.');
        }
        
        const swimlanes = pool.getSwimlanes();
        const swimlane = swimlanes[index];
        const poolBBox = pool.getBBox();
        const poolPadding = pool.getPadding();
        const horizontal = pool.isHorizontal();
        
        const paddingTop = (_a = poolPadding.top) !== null && _a !== void 0 ? _a : 0;
        const paddingBottom = (_b = poolPadding.bottom) !== null && _b !== void 0 ? _b : 0;
        const paddingLeft = (_c = poolPadding.left) !== null && _c !== void 0 ? _c : 0;
        const paddingRight = (_d = poolPadding.right) !== null && _d !== void 0 ? _d : 0;
        
        if (horizontal) {
            let y = 0;
            let x = poolPadding.left;
            if (!swimlane) {
                y = poolBBox.height - paddingBottom;
            }
            else {
                y = swimlane.position().y - poolBBox.y;
            }
            const width = poolBBox.width - paddingLeft - paddingRight;
            this.vel.attr({
                'd': `M 0 0 l -20 -10 m 20 10 l -20 10 m 20 -10 H ${width} l 20 -10 m -20 10 l 20 10`,
                transform: `translate(${x}, ${y})`
            });
        }
        else {
            let x = 0;
            let y = poolPadding.top;
            if (!swimlane) {
                x = poolBBox.width - paddingRight;
            }
            else {
                x = swimlane.position().x - poolBBox.x;
            }
            const height = poolBBox.height - paddingTop - paddingBottom;
            this.vel.attr({
                'd': `M 0 0 l -10 -20 m 10 20 l 10 -20 m -10 20 V ${height} l -10 20 m 10 -20 l 10 20`,
                transform: `translate(${x}, ${y})`
            });
        }
    }
});
