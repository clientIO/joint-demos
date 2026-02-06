import type { dia } from '@joint/plus';
import { shapes, V, g } from '@joint/plus';
import type { VerticalPool } from '../shapes/pool/pool-shapes';
import { type HorizontalPool, HorizontalSwimlane, VerticalSwimlane } from '../shapes/pool/pool-shapes';
import { DEFAULT_HORIZONTAL_POOL_SIZE, DEFAULT_VERTICAL_POOL_SIZE, SWIMLANE_HEADER_SIZE } from '../shapes/pool/pool-config';
import { ShapeTypes } from '../shapes/shapes-typing';
import { MAIN_COLOR } from '../configs/theme';

type PoolPreviewEventData = {
    node: SVGElement;
    graphBBox: g.Rect | null;
    poolDimensions: g.Rect;
}

const PREVIEW_STROKE = MAIN_COLOR;
const PREVIEW_STROKE_WIDTH = 2;
const PREVIEW_FILL = '#FFFFFF';

export function onPoolDragStart(paper: dia.Paper, poolView: dia.ElementView, evt: dia.Event, _x: number, _y: number) {

    const graph = paper.model;
    // Elements that are required to be encapsulated by the pool
    const elements = graph.getElements();
    // Graph includes some elements and there are no pools in the graph
    const boundaryCheckRequired = elements.length > 0 && elements.every((element) => !shapes.bpmn2.CompositePool.isPool(element));

    if (!boundaryCheckRequired) return;

    const pool = poolView.model as HorizontalPool;
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

    const { node } = constructPoolPreview(pool, poolDimensions);

    const { clientX, clientY } = evt;
    // Local center of the pool
    let { x, y } = paper.clientToLocalPoint(clientX!, clientY!);
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

export function onPoolDrag(paper: dia.Paper, _poolView: dia.ElementView, evt: dia.Event, _x: number, _y: number) {

    const poolPreview = evt.data.poolPreview as PoolPreviewEventData | undefined;

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

export function onPoolDragEnd(_paper: dia.Paper, _poolView: dia.ElementView, evt: dia.Event, _x: number, _y: number) {

    if (!evt.data.poolPreview) return;

    // Remove the pool preview when the drag ends
    const { node } = evt.data.poolPreview as PoolPreviewEventData;
    node.remove();
}

export function onPoolDrop(paper: dia.Paper, poolView: dia.ElementView, evt: dia.Event, _x: number, _y: number) {

    const pool = poolView.model as HorizontalPool | VerticalPool;
    // When the user drops a new pool on the paper, we add a new swimlane to it.
    const swimlane = pool.isHorizontal() ? new HorizontalSwimlane() : new VerticalSwimlane();

    pool.addSwimlane(swimlane);

    if (!evt.data.poolDropCoordinates) return;

    const { x, y } = evt.data.poolDropCoordinates;

    const batchName = 'pool-preview-replace';
    const graph = paper.model;

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

// helpers

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

    let path = pool.isHorizontal() ?
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
    return !(shapes.bpmn2.CompositePool.isPool(element) || shapes.bpmn2.Swimlane.isSwimlane(element) || element.get('shapeType') === ShapeTypes.GROUP);
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
