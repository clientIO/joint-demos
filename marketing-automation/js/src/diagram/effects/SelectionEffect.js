import { dia } from '@joint/plus';
import { Node } from '../models';

/**
 * Effect for highlighting the selection of nodes and links in the diagram.
 */
export default class SelectionEffect extends dia.HighlighterView {
    
    preinitialize() {
        this.tagName = 'path';
    }
    
    highlight(cellView) {
        const { color = 'black', padding = 0 } = this.options;
        const node = cellView.model;
        
        let d;
        if (node instanceof Node) {
            d = node.getOutlinePathData({ padding });
        }
        else if (node.isLink()) {
            d = cellView.getSerializedConnection();
        }
        else {
            throw new Error('SelectionEffect can only be applied to this cell.');
        }
        
        this.vel.attr({
            d,
            fill: 'none',
            stroke: color,
            strokeWidth: 2,
            strokeLinejoin: 'round',
            pointerEvents: 'none',
        });
        
        this.el.classList.add('selection-effect');
        this.el.classList.add('fade-in');
        this.el.dataset.type = node.get('type');
    }
}
