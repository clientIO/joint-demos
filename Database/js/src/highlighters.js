import { dia } from '@joint/plus';

const PADDING = {
    top: 13,
    left: 8,
    right: 8,
    bottom: 8
};

export class TableHighlighter extends dia.HighlighterView {
    
    constructor() {
        super({
            tagName: 'rect',
            layer: dia.Paper.Layers.BACK
        });
    }
    
    highlight(tableView) {
        const table = tableView.model;
        const { width, height } = table.size();
        this.vel.attr({
            'x': -PADDING.left,
            'y': -PADDING.top,
            'width': PADDING.left + width + PADDING.right,
            'height': PADDING.top + height + PADDING.bottom,
            'fill': 'none',
            'stroke-width': 3,
            'stroke': table.getTabColor(),
            'pointer-events': 'none'
        });
    }
}
