import { HTMLHost } from '@joint/react-plus';
import type { NodeData } from '@/data/cells';
import { STATUS_LABEL } from '@/theme';

/** The service's initials, as the card's avatar. */
function mark(name: string): string {
    return name.slice(0, 2).toUpperCase();
}

/**
 * The high level of detail: the whole record, as HTML.
 *
 * This is the expensive one, and deliberately so — it is what the node would
 * look like if the diagram only ever had a few dozen of them. A `foreignObject`
 * per node, a flex layout, a gradient, a shadow, a transition and five text
 * runs the browser has to lay out and hyphenate. None of that is wasted at 60%
 * zoom and up, where you can read it; all of it is wasted at 15%, where the
 * whole card is 39 pixels wide.
 *
 * `useModelGeometry` takes the box straight off the graph element rather than
 * measuring the rendered content — so switching to this level never resizes the
 * node, and the link ends do not move when you zoom in.
 */
export function ServiceCard({ name, group, region, latencyMs, load, status }: NodeData) {
    return (
        <HTMLHost useModelGeometry className={`service-card is-${status}`}>
            <span className="service-mark">{mark(name)}</span>
            <span className="service-body">
                <span className="service-name">{name}</span>
                <span className="service-meta">{group} · {region}</span>
                <span className="service-load">
                    {/* The only inline style on the card: the bar's width is data. */}
                    <span className="service-load-fill" style={{ width: `${Math.round(load * 100)}%` }} />
                </span>
            </span>
            <span className="service-numbers">
                <span className="service-latency">{latencyMs}<small> ms</small></span>
                <span className="service-pill">{STATUS_LABEL[status]}</span>
            </span>
        </HTMLHost>
    );
}
