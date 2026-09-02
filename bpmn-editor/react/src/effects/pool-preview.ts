import { V, g } from '@joint/plus';
import { getClampedPoolPosition } from '../utils';

import type { dia } from '@joint/plus';
import type { BpmnPool } from '../shapes/pool/pool-shapes';
import type { EditorEvent, PoolPreview } from '../utils';

const PREVIEW_STROKE = 'var(--bpmn-selector)';
const PREVIEW_STROKE_WIDTH = 2;
const PREVIEW_FILL = 'var(--bpmn-palette-surface)';

/**
 * Stands a lightweight rectangle in for a pool dragged from the stencil,
 * centred on the pointer. The clone itself is not dragged: a pool wraps the
 * whole diagram, so what moves is an outline of where it would land.
 */
export function showPoolPreview(
    paper: dia.Paper,
    pool: BpmnPool,
    content: { graphBBox: g.Rect | null, poolDimensions: g.Rect },
    evt: EditorEvent
): PoolPreview {

    const { graphBBox, poolDimensions } = content;
    const node = constructPoolPreview(pool, poolDimensions);

    const { x, y } = pointerPoint(paper, evt);
    node.setAttribute('transform', `translate(${x - poolDimensions.width / 2}, ${y - poolDimensions.height / 2})`);

    paper.layers.querySelector('g.joint-back-layer')!.appendChild(node);

    return { node, graphBBox, poolDimensions };
}

/**
 * Moves the preview with the pointer and returns where the pool would land —
 * clamped so it still covers the content it has to contain, and snapped to
 * the grid. `null` while there is no content to stay over, which leaves the
 * drop to the pointer.
 */
export function movePoolPreview(paper: dia.Paper, preview: PoolPreview, evt: EditorEvent): g.PlainPoint | null {

    const { node, poolDimensions, graphBBox } = preview;

    const { x: cx, y: cy } = pointerPoint(paper, evt);
    let x = cx - poolDimensions.width / 2;
    let y = cy - poolDimensions.height / 2;
    let at: g.PlainPoint | null = null;

    if (graphBBox) {
        poolDimensions.x = x;
        poolDimensions.y = y;

        const capped = getClampedPoolPosition(graphBBox, poolDimensions);
        const snapped = new g.Point(capped.x, capped.y).snapToGrid(paper.options.gridSize!);

        x = snapped.x;
        y = snapped.y;
        at = { x, y };
    }

    node.setAttribute('transform', `translate(${x}, ${y})`);

    return at;
}

/**
 * Takes the preview off the paper.
 */
export function removePoolPreview(preview: PoolPreview | undefined) {
    preview?.node.remove();
}

// The pointer in paper coordinates. The drag reads the client position rather
// than the handler's own `x`/`y`: a stencil drag starts on another paper.
function pointerPoint(paper: dia.Paper, evt: EditorEvent) {
    const { clientX, clientY } = evt;
    return paper.clientToLocalPoint(clientX!, clientY!);
}

function constructPoolPreview(pool: BpmnPool, poolDimensions: g.Rect) {
    const poolHeaderSize = pool.getHeaderSize();
    const { width, height } = poolDimensions;

    const path = pool.isHorizontal() ?
        `M 0 0 H ${width + poolHeaderSize} V ${height} H 0 z M ${poolHeaderSize} 0 V ${height}` :
        `M 0 0 V ${height + poolHeaderSize} H ${width} V 0 z M 0 ${poolHeaderSize} H ${width}`;

    const { node } = V(`
        <g>
            <path
                d="${path}"
                stroke="${PREVIEW_STROKE}"
                stroke-width="${PREVIEW_STROKE_WIDTH}"
                fill="${PREVIEW_FILL}"
            />
        </g>`
    );

    return node;
}
