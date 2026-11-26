import { anchors } from '@joint/plus';
import { GRID_SIZE } from './connection-rules';

/** A part of the length (`'37.5%'`) or a length. */
const lengthOf = (value: unknown, length: number): number =>
    typeof value === 'string' && value.endsWith('%') ? (parseFloat(value) / 100) * length : Number(value) || 0;

/**
 * The anchor of a link end on a side of an element: the point at the parts of its size (`dx`, `dy`, as `topLeft`),
 * snapped to the grid of the paper along the side - the end stays on the grid when the element is resized (a pipe
 * straight between elements on the grid). Saved diagrams name it `gridSide`.
 */
export const gridSide: anchors.GenericAnchor<'topLeft'> = function (this: unknown, view, magnet, ref, options, endType, linkView) {
    const element = view.model;
    if (!element.isElement()) {
        return anchors.topLeft.call(this, view, magnet, ref, options, endType, linkView);
    }
    const { width, height } = element.size();
    const { x: left, y: top } = element.position();
    let x = lengthOf(options.dx, width);
    let y = lengthOf(options.dy, height);
    const snap = (value: number, origin: number, max: number) => Math.max(0, Math.min(max, Math.round((origin + value) / GRID_SIZE) * GRID_SIZE - origin));
    if (x <= 0 || x >= width) {
        y = snap(y, top, height);
    } else {
        x = snap(x, left, width);
    }
    return anchors.topLeft.call(this, view, magnet, ref, { ...options, dx: x, dy: y }, endType, linkView);
};

/** The anchors of the paper: the library's and `gridSide`. */
export const ANCHOR_NAMESPACE = { ...anchors, gridSide };
