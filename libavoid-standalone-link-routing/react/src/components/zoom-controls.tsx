import { usePaperScroller, usePaperScrollerViewport } from '@joint/react-plus';

const ZOOM_STEP = 1.2;

export interface ZoomControlsProps {
    readonly onFit: () => void;
}

/** Zoom in / out / fit, floating over the bottom-right of the canvas. */
export function ZoomControls({ onFit }: ZoomControlsProps) {
    const { setZoom } = usePaperScroller();
    const { zoom, canZoomIn, canZoomOut } = usePaperScrollerViewport();

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
            <span className="zoom-level">{Math.round(zoom * 100)}%</span>
            <button
                type="button"
                onClick={() => setZoom((previous) => previous * ZOOM_STEP)}
                disabled={!canZoomIn}
                title="Zoom in"
            >
                +
            </button>
            <button type="button" onClick={onFit} title="Fit to content">
                Fit
            </button>
        </div>
    );
}
