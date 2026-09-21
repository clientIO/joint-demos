import { V, highlighters } from '@joint/plus';
import type { dia } from '@joint/plus';

/** The corners of the frame: the radius of the element's own corners, or `round` for an element round by half its height, however tall it grows. */
export type FrameRadius = number | 'round';

/**
 * A frame around an element, in the shape of the element: its box,
 * `padding` away from the edge, with the corners rounded by `radius` - the
 * radius of the element's own corners - plus the padding, so the frame runs
 * along the edge at the same distance everywhere. The stock stroke
 * highlighter pads by scaling the outline instead: the round ends of a pill
 * come out elliptical, the stroke uneven. Drawn from the model, in the
 * coordinates of the element - the highlighter's group follows the element -
 * and drawn again when the element is resized: a `round` radius follows.
 */
export class FrameHighlighter extends highlighters.stroke {
    UPDATE_ATTRIBUTES = ['size'];

    protected highlightNode(cellView: dia.CellView): void {
        const { padding = 0, radius = 0 } = this.options as { padding?: number; radius?: FrameRadius };
        const { width, height } = (cellView.model as dia.Element).size();
        const r = (radius === 'round' ? height / 2 : radius) + padding;
        this.vel.attr('d', V.rectToPath({
            x: -padding,
            y: -padding,
            width: width + 2 * padding,
            height: height + 2 * padding,
            rx: r,
            ry: r
        }));
    }
}
