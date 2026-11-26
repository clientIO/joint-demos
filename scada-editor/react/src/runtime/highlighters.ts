import { dia, highlighters, V } from '@joint/plus';
import type { CellKey } from '../plant/plant';
import { tagOf } from '../plant/plant';
import { specOf } from '../shapes/registry';
import { isShapeData } from '../shapes/shape-data';
import type { DiagramStyle } from '../shapes/style';
import { controlReach, labelReach, seenDrawing, type ElementShape } from './placement';

/*
 * What run mode shows on the cells of the paper without changing them: JointJS highlighters on their views (the
 * paper of `usePaper()`) - nothing of the diagram changes, the drawing of a cell stays as React renders it.
 * - a ping: two rings out of the middle of an element, behind it, growing and fading (a message of the log);
 * - the marker: an arrow pointing at a cell (the message clicked in the log), upright, clear of its drawing;
 * - the ID badges: the tag of a cell in a pill (while Alt is held);
 * - classes: the cells dimmed by the log, the cells a click filters the log by.
 */

const SCREEN = 'Screen';
const GROUP = 'Group';

/** The shape of the element of the view as the placement reads it, if it is a shape. */
function elementShapeOf(model: dia.Cell): ElementShape | null {
    const data: unknown = model.get('data');
    const spec = isShapeData(data) ? specOf(data.kind) : undefined;
    if (!model.isElement() || !spec || !isShapeData(data)) {
        return null;
    }
    return { spec, data, size: model.size(), angle: model.angle() };
}

/** The tag of the cell, if it has one. */
export function tagOfCell(model: dia.Cell): string | undefined {
    const data: unknown = model.get('data');
    return isShapeData(data) ? tagOf(data) : undefined;
}

/** A highlighter moved with its element but not rotated with it: in the coordinates of the element as it is seen. */
abstract class UprightHighlighter extends dia.HighlighterView {
    protected transform(): void {
        const { transformGroup, cellView } = this;
        const { model } = cellView;
        // A link: in the coordinates of the paper already
        if (!transformGroup || !model.isElement()) {
            return;
        }
        const { x, y } = model.position();
        transformGroup.attr('transform', `translate(${x},${y})`);
    }
}

// --- Ping ---

// How long a ping lasts (ms): as its rings in `runtime.css` (the second one starting later)
const PING_DURATION = 1400;
// How far the rings of a ping reach out of the element (at their largest)
const PING_REACH = 16;

/** An option of a highlighter added with it (`add()` takes any options). */
function optionOf(options: object, key: string): unknown {
    return Object.entries(options).find(([name]) => name === key)?.[1];
}

class Ping extends dia.HighlighterView {
    preinitialize(): void {
        this.tagName = 'g';
        this.attributes = { class: 'scada-ping', 'pointer-events': 'none' };
    }

    protected highlight(cellView: dia.CellView): void {
        const { width, height } = cellView.model.getBBox();
        const r = Math.hypot(width, height) / 2 + PING_REACH;
        const option = optionOf(this.options, 'color');
        const color = typeof option === 'string' ? option : MARKER_COLOR;
        const ring = () => V('circle', { cx: width / 2, cy: height / 2, r, fill: color, 'fill-opacity': 0.2, stroke: color, 'stroke-width': 3 });
        this.vel.empty().append([ring(), ring()]);
    }
}

/** The element pinged in the color (again from the start if it is pinged by the id now). */
export function ping(paper: dia.Paper, element: dia.Element, color: string, id: string): void {
    const view = element.findView(paper);
    if (!view) {
        return;
    }
    Ping.remove(view, id);
    // Behind the drawing: the first child of the view
    const added = Ping.add(view, 'root', id, { layer: null, z: 0, color });
    window.setTimeout(() => {
        if (Ping.get(view, id) === added) {
            Ping.remove(view, id);
        }
    }, PING_DURATION);
}

/** The pings of the id removed. */
export function removePings(paper: dia.Paper, id: string): void {
    dia.HighlighterView.removeAll(paper, id);
}

// --- Marker ---

const MARKER_ID = 'marker';
// The arrow: the width of its head, of its shaft, its height (the tip at the bottom), the height of its head, how
// far above the drawing of the element its tip is
const ARROW_WIDTH = 40;
const SHAFT_WIDTH = 16;
const ARROW_HEIGHT = 52;
const HEAD_HEIGHT = 24;
const ARROW_GAP = 4;
// Of none of the states (the selection and the updates blue, the commands amber, the alarms red)
export const MARKER_COLOR = 'var(--run-marker)';

/** The outline of the arrow pointing down: its tip at (0, 0). */
const ARROW_PATH = (() => {
    const [head, shaft] = [ARROW_WIDTH / 2, SHAFT_WIDTH / 2];
    return `M 0 0 L ${-head} ${-HEAD_HEIGHT} H ${-shaft} V ${-ARROW_HEIGHT} H ${shaft} V ${-HEAD_HEIGHT} H ${head} Z`;
})();

/** The top of the area run mode shows (the screen), if the diagram has one. */
function screenTopOf(graph: dia.Graph | null): number | undefined {
    const screen = graph?.getElements().find((element) => {
        const data: unknown = element.get('data');
        return isShapeData(data) && data.kind === SCREEN;
    });
    return screen?.getBBox().y;
}

const isDiagramStyle = (value: unknown): value is DiagramStyle => typeof value === 'object' && value !== null;

class Marker extends UprightHighlighter {
    preinitialize(): void {
        this.tagName = 'g';
        this.attributes = { class: 'scada-marker', 'pointer-events': 'none' };
    }

    protected highlight(cellView: dia.CellView): void {
        const { x, y, isUp } = this.tip(cellView);
        this.vel.empty().append(
            // Pointing up: mirrored
            V('g', { transform: `translate(${x},${y})${isUp ? ' scale(1,-1)' : ''}` }).append(
                V('path', { class: 'scada-marker-arrow', d: ARROW_PATH, fill: MARKER_COLOR, stroke: 'var(--shape-canvas, var(--color-canvas))', 'stroke-width': 2, 'stroke-linejoin': 'round' }),
            ),
        );
    }

    /**
     * Where the tip of the arrow is (in the coordinates of an element, of the paper for a link) and whether it
     * points up: the middle of a link; above the middle of an element - clear of its drawing, its label and its
     * control on top - or below it (clear of them below) if the arrow would leave the screen above.
     */
    protected tip(cellView: dia.CellView): { readonly x: number; readonly y: number; readonly isUp: boolean } {
        if (cellView instanceof dia.LinkView) {
            const { x, y } = cellView.getPointAtRatio(0.5);
            return { x, y, isUp: false };
        }
        const { model } = cellView;
        const shape = elementShapeOf(model);
        if (!shape || !model.isElement()) {
            return { x: 0, y: 0, isUp: false };
        }
        const option = optionOf(this.options, 'style');
        const style = isDiagramStyle(option) ? option : {};
        const drawing = seenDrawing(shape);
        const middle = drawing.x + drawing.width / 2;
        const above = drawing.y - Math.max(labelReach(shape, 'top', style), controlReach(shape, 'top')) - ARROW_GAP;
        const screenTop = screenTopOf(model.graph);
        if (screenTop === undefined || model.position().y + above - ARROW_HEIGHT >= screenTop) {
            return { x: middle, y: above, isUp: false };
        }
        const below = drawing.y + drawing.height + Math.max(labelReach(shape, 'bottom', style), controlReach(shape, 'bottom')) + ARROW_GAP;
        return { x: middle, y: below, isUp: true };
    }
}

/** The cell marked (an element flashed too: a ping in the color of the marker), or none: the one before unmarked. */
export function setMarker(paper: dia.Paper, cell: dia.Cell | null, style: DiagramStyle): void {
    dia.HighlighterView.removeAll(paper, MARKER_ID);
    const view = cell?.findView(paper);
    if (!cell || !view) {
        return;
    }
    Marker.add(view, 'root', MARKER_ID, { layer: dia.Paper.Layers.FRONT, z: 2, style });
    if (cell.isElement()) {
        ping(paper, cell, MARKER_COLOR, `${MARKER_ID}-flash`);
    }
}

// --- ID badges ---

const TAG_BADGE_ID = 'tag-badge';
// The badge: its font (monospace: its width from the number of the characters), its padding and height
const BADGE_FONT_SIZE = 11;
const BADGE_CHAR_WIDTH = 6.7;
const BADGE_PADDING = 8;
const BADGE_HEIGHT = 20;

/**
 * Where the badge of the width is: the middle of an element (of its box as it is seen too: rotated around it);
 * the top left corner of a group (its middle is a member); the middle of the route of a link (a conveyor).
 */
function badgeCenter(cellView: dia.CellView, badgeWidth: number): dia.Point {
    if (cellView instanceof dia.LinkView) {
        return cellView.getPointAtRatio(0.5);
    }
    const data: unknown = cellView.model.get('data');
    if (isShapeData(data) && data.kind === GROUP) {
        return { x: badgeWidth / 2, y: 0 };
    }
    const { width, height } = cellView.model.getBBox();
    return { x: width / 2, y: height / 2 };
}

/** The tag of a cell: a pill in the middle of it (the text of the page inverted, outlined in the canvas color). */
class TagBadge extends UprightHighlighter {
    preinitialize(): void {
        this.tagName = 'g';
        this.attributes = { 'pointer-events': 'none', class: 'scada-tag-badge' };
    }

    protected highlight(cellView: dia.CellView): void {
        const tag = tagOfCell(cellView.model) ?? '';
        const width = tag.length * BADGE_CHAR_WIDTH + 2 * BADGE_PADDING;
        const { x, y } = badgeCenter(cellView, width);
        this.vel.empty().append([
            V('rect', { x: x - width / 2, y: y - BADGE_HEIGHT / 2, width, height: BADGE_HEIGHT, rx: BADGE_HEIGHT / 2, fill: 'var(--color-ink)', stroke: 'var(--shape-canvas, var(--color-canvas))', 'stroke-width': 2 }),
            V('text', {
                x,
                y,
                'text-anchor': 'middle',
                'font-family': 'var(--font-mono, ui-monospace, monospace)',
                'font-size': BADGE_FONT_SIZE,
                'font-weight': 600,
                fill: 'var(--color-paper)',
            }).text(tag, { textVerticalAnchor: 'middle' }),
        ]);
    }
}

/** A badge on every cell with an ID (the ones before removed). */
export function showTagBadges(paper: dia.Paper): void {
    hideTagBadges(paper);
    paper.model.getCells().filter((cell) => tagOfCell(cell)).forEach((cell) => {
        const view = cell.findView(paper);
        if (view) {
            TagBadge.add(view, 'root', TAG_BADGE_ID, { layer: dia.Paper.Layers.FRONT, z: 1 });
        }
    });
}

export function hideTagBadges(paper: dia.Paper): void {
    dia.HighlighterView.removeAll(paper, TAG_BADGE_ID);
}

// --- Classes ---

const DIM_ID = 'dim';
const CLICKABLE_ID = 'log-clickable';
const CLICKABLE_CLASS = 'scada-log-clickable';

/** Whether the browser is Safari (its engine: on iOS every browser): it does not draw CSS filters on SVG. */
function isSafari(): boolean {
    const { userAgent } = navigator;
    return /AppleWebKit/.test(userAgent) && !/Chrome|Chromium|Edg|Android/.test(userAgent);
}

/** A dimmed cell: gray and flat - in the background (its shapes still read); faded in Safari. */
export const DIMMED_CLASS = isSafari() ? 'scada-faded' : 'scada-grayed';

/** The cells of the paper dimmed (the ones dimmed before not any more); never the screen. */
export function dimCells(paper: dia.Paper, ids: ReadonlySet<CellKey>): void {
    highlighters.addClass.removeAll(paper, DIM_ID);
    ids.forEach((id) => {
        const cell = paper.model.getCell(id);
        const data: unknown = cell?.get('data');
        const view = cell?.findView(paper);
        if (view && !(isShapeData(data) && data.kind === SCREEN)) {
            highlighters.addClass.add(view, 'root', DIM_ID, { className: DIMMED_CLASS });
        }
    });
}

/** The cells with an ID marked as clickable (a click filters the log by them), or none. */
export function markClickable(paper: dia.Paper, isMarked: boolean): void {
    highlighters.addClass.removeAll(paper, CLICKABLE_ID);
    if (!isMarked) {
        return;
    }
    paper.model.getCells().filter((cell) => tagOfCell(cell)).forEach((cell) => {
        const view = cell.findView(paper);
        if (view) {
            highlighters.addClass.add(view, 'root', CLICKABLE_ID, { className: CLICKABLE_CLASS });
        }
    });
}
