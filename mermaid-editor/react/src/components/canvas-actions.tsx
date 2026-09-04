import { useImageExport } from '@joint/react-plus';
import type { FlowDirection } from '@/mermaid/types';

/**
 * The canvas's action cluster: download as SVG and the auto-layout switch.
 * (The `.mmd` download lives in the editor pane's footer, with the source.)
 *
 * Deliberately not part of the zoom cluster: that is camera state, these act
 * on the document. It sits in the canvas's free corner, diagonally opposite
 * the zoom controls, so the two are not read as one toolbar — and clear of
 * the header's logo, which the previous top-right position crowded.
 *
 * Icons only for the downloads. Spelling them out made secondary actions the
 * loudest thing on the canvas. The layout switch is text: it is a *mode*, and
 * its current state has to be readable at a glance.
 *
 * SVG rather than a raster format — the diagram is vector all the way down.
 *
 * Computed styles have to be inlined, because every colour here comes from a
 * CSS variable that would not survive outside the page. The default `'full'`
 * mode copies *every* computed property though, which put 13 kB of
 * `accent-color`/`place-content`/`anchor-name` on each element and made a
 * ten-node export 1.4 MB. Naming the handful of properties that actually
 * describe the drawing takes the same export to 66 kB with no visible
 * difference.
 *
 * Font embedding is off for the same reason it is pointless here: the labels
 * use a `system-ui` stack, which resolves to whatever the reader already has.
 */
const PAINTED_PROPERTIES = [
    'fill',
    'fill-opacity',
    'stroke',
    'stroke-width',
    'stroke-opacity',
    'stroke-dasharray',
    'stroke-linecap',
    'stroke-linejoin',
    'opacity',
    'visibility',
    'font-family',
    'font-size',
    'font-style',
    'font-weight',
    'letter-spacing',
    'text-anchor',
    'dominant-baseline',
    'color',
];

const EXPORT = {
    type: 'image/svg+xml',
    embedFonts: false,
    useComputedStyles: { includeProperties: PAINTED_PROPERTIES },
} as const;
const DOWNLOAD_NAME = 'mermaid-diagram';

/** The four flowchart directions, with an arrow glyph pointing the flow. */
const DIRECTIONS: ReadonlyArray<{ readonly id: FlowDirection; readonly label: string; readonly glyph: string }> = [
    { id: 'TB', label: 'Top to bottom', glyph: '↓' },
    { id: 'BT', label: 'Bottom to top', glyph: '↑' },
    { id: 'LR', label: 'Left to right', glyph: '→' },
    { id: 'RL', label: 'Right to left', glyph: '←' },
];

export interface CanvasActionsProps {
    readonly autoLayout: boolean;
    readonly onAutoLayoutChange: (autoLayout: boolean) => void;
    readonly direction: FlowDirection;
    /** Rewrites the `flowchart <dir>` header in the source. */
    readonly onDirectionChange: (direction: FlowDirection) => void;
    /** Appends a top-level, unconnected node — the from-scratch start. */
    readonly onAddShape: () => void;
}

export function CanvasActions({
    autoLayout,
    onAutoLayoutChange,
    direction,
    onDirectionChange,
    onAddShape,
}: CanvasActionsProps) {
    const [exportSvg, state] = useImageExport(EXPORT);

    return (
        <div className="canvas-actions">
            <button
                type="button"
                className="app-button add-shape"
                aria-label="Add an unconnected shape"
                title="Add a shape — it lands unconnected, ready to reshape and wire up"
                onClick={onAddShape}
            >
                + Shape
            </button>
            <button
                type="button"
                className="app-button is-icon"
                disabled={state.isLoading}
                aria-label="Download as SVG"
                title={state.isError ? String(state.error) : 'Download as SVG'}
                onClick={() => {
                    // Rejects when the export fails; `state` already carries the
                    // error for the title above, so there is nothing to add.
                    void exportSvg({ downloadAs: DOWNLOAD_NAME }).catch(() => undefined);
                }}
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
                    <path d="M12 3.4v10.2m0 0 3.8-3.8M12 13.6l-3.8-3.8" />
                    <path d="M4.4 16.4v2.2a2 2 0 0 0 2 2h11.2a2 2 0 0 0 2-2v-2.2" />
                </svg>
            </button>
            <span className="canvas-direction" role="radiogroup" aria-label="Layout direction">
                {DIRECTIONS.map((entry) => (
                    <button
                        key={entry.id}
                        type="button"
                        role="radio"
                        aria-checked={direction === entry.id}
                        aria-label={`Lay out ${entry.label.toLowerCase()}`}
                        title={`${entry.label} (flowchart ${entry.id})`}
                        className={`app-button is-icon canvas-direction-option${direction === entry.id ? ' is-active' : ''}`}
                        onClick={() => onDirectionChange(entry.id)}
                    >
                        {entry.glyph}
                    </button>
                ))}
            </span>
            <button
                type="button"
                className="app-button layout-toggle"
                aria-pressed={!autoLayout}
                title={
                    autoLayout
                        ? 'Turn auto-layout off: drag nodes yourself, links route around them'
                        : 'Turn auto-layout back on — the layout re-runs and re-frames'
                }
                onClick={() => onAutoLayoutChange(!autoLayout)}
            >
                {autoLayout ? 'Auto layout' : 'Manual layout'}
            </button>
        </div>
    );
}
