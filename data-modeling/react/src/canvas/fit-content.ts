// Animated fit-to-content, shared by the minimap's Fit button and the post-import
// framing: pan + zoom TRANSITION to the content's bounding box (not zoomToFit's
// instant snap). visibility < 1 leaves a margin; falls back to zoomToFit on an
// empty canvas (no bbox to frame).

import type { GraphApi, usePaperScroller } from '@joint/react-plus';

type ScrollerApi = ReturnType<typeof usePaperScroller>;

// Single source for the scroller's zoom bounds: <PaperScroller minZoom/maxZoom>
// clamps every zoom interaction (wheel, pinch, setZoom, minimap drag), the
// navigator's slider maps onto the same range, and Fit never zooms below the floor.
export const FIT_MIN_ZOOM = 0.2;
export const MAX_ZOOM = 2;

export function transitionToContent(
    { paperScroller, zoomToFit }: ScrollerApi,
    graph: GraphApi['graph'],
): void {
    const bbox = graph.getBBox();
    if (paperScroller && bbox) {
        paperScroller.transitionToRect(bbox, {
            maxScale: 1,
            minScale: FIT_MIN_ZOOM,
            visibility: 0.9,
            // Snappy but smooth (the default feels sluggish).
            duration: '250ms',
            timingFunction: 'ease-out',
        });
    } else {
        zoomToFit({ padding: 48, maxScale: 1 });
    }
}
