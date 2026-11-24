/**
 * Small floating controls over the board: the armed-connection hint, the bar for a
 * selected flow, and the zoom buttons.
 */
import { usePaperScroller } from '@joint/react-plus';
import { clearSelection, useUiState } from '@/ui-state';
import { useRemoveFlow } from './board-actions';
import { useCard, useCards, useFlows } from './board-data';

const PILL_CLASS =
    'absolute left-1/2 top-3.5 flex -translate-x-1/2 items-center gap-2 rounded-full border border-accent bg-panel px-3.5 py-1.5 text-xs shadow-plate';

/** Says which card a click-click connection starts from, while it is armed. */
export function ConnectHint() {
    const connectFrom = useUiState((state) => state.connectFrom);
    const title = useCard(connectFrom)?.title ?? null;
    if (title === null) return null;
    return (
        <div className={PILL_CLASS} role="status">
            <span className="size-2 rounded-full bg-accent" aria-hidden />
            Connecting from <strong>{title}</strong>. Click another card, Esc cancels.
        </div>
    );
}

/** Names the selected flow and offers the one thing to do with it. */
export function SelectedFlowBar() {
    const selectedFlow = useUiState((state) => state.selectedFlow);
    const flows = useFlows();
    const cards = useCards();
    const flow = selectedFlow === null ? undefined : flows[selectedFlow];
    const label = flow ? `${cards[flow.source]?.title ?? '...'} → ${cards[flow.target]?.title ?? '...'}` : null;
    const removeFlow = useRemoveFlow();
    if (label === null || selectedFlow === null) return null;
    // A group, not a live region: live regions must not hold controls.
    return (
        <div className={PILL_CLASS} role="group" aria-label="Selected connection">
            <span className="size-2 rounded-full bg-accent" aria-hidden />
            Connection <strong className="max-w-[260px] truncate">{label}</strong>
            <button
                type="button"
                className="cursor-pointer rounded-full border border-control bg-transparent px-2.5 py-0.5 font-sans text-xs font-semibold text-ink hover:bg-paper"
                onClick={() => {
                    removeFlow(selectedFlow);
                    clearSelection();
                }}
            >
                Remove
            </button>
            <span className="text-subtle">Esc</span>
        </div>
    );
}

const ZOOM_STEP = 1.2;
const ZOOM_BUTTON_CLASS =
    'inline-flex size-8 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-ink hover:bg-paper';

/** Zoom glyphs drawn as strokes, so they sit on the button center, not a text baseline. */
function ZoomIcon({ kind }: Readonly<{ kind: 'out' | 'fit' | 'in' }>) {
    return (
        <svg viewBox="0 0 16 16" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden>
            {kind !== 'fit' && <path d="M3.5 8h9" />}
            {kind === 'in' && <path d="M8 3.5v9" />}
            {kind === 'fit' && (
                <>
                    <circle cx={8} cy={8} r={3.25} />
                    <path d="M8 1.75v2.5M8 11.75v2.5M1.75 8h2.5M11.75 8h2.5" />
                </>
            )}
        </svg>
    );
}

/** Zoom out, zoom to fit, zoom in. */
export function ZoomControls() {
    const { setZoom, zoomToFit } = usePaperScroller();
    return (
        <div
            className="absolute bottom-3.5 right-3.5 flex gap-1 rounded-full border border-edge bg-panel p-1 shadow-plate"
            role="group"
            aria-label="Zoom"
        >
            <button type="button" className={ZOOM_BUTTON_CLASS} aria-label="Zoom out" onClick={() => setZoom((zoom) => zoom / ZOOM_STEP)}>
                <ZoomIcon kind="out" />
            </button>
            <button
                type="button"
                className={ZOOM_BUTTON_CLASS}
                aria-label="Zoom to fit the playbook"
                onClick={() => zoomToFit({ contentMargin: 140, maxScale: 1.15 })}
            >
                <ZoomIcon kind="fit" />
            </button>
            <button type="button" className={ZOOM_BUTTON_CLASS} aria-label="Zoom in" onClick={() => setZoom((zoom) => zoom * ZOOM_STEP)}>
                <ZoomIcon kind="in" />
            </button>
        </div>
    );
}
