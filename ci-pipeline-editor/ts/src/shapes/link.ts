import { dia, util } from '@joint/plus';

import { AddButtonModel } from './add-button';
import { BACKWARD_LINK_Z, COLORS, LINK_Z } from './constants';
import { GroupEndModel, GroupStartModel } from './group';
import { LABEL_FONT_FAMILY, measureText } from './pill';

const LINK_WIDTH = 1.5;

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

/**
 * Where a link meets an element: the box of the model, not of the view - a
 * view may not be rendered yet when the link is routed, the paper being
 * frozen for the layout.
 */
const LINK_CONNECTION_POINT = { name: 'bbox', args: { useModelGeometry: true }};

export class LinkModel extends dia.Link {

    defaults() {
        return util.defaultsDeep({
            type: 'tbg.Link',
            z: LINK_Z,
            // The routes of the layout are orthogonal; the corners are rounded.
            connector: { name: 'straight', args: { cornerType: 'cubic', cornerRadius: 6 }},
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
        const link = new LinkModel({ source: { id: source.id, connectionPoint: LINK_CONNECTION_POINT }});
        link.connectTo(target);
        return link;
    }

    /**
     * Points the link at `target`. A link into the `end` of a group or into
     * an add button has no arrowhead: neither is a step.
     */
    connectTo(target: dia.Element): void {
        this.target({ id: target.id, connectionPoint: LINK_CONNECTION_POINT });
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
}
