import { HTMLHost, useCellId } from '@joint/react-plus';
import type { NodeData } from '@/data/cells';

/*
 * The icons, as inline SVG inside the HTML.
 *
 * `fill="currentColor"` is the point: the colour comes from the CSS rule on the
 * surrounding element, so a theme change is a stylesheet edit rather than a
 * prop threaded down through every node. Authored on a 24x24 grid and sized by
 * CSS.
 */
function MessageIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
                fill="currentColor"
                d="M21 3.01H3c-1.1 0-2 .9-2 2V9h2V4.99h18v14.03H3V15H1v4.01c0 1.1.9 1.98 2 1.98h18c1.1 0 2-.88 2-1.98v-14c0-1.11-.9-2-2-2zM11 16l4-4-4-4v3H1v2h10v3z"
            />
        </svg>
    );
}

function ChevronIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
            />
        </svg>
    );
}

function PlayIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M8 5l11 7-11 7z" />
        </svg>
    );
}

function MessageNode({ label, caption }: { readonly label: string; readonly caption: string }) {
    return (
        <HTMLHost useModelGeometry className="node-card">
            <span className="node-badge"><MessageIcon /></span>
            <span className="node-text">
                <span className="node-title">{label}</span>
                <span className="node-caption">{caption}</span>
            </span>
            <span className="node-next"><ChevronIcon /></span>
        </HTMLHost>
    );
}

function StartNode({ label }: { readonly label: string }) {
    return (
        <HTMLHost useModelGeometry className="node-start">
            <PlayIcon />
            {/*
              * Sits above the disc, outside the element's own box. `HTMLHost`
              * puts `overflow="visible"` on the `foreignObject` it renders
              * into, so content is free to spill past the model geometry.
              */}
            <span className="node-start-label">{label}</span>
        </HTMLHost>
    );
}

/**
 * One node of the flowchart, as HTML.
 *
 * `<HTMLHost useModelGeometry>` renders the node into a `foreignObject` and
 * takes its size straight off the graph element — `useCell(selectElementSize)`
 * — instead of measuring the rendered content. That is the whole reason for the
 * flag here: the default host runs `useMeasureElement`, which would put a
 * `ResizeObserver` round trip for each of the 750 nodes between the graph
 * loading and the first route being computed. These cards are a fixed size per
 * kind, written onto the model in `cells.ts`, so there is nothing to find out.
 *
 * HTML rather than SVG buys the layout: flexbox places the badge, the text
 * column and the chevron, `text-overflow: ellipsis` truncates a long title, and
 * `box-shadow` draws the card's shadow. The SVG version had to do each of those
 * by hand — hard-coded offsets, a `V().text()` pass per label to find the
 * ellipsis, and a second offset rect standing in for the shadow. Styling lives
 * in `index.css`.
 *
 * `renderElement` hands over the element's `data` slice and nothing else, so
 * this never re-runs when a node is dragged — JointJS moves the rendered node
 * itself.
 */
export function RenderNode({ kind, label }: NodeData) {
    /*
     * The cell id, shown as the card's caption. A context read, not a store
     * subscription. Worth showing on a graph this size: it is what tells two
     * cards reading "Alpha" apart when you are looking at a route between them.
     */
    const id = useCellId();
    if (kind === 'start') return <StartNode label={label} />;
    return <MessageNode label={label} caption={String(id ?? '')} />;
}
