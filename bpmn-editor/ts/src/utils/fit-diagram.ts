import { ZOOM_SETTINGS } from '../configs/navigator-config';

import type { ui } from '@joint/plus';

// Pixel padding around the fitted content: the left side accounts for the
// stencil overlaying the paper.
const FIT_PADDING = { left: 80, top: 20, right: 20, bottom: 20 };

/**
 * Fits the diagram into the viewport (up to 100% zoom), keeping it clear of
 * the stencil overlay. `zoomToFit` centers the content regardless of the
 * padding (asymmetric padding only affects the scale), so the content is
 * re-centered within the padded area afterwards.
 */
export function fitDiagramToViewport(paperScroller: ui.PaperScroller): void {

    paperScroller.zoomToFit({
        useModelGeometry: true,
        minScale: ZOOM_SETTINGS.min,
        maxScale: 1,
        padding: FIT_PADDING
    });

    const center = paperScroller.options.paper.model.getBBox()?.center();
    if (!center) return;

    const scale = paperScroller.zoom();
    const offset = (FIT_PADDING.left - FIT_PADDING.right) / 2 / scale;
    paperScroller.center(center.x - offset, center.y);
}
