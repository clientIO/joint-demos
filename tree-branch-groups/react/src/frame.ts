import { V, highlighters } from '@joint/plus';
import type { dia } from '@joint/plus';

/**
 * A frame around an element, in the shape of the element: its box,
 * `padding` away from the edge, with the corners rounded by `rx`/`ry` - the
 * radius of the element's own corners - plus the padding, so the frame runs
 * along the edge at the same distance everywhere. The stock stroke
 * highlighter pads by scaling the outline instead: the round ends of a pill
 * come out elliptical, the stroke uneven. Drawn from the model, in the
 * coordinates of the element - the highlighter's group follows the element.
 */
export class FrameHighlighter extends highlighters.stroke {
    /** The frame is redrawn when the element is resized. */
    UPDATE_ATTRIBUTES = ['size'];

    protected highlightNode(cellView: dia.CellView): void {
        const { padding = 0, rx = 0, ry = 0 } = this.options;
        const { width, height } = (cellView.model as dia.Element).size();
        this.vel.attr('d', V.rectToPath({
            x: -padding,
            y: -padding,
            width: width + 2 * padding,
            height: height + 2 * padding,
            rx: rx + padding,
            ry: ry + padding
        }));
    }
}
