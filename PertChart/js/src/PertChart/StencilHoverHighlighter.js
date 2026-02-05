import { dia } from '@joint/plus';

// Define a custom highlighter for the stencil hover effect
export const StencilHoverHighlighter = dia.HighlighterView.extend({
    
    tagName: 'rect',
    
    attributes: {
        rx: 15,
        ry: 15,
    },
    
    options: {
        padding: 0,
        width: null,
        height: null,
        className: '',
        z: 0 // Render the highlighter behind the element
    },
    
    // Method called to highlight a CellView
    highlight(cellView) {
        const { padding, width, height, className } = this.options;
        const bbox = cellView.model.getBBox();
        // Highlighter is always rendered relatively to the CellView origin
        bbox.x = bbox.y = 0;
        // Custom width and height can be set
        if (Number.isFinite(width)) {
            bbox.width = width;
        }
        if (Number.isFinite(height)) {
            bbox.height = height;
        }
        // Increase the size of the highlighter
        bbox.inflate(padding);
        this.vel.attr(bbox.toJSON());
        // Apply the class name for styling
        this.vel.node.classList.add(className);
    },
});
