import { useEffect } from 'react';
import { Diagram, Paper, PaperScroller, usePaper, usePaperScroller } from '@joint/react-plus';
import type { CellVisibility, InteractionsOptions, SpatialIndexOptions, ZoomToFitOptions } from '@joint/react-plus';
import type { dia } from '@joint/plus';
import type { ServiceCell } from '@/data/cells';
import { selectDetailLevel } from '@/detail';
import { CANVAS_COLOR } from '@/theme';
import { Hud } from './hud';
import { RenderNode } from './render-node';
import { ZoomControls } from './zoom-controls';

const FIT_OPTIONS: ZoomToFitOptions = {
    contentMargin: 40,
    // With virtual rendering only a fraction of the views exist at any moment,
    // so the fit has to be computed from the models rather than from the DOM.
    useModelGeometry: true,
    maxScale: 1,
};

/**
 * Selection is off: there is nothing here to act on a selected cell, and its
 * Delete / Ctrl+A bindings would only be a way to break the map. Panning, wheel
 * scrolling and pinch zoom — the parts this demo is made of — stay on.
 */
const INTERACTIONS: InteractionsOptions = { selection: false };

/**
 * Backs the graph with a quad-tree index over element bounds.
 *
 * Virtual rendering asks "which cells are in the viewport?" on every pan and
 * zoom frame. On 1,200 elements that question answered by a linear scan is a
 * per-frame cost that grows with the diagram; answered by the quad-tree it
 * visits only the region being asked about.
 *
 * Lazy, rather than the eager default: this graph is written once, at load, and
 * then only ever queried. Eager would reindex each of the 1,200 elements as it
 * arrived; lazy marks the tree dirty and builds it once, on the first query.
 */
const SPATIAL_INDEX: SpatialIndexOptions = { isQuadTreeLazy: true };

/**
 * The lowest zoom has to frame the whole map — about 11,000 x 8,600 px — which
 * the scroller's default floor of 0.2 does not reach.
 */
/**
 * Level of detail applied to the links: below 25% they are not drawn at all.
 *
 * At `Fit` all 1,600 of them are inside the viewport, so virtual rendering
 * mounts every one — and at that scale a 1px line is a grey haze that hides the
 * status colours rather than showing any structure. Dropping them there is the
 * single biggest saving in the demo, because the links outnumber the nodes.
 *
 * Declared on `<Paper>` rather than on the scroller: `<PaperScroller>` composes
 * the child paper's `cellVisibility` with its own viewport test automatically,
 * and re-runs the check on the paper's `transform` event — so the links come
 * back by themselves on the way in. Captures nothing, so a module constant
 * keeps a stable identity; the scale is read from the `paper` the callback is
 * handed. It keys off the actual scale rather than the pinned mode: the pin is
 * there to compare how the *nodes* draw.
 */
const cellVisibility: CellVisibility = ({ model, paper }) =>
    !(model.isLink() && selectDetailLevel({ zoom: paper.scale().sx }) === 'low');

/**
 * Link ends are computed from the model, not from the rendered DOM.
 *
 * The default anchor and connection point measure the element *view*, and here
 * that view is an HTML card at one zoom and a bare `<rect>` at another. Reading
 * the model instead means a link end cannot move when a node changes level —
 * the box on the model is the same at all three.
 *
 * Native paper options, so they go through the `options` escape hatch.
 */
const PAPER_OPTIONS: dia.Paper.Options = {
    defaultAnchor: { name: 'center', args: { useModelGeometry: true }},
    defaultConnectionPoint: { name: 'bbox', args: { useModelGeometry: true }}
};

const MIN_ZOOM = 0.04;
const MAX_ZOOM = 2;

function Canvas() {
    const { paper } = usePaper();
    const { zoomToFit } = usePaperScroller();

    // Framed once, as soon as the paper exists. The nodes are where they will
    // stay — nothing here moves them — so one fit is all this needs.
    useEffect(() => {
        if (!paper) return;
        zoomToFit(FIT_OPTIONS);
    }, [paper, zoomToFit]);

    return (
        <div className="canvas-stage">
            <PaperScroller
                className="map-scroller"
                cursor="grab"
                inertia
                minZoom={MIN_ZOOM}
                maxZoom={MAX_ZOOM}
                /*
                 * Only the cells inside the viewport get a view. It is the first
                 * half of the story — and the half that runs out: zoom far
                 * enough and every cell is inside the viewport, at which point
                 * the level of detail in `RenderNode` is the only thing left.
                 *
                 * Read at mount only.
                 */
                virtualRendering
            >
                <Paper
                    className="map-paper"
                    renderElement={RenderNode}
                    cellVisibility={cellVisibility}
                    options={PAPER_OPTIONS}
                    background={{ color: CANVAS_COLOR }}
                    gridSize={1}
                    drawGrid={false}
                />
            </PaperScroller>
            <Hud />
            <ZoomControls onFit={() => zoomToFit(FIT_OPTIONS)} />
        </div>
    );
}

export interface ServiceMapProps {
    readonly cells: readonly ServiceCell[];
}

/**
 * The canvas.
 *
 * Uncontrolled: `initialCells` seeds the graph once and the graph owns it after
 * that. Nothing in this demo edits a cell — the only thing that ever changes is
 * the viewport.
 */
export function ServiceMap({ cells }: ServiceMapProps) {
    return (
        <Diagram initialCells={cells} interactions={INTERACTIONS} spatialIndex={SPATIAL_INDEX}>
            <Canvas />
        </Diagram>
    );
}
