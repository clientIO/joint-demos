import { Maximize, Minus, Plus } from 'lucide-react';
import {
    Navigator,
    usePaperScroller,
    usePaperScrollerViewport,
    type NavigatorElementStyleCallback,
} from '@joint/react-plus';
import type { EquipmentData } from '../plant/model';
import { FIT_OPTIONS, PAPER_ID, selectZoom, ZOOM_STEP } from './paper-id';

const VIEW_BUTTON = 'grid size-8 place-items-center rounded-md text-ink-2 transition-colors duration-[var(--dur-micro)] hover:bg-paper-3 hover:text-ink';

const MINIMAP_STYLE: NavigatorElementStyleCallback<EquipmentData> = () => ({
    fill: 'var(--shape-metal-pale)',
    stroke: 'none',
});

/** The view of the canvas in one card on it: the minimap over the zoom. */
export function ViewControls() {
    const { setZoom, zoomToFit } = usePaperScroller(PAPER_ID);
    const zoom = usePaperScrollerViewport(PAPER_ID, selectZoom);
    return (
        <div className="dock dock-right absolute right-3 bottom-3 z-20 w-44 overflow-hidden rounded-lg border border-rule bg-paper-2 shadow-[var(--shadow-panel)]">
            <Navigator paper={PAPER_ID} elementStyle={MINIMAP_STYLE} showLinks={false} className="h-28 border-b border-rule bg-canvas" aria-label="Minimap" />
            <div className="flex items-center justify-between p-1">
                <button type="button" className={VIEW_BUTTON} onClick={() => setZoom((previous) => previous / ZOOM_STEP)} aria-label="Zoom out"><Minus className="size-4" aria-hidden /></button>
                <span className="font-mono text-xs text-ink-2 tabular-nums">{zoom}%</span>
                <button type="button" className={VIEW_BUTTON} onClick={() => setZoom((previous) => previous * ZOOM_STEP)} aria-label="Zoom in"><Plus className="size-4" aria-hidden /></button>
                <button type="button" className={VIEW_BUTTON} onClick={() => zoomToFit(FIT_OPTIONS)} aria-label="Fit the diagram" title="Fit the diagram"><Maximize className="size-4" aria-hidden /></button>
            </div>
        </div>
    );
}
