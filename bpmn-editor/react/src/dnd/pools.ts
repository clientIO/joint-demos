import { V, g } from '@joint/plus';
import { type HorizontalPool, HorizontalSwimlane, VerticalSwimlane } from '../shapes/pool/pool-shapes';
import { DEFAULT_HORIZONTAL_POOL_SIZE, DEFAULT_VERTICAL_POOL_SIZE, SWIMLANE_HEADER_SIZE } from '../shapes/pool/pool-config';

import type { dia } from '@joint/plus';
import type { VerticalPool, BpmnPool } from '../shapes/pool/pool-shapes';
import { isSwimlane, isPool, isGroup, getPoolParent, type EditorEvent } from '../utils';

const PREVIEW_STROKE = 'var(--bpmn-selector)';
const PREVIEW_STROKE_WIDTH = 2;
const PREVIEW_FILL = 'var(--bpmn-palette-surface)';

/**
 * The diagram's pools in the order they read on screen (left to right, then
 * top to bottom), so stepping through them with the keyboard follows what
 * the eye sees rather than the order they were added in.
 */
export function getPoolsInOrder(graph: dia.Graph): BpmnPool[] {
    return graph.getElements()
        .filter(isPool)
        .sort((a, b) => {
            const from = a.position();
            const to = b.position();
            return from.x - to.x || from.y - to.y;
        });
}

/**
 * The pool to start aiming from, the counterpart of `findDropSwimlane()`:
 * the pool the selection is in, else the pool under the point, else the
 * first pool. `null` when the diagram has no pool.
 *
 * Like its counterpart this only seeds the aim — the arrows step it from
 * here, and the insertion preview shows where a lane would land.
 */
export function findDropPool(graph: dia.Graph, selection: dia.Cell[], point: g.PlainPoint): BpmnPool | null {

    for (const cell of selection) {
        const pool = isPool(cell) ? cell : getPoolParent(cell);
        if (pool) return pool;
    }

    const pools = graph.getElements().filter(isPool);

    return pools.find((pool) => pool.getBBox().containsPoint(point)) ?? pools[0] ?? null;
}

/**
 * Replaces the dragged pool clone with a lightweight preview rectangle
 * sized to fit the diagram content (the pool must contain everything).
 */
export function onPoolDragStart(paper: dia.Paper, poolView: dia.ElementView, evt: EditorEvent, _x: number, _y: number) {

    const pool = poolView.model as HorizontalPool;

    const content = sizePoolToContent(paper.model, pool);
    // Nothing to wrap: the pool is dragged at its own size and the drag needs
    // no preview to constrain.
    if (!content) return;

    const { graphBBox, poolDimensions } = content;

    const { node } = constructPoolPreview(pool, poolDimensions);

    const { clientX, clientY } = evt;
    // Local center of the pool
    const { x, y } = paper.clientToLocalPoint(clientX!, clientY!);
    node.setAttribute('transform', `translate(${x - poolDimensions.width / 2}, ${y - poolDimensions.height / 2})`);

    const frontLayer = paper.layers.querySelector('g.joint-back-layer')!;

    frontLayer.appendChild(node);

    evt.data.poolPreview = {
        node,
        graphBBox,
        poolDimensions,
    };

    // Remove the clone since it will be visualized as a pool preview
    pool.remove();
}

/**
 * Moves the pool preview with the pointer, constrained so the pool would
 * still contain the diagram content, and remembers the drop position.
 */
export function onPoolDrag(paper: dia.Paper, _poolView: dia.ElementView, evt: EditorEvent, _x: number, _y: number) {

    const poolPreview = evt.data.poolPreview;

    // Pool preview is not available
    if (!poolPreview) return;

    const { poolDimensions, graphBBox } = poolPreview;

    const { clientX, clientY } = evt;
    // Local center of the pool
    const { x: cx, y: cy } = paper.clientToLocalPoint(clientX!, clientY!);

    let x = cx - poolDimensions.width / 2;
    let y = cy - poolDimensions.height / 2;

    const { node } = poolPreview;

    if (graphBBox) {
        // Ensure that the pool is encapsulating all elements in the paper
        poolDimensions.x = x;
        poolDimensions.y = y;
        const cappedPosition = ensurePoolDragBoundary(graphBBox, poolDimensions);
        const snappedPosition = new g.Point(cappedPosition.x, cappedPosition.y).snapToGrid(paper.options.gridSize!);

        x = snappedPosition.x;
        y = snappedPosition.y;

        evt.data.poolDropCoordinates = { x, y };
    }

    node.setAttribute('transform', `translate(${x}, ${y})`);
}

/**
 * Removes the pool preview.
 */
export function onPoolDragEnd(_paper: dia.Paper, _poolView: dia.ElementView, evt: EditorEvent, _x: number, _y: number) {

    if (!evt.data.poolPreview) return;

    // Remove the pool preview when the drag ends
    const { node } = evt.data.poolPreview!;
    node.remove();
}

/**
 * Places the dropped pool at the constrained preview position and embeds
 * the diagram content into it.
 */
export function onPoolDrop(paper: dia.Paper, poolView: dia.ElementView, evt: EditorEvent, _x: number, _y: number) {

    const pool = poolView.model as HorizontalPool | VerticalPool;
    // When the user drops a new pool on the paper, we add a new swimlane to it.
    const swimlane = pool.isHorizontal() ? new HorizontalSwimlane() : new VerticalSwimlane();

    pool.addSwimlane(swimlane);

    if (!evt.data.poolDropCoordinates) return;

    const { x, y } = evt.data.poolDropCoordinates;

    placePoolAt(paper.model, pool, swimlane, x, y);
}

/**
 * Finalizes a newly added pool at the given position: positions the pool
 * and its swimlane and embeds the loose diagram content (the pool must
 * contain everything). Shared by the pointer drop and the keyboard path.
 */
export function placePoolAt(
    graph: dia.Graph,
    pool: HorizontalPool | VerticalPool,
    swimlane: HorizontalSwimlane | VerticalSwimlane,
    x: number,
    y: number
) {

    const batchName = 'pool-preview-replace';

    let dx = 0;
    let dy = 0;

    if (pool.isHorizontal()) {
        dx = SWIMLANE_HEADER_SIZE;
    } else {
        dy = SWIMLANE_HEADER_SIZE;
    }

    graph.startBatch(batchName);

    swimlane.position(x + dx, y + dy);
    pool.position(x, y);

    // Embed all elements in the graph to the swimlane
    const poolBoundaryElements = graph.getElements().filter(isPoolBoundaryRequired);

    // Move all elements to the relative position
    poolBoundaryElements.forEach((boundaryElement) => {

        boundaryElement.toFront();

        if (boundaryElement.get('type').includes('Boundary')) {
            // Skip embedding the boundary elements to the swimlane, since they are embedded to the activity
            return;
        }

        swimlane.embed(boundaryElement);
    });

    graph.getLinks().forEach((link) => {
        link.toFront();
    });

    graph.stopBatch(batchName);
}

/**
 * Keyboard counterpart of the pool drop: adds the pool to the graph with
 * its mandatory first swimlane. The content wrap applies only to the FIRST
 * pool (mirroring `onPoolDragStart`'s boundary check — the pointer flow
 * never wraps once a pool exists): the pool is sized to the loose content
 * and placed over it; otherwise it lands at the given position as-is.
 */
export function dropPoolAt(graph: dia.Graph, pool: HorizontalPool | VerticalPool, x: number, y: number) {

    // Sized before the pool is added, so it is not counted as the pool whose
    // presence makes the wrap unnecessary.
    const content = sizePoolToContent(graph, pool);

    const swimlane = pool.isHorizontal() ? new HorizontalSwimlane() : new VerticalSwimlane();

    graph.addCell(pool);
    pool.addSwimlane(swimlane);

    if (!content) {
        // Nothing to wrap, so the pool lands where it was asked for. It cannot
        // go through `placePoolAt()`: that embeds every loose element, and a
        // second pool would take the first one's shapes with it.
        let dx = 0;
        let dy = 0;
        if (pool.isHorizontal()) {
            dx = SWIMLANE_HEADER_SIZE;
        } else {
            dy = SWIMLANE_HEADER_SIZE;
        }
        swimlane.position(x + dx, y + dy);
        pool.position(x, y);
        return;
    }

    // The first pool: over the content it now holds, at the size it was given.
    const { graphBBox } = content;
    placePoolAt(graph, pool, swimlane, graphBBox?.x ?? x, graphBBox?.y ?? y);
}


// helpers

/**
 * Sizes a new pool to hold the loose diagram content, which the first pool
 * must contain, and reports the box it has to cover. `null` where there is
 * nothing to wrap — an empty diagram, or one that already has a pool, whose
 * content is not the new pool's business.
 *
 * The pointer drag builds its preview from these dimensions and keeps the
 * pool over the box while it moves; the keyboard drop, which has neither a
 * preview nor a pointer, drops the pool on the box directly.
 */
function sizePoolToContent(graph: dia.Graph, pool: HorizontalPool | VerticalPool) {

    const elements = graph.getElements();
    if (elements.length === 0 || elements.some(isPool)) return null;

    const contentMargin = pool.getContentMargin();
    const poolBoundaryElements = elements.filter(isPoolBoundaryRequired);

    const { moveAndExpandArgs, boundary: dimensions, sizeDiff } = calculatePoolDimensions(pool);

    // Inflate the graph boundary to account for the content margin and mandatory swimlane header size
    const graphBBox = graph.getCellsBBox(poolBoundaryElements)?.inflate(contentMargin).moveAndExpand(moveAndExpandArgs);
    const poolDimensions = new g.Rect(
        0,
        0,
        Math.max(graphBBox?.width ?? 0, dimensions.width),
        Math.max(graphBBox?.height ?? 0, dimensions.height)
    );

    pool.size(poolDimensions.width + sizeDiff.width, poolDimensions.height + sizeDiff.height);

    return { graphBBox: graphBBox ?? null, poolDimensions };
}

function calculatePoolDimensions(pool: HorizontalPool | VerticalPool) {

    const poolHeaderSize = pool.getHeaderSize();
    const offset = -poolHeaderSize - SWIMLANE_HEADER_SIZE;

    if (pool.isHorizontal()) {

        return {
            moveAndExpandArgs: {
                x: offset,
                y: 0,
                width: SWIMLANE_HEADER_SIZE,
                height: 0
            },
            boundary: {
                width: DEFAULT_HORIZONTAL_POOL_SIZE.width - poolHeaderSize,
                height: DEFAULT_HORIZONTAL_POOL_SIZE.height,
            },
            sizeDiff: {
                width: poolHeaderSize,
                height: 0,
            }
        };
    }

    return {
        moveAndExpandArgs: {
            x: 0,
            y: offset,
            width: 0,
            height: SWIMLANE_HEADER_SIZE
        },
        boundary: {
            width: DEFAULT_VERTICAL_POOL_SIZE.width,
            height: DEFAULT_VERTICAL_POOL_SIZE.height - poolHeaderSize,
        },
        sizeDiff: {
            width: 0,
            height: poolHeaderSize,
        }
    };
}

function constructPoolPreview(pool: HorizontalPool | VerticalPool, poolDimensions: g.Rect) {
    const poolHeaderSize = pool.getHeaderSize();
    const { width, height } = poolDimensions;

    const path = pool.isHorizontal() ?
        `M 0 0 H ${width + poolHeaderSize} V ${height} H 0 z M ${poolHeaderSize} 0 V ${height}` :
        `M 0 0 V ${height + poolHeaderSize} H ${width} V 0 z M 0 ${poolHeaderSize} H ${width}`;

    return V(`
        <g>
            <path
                d="${path}"
                stroke="${PREVIEW_STROKE}"
                stroke-width="${PREVIEW_STROKE_WIDTH}"
                fill="${PREVIEW_FILL}"
            />
        </g>`
    );
}

function isPoolBoundaryRequired(element: dia.Element) {
    return !(isPool(element) || isSwimlane(element) || isGroup(element));
}

function ensurePoolDragBoundary(encapsulatedBoundary: g.Rect, poolDimensions: g.Rect): { x: number, y: number } {

    const maxX = encapsulatedBoundary.x + encapsulatedBoundary.width - poolDimensions.width;
    const maxY = encapsulatedBoundary.y + encapsulatedBoundary.height - poolDimensions.height;

    if (!poolDimensions.containsRect(encapsulatedBoundary)) {
        const x = Math.min(encapsulatedBoundary.x, Math.max(poolDimensions.x, maxX));
        const y = Math.min(encapsulatedBoundary.y, Math.max(poolDimensions.y, maxY));

        // Return the capped position
        return {
            x,
            y,
        };
    }

    // Return the original position
    return {
        x: poolDimensions.x,
        y: poolDimensions.y,
    };
}
