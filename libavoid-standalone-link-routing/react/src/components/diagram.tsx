import {
    Diagram,
    Paper,
    PaperScroller,
    linkRoutingOrthogonal,
    linkRoutingStraight,
    usePaper,
    usePaperScroller,
} from '@joint/react-plus';
import type {
    InteractionsOptions,
    SpatialIndexOptions,
    ZoomToFitOptions,
} from '@joint/react-plus';
import { useEffect } from 'react';
import type { FlowCell } from '@/data/cells';
import { CORNER_RADIUS, FALLBACK_MARGIN } from '@/routing/settings';
import { useAvoidRouter } from '@/routing/use-avoid-router';
import type { RoutingStatus } from '@/routing/use-avoid-router';
import { CANVAS_COLOR } from '@/theme';
import { RenderNode } from './render-node';
import { ZoomControls } from './zoom-controls';

const FIT_OPTIONS: ZoomToFitOptions = {
    contentMargin: 50,
    // With virtual rendering only a handful of views exist at any moment, so
    // the fit has to be computed from the models rather than from the DOM.
    useModelGeometry: true,
    maxScale: 1,
};

/**
 * Selection is off: there is nothing here to act on a selected cell, and its
 * Delete / Ctrl+A bindings would only be a way to break the diagram. Panning,
 * wheel scrolling and pinch zoom — the parts that matter on a graph this size —
 * stay on.
 */
const INTERACTIONS: InteractionsOptions = { selection: false };

/**
 * Backs the graph with a `dia.SearchGraph`: a quad-tree index over element
 * bounds. Every pointer gesture on the paper — hovering a node, dropping a link
 * end, the viewport check virtual rendering runs — is a spatial query, and on
 * 750 elements a linear scan for each of them is what makes a large graph feel
 * slow.
 *
 * Lazy, rather than the eager default. Eager reindexes each cell as it is
 * written: dragging a node reindexes the node and every link attached to it on
 * every pointer move, and the routed reply then reindexes each of the ~1250
 * links again as its vertices land — all of it before anything asks a question.
 * Lazy marks the tree dirty instead and rebuilds once, on the next query. The
 * write bursts here are large and the queries between them are few, which is
 * the shape lazy mode is for.
 */
const SPATIAL_INDEX: SpatialIndexOptions = { isQuadTreeLazy: true };

/**
 * The paper's own link routing, for every link Libavoid has not answered for.
 *
 * A link is drawn with this until its route arrives, and stays with it when
 * Libavoid cannot find a usable route at all — the worker replies with a `null`
 * router in that case, which is what hands the link back here. A routed link
 * carries `router: 'normal'` instead, so its Libavoid vertices are drawn as they
 * came; the preset's connector is what rounds their corners.
 */
const LINK_ROUTING = {
    ...linkRoutingOrthogonal({
        cornerRadius: CORNER_RADIUS,
        margin: FALLBACK_MARGIN,
    }),
    /*
     * The one part of the orthogonal preset this diagram cannot take: it ends a
     * connected link on its anchor, and here that anchor is the point Libavoid
     * routed to — the centre of a port. The arrowhead would be drawn from there
     * inwards, underneath the port it points at.
     *
     * The straight preset's connection point stops the line where it meets the
     * element and backs it off by the length of the arrowhead, which is what
     * leaves the arrow in the open where it can be seen.
     */
    defaultConnectionPoint: linkRoutingStraight().defaultConnectionPoint,
};

interface CanvasProps {
    readonly onStatusChange: (status: RoutingStatus) => void;
}

function Canvas({ onStatusChange }: CanvasProps) {
    const { paper } = usePaper();
    const { zoomToFit } = usePaperScroller();
    const status = useAvoidRouter();

    // The routing status is raised to the app so the toolbar can show it
    // outside the canvas.
    useEffect(() => onStatusChange(status), [onStatusChange, status]);

    /*
     * Framed once, as soon as the paper exists. The nodes are already where
     * they will stay, and a Libavoid route stays close enough to them that the
     * content box barely moves once the routes land — not worth a second fit
     * that would overrule whatever the user has zoomed to in the meantime.
     */
    useEffect(() => {
        if (!paper) return;
        zoomToFit(FIT_OPTIONS);
    }, [paper, zoomToFit]);

    return (
        <div className="canvas-stage">
            <PaperScroller
                className="flow-scroller"
                cursor="grab"
                inertia
                // The default floor of 0.2 is not far enough out to frame the
                // large graph, which is some 25,000 px across.
                minZoom={0.02}
                /*
                 * Only the cells inside the viewport get a view. On the large
                 * graph that is a few dozen out of ~820, which is the
                 * difference between a canvas that pans smoothly and one that
                 * has ~380 React subtrees and ~450 link paths mounted at once.
                 *
                 * Read at mount only, which is another reason the app remounts
                 * the whole `<Diagram>` when the graph changes.
                 */
                virtualRendering
            >
                <Paper
                    className="flow-paper"
                    renderElement={RenderNode}
                    background={{ color: CANVAS_COLOR }}
                    gridSize={10}
                    drawGrid={false}
                    snapLinks={{ radius: 30 }}
                    linkPinning={false}
                    overflow
                    linkRouting={LINK_ROUTING}
                    moveThreshold={10}
                />
            </PaperScroller>
            <ZoomControls onFit={() => zoomToFit(FIT_OPTIONS)} />
        </div>
    );
}

export interface FlowDiagramProps {
    readonly cells: readonly FlowCell[];
    readonly onStatusChange: (status: RoutingStatus) => void;
}

/**
 * The canvas.
 *
 * Uncontrolled on purpose: `initialCells` seeds the graph and the graph owns
 * everything after that — the router writes routes onto the link models, and
 * `@joint/react-plus` follows along. Routing several hundred links never
 * touches React state.
 */
export function FlowDiagram({ cells, onStatusChange }: FlowDiagramProps) {
    return (
        <Diagram
            initialCells={cells}
            interactions={INTERACTIONS}
            spatialIndex={SPATIAL_INDEX}
        >
            <Canvas onStatusChange={onStatusChange} />
        </Diagram>
    );
}
