import { util } from '@joint/plus';
import type { dia } from '@joint/plus';
import { getActiveLevel } from './detail';
import type { DetailLevel } from './detail';
import { LevelOfDetailView } from './level-of-detail-view';
import { getServiceData } from './shapes';
import {
    CARD_BORDER_COLOR,
    DARK_COLOR,
    MUTED_COLOR,
    STATUS_COLOR,
    STATUS_LABEL,
    STATUS_SOFT,
    STATUS_TINT,
    TRACK_COLOR
} from './theme';

/** The card's fixed inner layout, in the element's own coordinates. */
const PADDING = 12;
const MARK_SIZE = 42;
const TEXT_X = PADDING + MARK_SIZE + 12;
const BAR_WIDTH = 120;
const PILL_WIDTH = 64;
const PILL_HEIGHT = 18;

/**
 * The three markups, parsed once per level and cloned per element.
 *
 * The node counts are the point of the whole demo: ten SVG elements for the
 * card, five for the chip, one for the block. Nothing here is a smaller
 * version of the level above it - each one draws what is legible at its own
 * zoom and nothing else.
 */
const MARKUP: Record<DetailLevel, dia.MarkupJSON> = {
    high: util.svg/* xml */`
        <rect @selector="body" rx="10" ry="10" />
        <rect @selector="mark" rx="12" ry="12" />
        <text @selector="markText" text-anchor="middle" dominant-baseline="central" />
        <text @selector="name" dominant-baseline="central" />
        <text @selector="meta" dominant-baseline="central" />
        <rect @selector="track" rx="2.5" ry="2.5" />
        <rect @selector="fill" rx="2.5" ry="2.5" />
        <text @selector="latency" text-anchor="end" dominant-baseline="central" />
        <rect @selector="pill" rx="9" ry="9" />
        <text @selector="pillText" text-anchor="middle" dominant-baseline="central" />
    `,
    medium: util.svg/* xml */`
        <rect @selector="body" rx="10" ry="10" />
        <rect @selector="stripe" rx="10" ry="10" />
        <rect @selector="stripeEdge" />
        <text @selector="name" dominant-baseline="central" />
        <text @selector="latency" dominant-baseline="central" />
    `,
    low: util.svg/* xml */`
        <rect @selector="body" rx="8" ry="8" />
    `
};

/** The service's initials, as the card's avatar. */
function initials(name: string): string {
    return name.slice(0, 2).toUpperCase();
}

/**
 * A service, drawn at whichever level of detail the zoom calls for.
 *
 * Everything about *when* to swap markup lives in `LevelOfDetailView`; this
 * class is only the six methods that say what each level looks like, plus the
 * policy that picks one. That split is the point: to draw something else at
 * three levels of detail, this is the file you write.
 */
export class ServiceView extends LevelOfDetailView {

    /**
     * The zoom decides, through the shared thresholds - and `getActiveLevel()`
     * is what lets the toolbar pin a level for every view at once.
     */
    protected getLevel(): DetailLevel {
        const { paper } = this;
        // `CellView.paper` is typed nullable; a view being updated always has one.
        return getActiveLevel(paper ? paper.scale().sx : 1);
    }

    protected renderHigh(): void {
        this.renderJSONMarkup(MARKUP.high);
    }

    protected renderMedium(): void {
        this.renderJSONMarkup(MARKUP.medium);
    }

    protected renderLow(): void {
        this.renderJSONMarkup(MARKUP.low);
    }

    /** The whole record: avatar, name, group and region, load bar, latency, status. */
    protected updateHigh(): void {
        const { width, height } = this.model.size();
        const data = getServiceData(this.model);
        const parts = this.selectors;
        const color = STATUS_COLOR[data.status];

        setRect(parts.body, 0, 0, width, height, { fill: '#FFFFFF', stroke: CARD_BORDER_COLOR, 'stroke-width': '1' });
        setRect(parts.mark, PADDING, (height - MARK_SIZE) / 2, MARK_SIZE, MARK_SIZE, { fill: color });
        setText(parts.markText, initials(data.name), PADDING + MARK_SIZE / 2, height / 2, {
            fill: '#FFFFFF', 'font-size': '15', 'font-weight': '700', 'font-family': 'sans-serif'
        });
        setText(parts.name, data.name, TEXT_X, 34, {
            fill: DARK_COLOR, 'font-size': '14', 'font-weight': '600', 'font-family': 'ui-monospace, Menlo, monospace'
        });
        setText(parts.meta, `${data.group} · ${data.region}`, TEXT_X, 53, {
            fill: MUTED_COLOR, 'font-size': '12', 'font-family': 'sans-serif'
        });
        setRect(parts.track, TEXT_X, 66, BAR_WIDTH, 5, { fill: TRACK_COLOR });
        setRect(parts.fill, TEXT_X, 66, BAR_WIDTH * data.load, 5, { fill: color });
        setText(parts.latency, `${data.latencyMs} ms`, width - PADDING, 36, {
            fill: DARK_COLOR, 'font-size': '16', 'font-weight': '600', 'font-family': 'sans-serif'
        });
        setRect(parts.pill, width - PADDING - PILL_WIDTH, 52, PILL_WIDTH, PILL_HEIGHT, {
            fill: STATUS_SOFT[data.status]
        });
        setText(parts.pillText, STATUS_LABEL[data.status], width - PADDING - PILL_WIDTH / 2, 52 + PILL_HEIGHT / 2, {
            fill: color, 'font-size': '11', 'font-weight': '600', 'font-family': 'sans-serif'
        });
    }

    /** The two things still legible between 25% and 60%: the name and the status colour. */
    protected updateMedium(): void {
        const { width, height } = this.model.size();
        const data = getServiceData(this.model);
        const parts = this.selectors;
        const color = STATUS_COLOR[data.status];

        setRect(parts.body, 0, 0, width, height, { fill: '#FFFFFF', stroke: color, 'stroke-width': '2' });
        // The status stripe down the leading edge: a rounded rect for the left
        // corners, a square one to cut off the right ones.
        setRect(parts.stripe, 0, 0, 22, height, { fill: color });
        setRect(parts.stripeEdge, 12, 0, 10, height, { fill: color });
        setText(parts.name, data.name, 38, height / 2 - 9, {
            fill: DARK_COLOR, 'font-size': '20', 'font-weight': '600', 'font-family': 'sans-serif'
        });
        setText(parts.latency, `${data.latencyMs} ms`, 38, height / 2 + 20, {
            fill: color, 'font-size': '17', 'font-family': 'sans-serif'
        });
    }

    /** Position and colour, which is all that survives below 25%. */
    protected updateLow(): void {
        const { width, height } = this.model.size();
        const data = getServiceData(this.model);
        // No stroke: a 2px border at 0.1 scale is a fifth of a pixel.
        setRect(this.selectors.body, 0, 0, width, height, { fill: STATUS_TINT[data.status] });
    }
}

function setRect(
    node: Element | undefined,
    x: number,
    y: number,
    width: number,
    height: number,
    attrs: Record<string, string>
): void {
    if (!node) return;
    node.setAttribute('x', `${x}`);
    node.setAttribute('y', `${y}`);
    node.setAttribute('width', `${Math.max(0, width)}`);
    node.setAttribute('height', `${Math.max(0, height)}`);
    for (const name in attrs) node.setAttribute(name, attrs[name]);
}

function setText(
    node: Element | undefined,
    text: string,
    x: number,
    y: number,
    attrs: Record<string, string>
): void {
    if (!node) return;
    node.setAttribute('x', `${x}`);
    node.setAttribute('y', `${y}`);
    node.textContent = text;
    for (const name in attrs) node.setAttribute(name, attrs[name]);
}
