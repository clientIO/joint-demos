import { usePaperScroller, usePaperScrollerViewport } from '@joint/react-plus';

const ZOOM_STEP = 1.4;

export interface ZoomControlsProps {
    readonly onFit: () => void;
}

/** Zoom in / out / fit, floating over the bottom-right of the canvas. */
export function ZoomControls({ onFit }: ZoomControlsProps) {
    const { setZoom } = usePaperScroller();
    const canZoomIn = usePaperScrollerViewport((viewport) => viewport.canZoomIn);
    const canZoomOut = usePaperScrollerViewport((viewport) => viewport.canZoomOut);

    return (
        <div className="zoom-controls">
            <button
                type="button"
                onClick={() => setZoom((previous) => previous / ZOOM_STEP)}
                disabled={!canZoomOut}
                title="Zoom out"
            >
                −
            </button>
            <button
                type="button"
                onClick={() => setZoom((previous) => previous * ZOOM_STEP)}
                disabled={!canZoomIn}
                title="Zoom in"
            >
                +
            </button>
            <button type="button" onClick={onFit} title="Fit the whole map">
                Fit
            </button>
        </div>
    );
}
