import { selectElementSize, useCell } from '@joint/react-plus';
import type { NodeData } from '@/data/cells';
import { STATUS_TINT } from '@/theme';

/**
 * The low level of detail: one rectangle, tinted by status.
 *
 * Below 25% zoom a node is about thirty pixels across. There is no text to be
 * had at that size, so the block does not try — no label, no stroke (a 2px
 * border at 0.1 scale is a fifth of a pixel), no second element of any kind.
 * What survives the zoom is position and colour, and that is exactly what a
 * whole-map view is for: the shape of the estate, and where the warm patches
 * are.
 *
 * One SVG node per element is the floor. It is what makes the fully-zoomed-out
 * view — all 1,200 nodes on screen at once, where virtual rendering has nothing
 * left to skip — a view you can still pan.
 */
export function ServiceBlock({ status }: NodeData) {
    const { width, height } = useCell(selectElementSize);

    return <rect width={width} height={height} rx={8} ry={8} fill={STATUS_TINT[status]} />;
}
