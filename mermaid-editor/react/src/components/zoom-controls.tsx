import { usePaperScroller, usePaperScrollerViewport } from '@joint/react-plus';

const ZOOM_STEP = 1.2;

export interface ZoomControlsProps {
    /** Re-frames the whole diagram; owned by the canvas so it shares its options. */
    readonly onFit: () => void;
}

/**
 * Floating zoom cluster.
 *
 * `usePaperScrollerViewport` is reactive, so the percentage tracks wheel and
 * pinch gestures too, and the buttons disable themselves at the scroller's
 * `minZoom` / `maxZoom` bounds.
 */
export function ZoomControls({ onFit }: ZoomControlsProps) {
    const { setZoom } = usePaperScroller();
    const { zoom, canZoomIn, canZoomOut } = usePaperScrollerViewport();

    return (
        <div className="zoom-controls">
            <button
                type="button"
                className="app-button is-icon"
                aria-label="Zoom out"
                disabled={!canZoomOut}
                onClick={() => setZoom((current) => current / ZOOM_STEP)}
            >
                −
            </button>
            <span className="zoom-value" aria-live="polite">
                {Math.round(zoom * 100)}%
            </span>
            <button
                type="button"
                className="app-button is-icon"
                aria-label="Zoom in"
                disabled={!canZoomIn}
                onClick={() => setZoom((current) => current * ZOOM_STEP)}
            >
                +
            </button>
            <button
                type="button"
                className="app-button is-icon"
                aria-label="Fit to content"
                title="Fit to content"
                onClick={onFit}
            >
                <svg
                    viewBox="0 0 24 24"
                    width="15"
                    height="15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                >
                    <path d="M4 9V5.6A1.6 1.6 0 0 1 5.6 4H9M15 4h3.4A1.6 1.6 0 0 1 20 5.6V9M20 15v3.4a1.6 1.6 0 0 1-1.6 1.6H15M9 20H5.6A1.6 1.6 0 0 1 4 18.4V15" />
                </svg>
            </button>
        </div>
    );
}
