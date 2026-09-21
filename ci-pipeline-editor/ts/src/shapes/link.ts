import { connectors, dia, g, util } from '@joint/plus';

import { AddButtonModel } from './add-button';
import { BACKWARD_LINK_Z, COLORS, LINK_Z } from './constants';
import { GroupEndModel, GroupStartModel } from './group';
import { LABEL_FONT_FAMILY, measureText } from './pill';

const LINK_WIDTH = 1.5;
/** The routes of the layout are orthogonal; the corners are rounded. */
const CONNECTOR_ARGS = { cornerType: 'cubic', cornerRadius: 6 } as const;

const TARGET_MARKER = {
    type: 'path',
    d: 'M 8 -4 0 0 8 4 Z',
    fill: COLORS.link,
    stroke: COLORS.link
};

/**
 * The name above the insert button of a link to an option of a decision or a
 * fork (`Staging`) - bold, in the blue of the nodes, on a
 * tinted chip, so that it stands out from the lines. The only label a link
 * has; the insert button is a link tool (see `placeLinkTools()`).
 */
const BRANCH_LABEL_INDEX = 0;
/** The name sits above the insert button, centered on the line - a few pixels clear of the button; the chip covers the line behind it. */
export const BRANCH_LABEL_OFFSET_ALONG = -22;
const BRANCH_FONT_SIZE = 12;
const BRANCH_FONT_WEIGHT = 600;
const BRANCH_FONT = `${BRANCH_FONT_WEIGHT} ${BRANCH_FONT_SIZE}px ${LABEL_FONT_FAMILY}`;
const BRANCH_CHIP = { fill: '#E8EDFF', paddingX: 6, height: 18, radius: 4 };
const BRANCH_LABEL = {
    markup: util.svg/* xml */`
        <rect @selector="branchChip"/>
        <text @selector="branchText"/>
    `,
    attrs: {
        branchChip: {
            y: -BRANCH_CHIP.height / 2,
            height: BRANCH_CHIP.height,
            rx: BRANCH_CHIP.radius,
            ry: BRANCH_CHIP.radius,
            fill: BRANCH_CHIP.fill,
            pointerEvents: 'none'
        },
        branchText: {
            x: 0,
            fontFamily: LABEL_FONT_FAMILY,
            fontSize: BRANCH_FONT_SIZE,
            fontWeight: BRANCH_FONT_WEIGHT,
            fill: COLORS.node.stroke,
            textAnchor: 'middle',
            textVerticalAnchor: 'middle',
            pointerEvents: 'none'
        }
    },
    position: { distance: 0.5 }
};

/**
 * The arrow on the return link of a loop, in the middle of the link and
 * turned along it (`keepGradient`): the link has no arrowhead at its end,
 * which merges into another link.
 */
const RETURN_ARROW_LABEL = {
    markup: util.svg/* xml */`
        <path @selector="arrow"/>
    `,
    attrs: {
        arrow: {
            d: 'M -7 -6 L 5 0 L -7 6 Z',
            fill: COLORS.link,
            stroke: COLORS.background,
            strokeWidth: 1.5,
            pointerEvents: 'none'
        }
    },
    position: { distance: 0.5, args: { keepGradient: true, ensureLegibility: false }}
};

export class LinkModel extends dia.Link {

    defaults() {
        return util.defaultsDeep({
            type: 'tbg.Link',
            z: LINK_Z,
            connector: { name: 'straight', args: CONNECTOR_ARGS },
            attrs: {
                // A copy of the line in the color of the background, right
                // below it: where two links run on top of each other, the
                // gaps of a dashed one show the background, not the other link.
                wrapper: {
                    connection: true,
                    stroke: COLORS.background,
                    strokeWidth: LINK_WIDTH,
                    fill: 'none'
                },
                line: {
                    connection: true,
                    stroke: COLORS.link,
                    strokeWidth: LINK_WIDTH,
                    strokeLinejoin: 'round',
                    fill: 'none',
                    targetMarker: TARGET_MARKER
                }
            }
        }, super.defaults);
    }

    preinitialize() {
        this.markup = util.svg/* xml */`
            <path @selector="wrapper"/>
            <path @selector="line"/>
        `;
    }

    static create(source: dia.Element, target: dia.Element): LinkModel {
        const link = new LinkModel({ source: { id: source.id }});
        link.connectTo(target);
        return link;
    }

    /**
     * Points the link at `target`. A link into the `end` of a group or into
     * an add button has no arrowhead: neither is a step.
     */
    connectTo(target: dia.Element): void {
        this.target({ id: target.id });
        if (GroupEndModel.isGroupEnd(target) || AddButtonModel.isAddButton(target)) {
            this.removeAttr('line/targetMarker');
        } else {
            this.attr('line/targetMarker', TARGET_MARKER);
        }
    }

    /**
     * Names the link as an option of a decision or a fork (`Staging`), with
     * a text next to its insert button, or removes the name.
     */
    setOptionName(name: string | null): void {
        // The return link of a loop has a label of its own, the arrow, and no name.
        if (this.isBackward()) return;
        const labels = this.labels();
        if (name === null) {
            if (labels.length > BRANCH_LABEL_INDEX) this.labels(labels.slice(0, BRANCH_LABEL_INDEX));
            return;
        }
        if (labels.length <= BRANCH_LABEL_INDEX) {
            this.label(BRANCH_LABEL_INDEX, util.cloneDeep(BRANCH_LABEL));
        }
        this.prop(['labels', BRANCH_LABEL_INDEX, 'attrs', 'branchText', 'text'], name);
        // The chip fits the name, centered on the line.
        const width = Math.ceil(measureText(name, BRANCH_FONT)) + 2 * BRANCH_CHIP.paddingX;
        this.prop(['labels', BRANCH_LABEL_INDEX, 'attrs', 'branchChip'], { width, x: -width / 2 });
    }

    /** Whether a link from `source` to `target` is the return link of a loop: from its `end` back to its `start`. */
    static isReturnLink(source: dia.Element, target: dia.Element): boolean {
        return GroupEndModel.isGroupEnd(source) && GroupStartModel.isGroupStart(target);
    }

    /**
     * A link that runs against the flow of the tree - the return link of a
     * loop - is dashed and lies below the other links, so that a link
     * crossing it runs over it. It has no arrowhead: its end merges into
     * another link; an arrow in its middle shows the way instead.
     */
    setBackward(backward: boolean): void {
        this.set({ backward, z: backward ? BACKWARD_LINK_Z : LINK_Z });
        this.attr('line/strokeDasharray', backward ? '6 4' : 'none');
        if (backward) {
            this.removeAttr('line/targetMarker');
            this.labels([util.cloneDeep(RETURN_ARROW_LABEL)]);
        }
    }

    isBackward(): boolean {
        return Boolean(this.get('backward'));
    }

    /**
     * The connection of the link as the paper renders it, from the models
     * alone - nothing has to be rendered first: the anchor of each end
     * (`center` unless the layout set one; see `anchorGroupLinks()`),
     * clipped to the box of its element like the paper's `bbox` connection
     * point does, the vertices of the layout in between - `points` - and
     * `path`, the connector run over them, corners rounded.
     */
    getConnection(): { points: g.Point[]; path: g.Path } {
        const source = this.getSourceElement()!;
        const target = this.getTargetElement()!;
        const vertices = this.vertices().map((vertex) => new g.Point(vertex));
        const sourceAnchor = getAnchorPoint(source, this.source().anchor);
        const targetAnchor = getAnchorPoint(target, this.target().anchor);
        const sourcePoint = clipToElement(source, sourceAnchor, vertices[0] ?? targetAnchor);
        const targetPoint = clipToElement(target, targetAnchor, vertices[vertices.length - 1] ?? sourceAnchor);
        const path = connectors.straight(sourcePoint, targetPoint, vertices, { ...CONNECTOR_ARGS, raw: true }) as g.Path;
        return { points: [sourcePoint, ...vertices, targetPoint], path };
    }
}

/** The anchor of an end on `element`: its center, or the middle of its top or bottom edge, moved by `dx`, `dy` - the anchors this app uses, read from the models. */
function getAnchorPoint(element: dia.Element, anchor: dia.Link.EndJSON['anchor']): g.Point {
    const bbox = element.getBBox();
    const { dx = 0, dy = 0 } = (anchor?.args ?? {}) as { dx?: number; dy?: number };
    const point = anchor?.name === 'top' ? bbox.topMiddle() : anchor?.name === 'bottom' ? bbox.bottomMiddle() : bbox.center();
    return point.offset(dx, dy);
}

/** Where the line from `reference` to `anchor` enters the box of `element` - the anchor itself when it lies on the edge, or outside. */
function clipToElement(element: dia.Element, anchor: g.Point, reference: g.Point): g.Point {
    const intersections = new g.Line(reference, anchor).intersect(element.getBBox());
    return intersections ? reference.chooseClosest(intersections)! : anchor;
}
