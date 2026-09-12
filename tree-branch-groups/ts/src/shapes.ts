import { dia, util } from '@joint/plus';

// Layout metrics shared by the shapes and the layout.
export const NODE_SIZE = { width: 120, height: 40 };
export const PARENT_GAP = 40;
export const SIBLING_GAP = 24;
/** Horizontal breathing room of an expanded group. Vertically it fits its start and end exactly. */
export const GROUP_PADDING = 12;
export const COLLAPSED_SIZE = { width: 160, height: NODE_SIZE.height };

/** Custom paper event triggered by the collapse/expand button of a group. */
export const TOGGLE_EVENT = 'element:group:toggle';

const COLORS = {
    node: { fill: '#FFFFFF', stroke: '#4666E5', text: '#222222' },
    gate: { fill: '#4666E5', stroke: '#4666E5', text: '#FFFFFF' },
    group: { fill: '#F7F9FF', stroke: '#7A90EC', header: '#4666E5' },
    link: '#7A90EC'
};

/** The stroke of an expanded group; also the right margin of the button of a collapsed one. */
const GROUP_STROKE_WIDTH = 25;
const BUTTON_SIZE = 18;

const EXPANDED_ICON = 'M -4 0 4 0';
const COLLAPSED_ICON = 'M -4 0 4 0 M 0 -4 0 4';

export type NodeRole = 'start' | 'end';

const nodeMarkup = util.svg/* xml */`
    <rect @selector="body"/>
    <text @selector="label"/>
`;

/** A plain rectangle. The `start` and `end` of a group are nodes with a `role`. */
export class Node extends dia.Element {

    preinitialize() {
        this.markup = nodeMarkup;
    }

    defaults() {
        return util.defaultsDeep({
            type: 'tbg.Node',
            size: NODE_SIZE,
            attrs: {
                body: {
                    width: 'calc(w)',
                    height: 'calc(h)',
                    rx: 4,
                    ry: 4,
                    strokeWidth: 1.5,
                    stroke: COLORS.node.stroke,
                    fill: COLORS.node.fill
                },
                label: {
                    x: 'calc(w / 2)',
                    y: 'calc(h / 2)',
                    textAnchor: 'middle',
                    textVerticalAnchor: 'middle',
                    fontFamily: 'sans-serif',
                    fontSize: 13,
                    fill: COLORS.node.text
                }
            }
        }, super.defaults);
    }

    static create(label: string, role?: NodeRole): Node {
        const node = new Node({ role });
        node.attr('label/text', label);
        if (role) {
            node.attr({
                body: { fill: COLORS.gate.fill, stroke: COLORS.gate.stroke, rx: 20, ry: 20 },
                label: { fill: COLORS.gate.text }
            });
        }
        return node;
    }

    getRole(): NodeRole | undefined {
        return this.get('role');
    }

    /** The start and the end of a group are not editable. */
    isGate(): boolean {
        return this.getRole() !== undefined;
    }

    static isNode(cell: dia.Cell): cell is Node {
        return cell instanceof Node;
    }
}

const groupMarkup = util.svg/* xml */`
    <rect @selector="body"/>
    <text @selector="header"/>
    <rect @selector="button"/>
    <path @selector="buttonIcon"/>
`;

/** The look of a group in each of its states: a translucent slab, expanded or shrunk to a node. */
const EXPANDED_ATTRS = {
    // A translucent slab: the wide stroke of the same color makes it a bit
    // bigger than the box spanned by the start and end nodes.
    body: {
        fill: COLORS.group.stroke,
        stroke: COLORS.group.stroke,
        strokeWidth: GROUP_STROKE_WIDTH,
        strokeDasharray: 'none',
        opacity: 0.2,
        pointerEvents: 'none'
    },
    header: { display: 'none' },
    // The button sits in the top right corner.
    button: { x: `calc(w - ${BUTTON_SIZE})`, y: 0, 'aria-label': 'Collapse the branches', 'aria-expanded': 'true' },
    buttonIcon: { d: EXPANDED_ICON, transform: `translate(calc(w - ${BUTTON_SIZE / 2}), ${BUTTON_SIZE / 2})` }
};
const COLLAPSED_ATTRS = {
    // The same slab, shrunk to a labelled node - without the stroke.
    body: {
        fill: COLORS.group.stroke,
        stroke: 'none',
        strokeWidth: 0,
        strokeDasharray: 'none',
        opacity: 0.3,
        pointerEvents: 'auto'
    },
    header: { display: null },
    // The button is centered vertically, next to the label.
    button: { x: `calc(w - ${BUTTON_SIZE + GROUP_STROKE_WIDTH / 2})`, y: `calc(h / 2 - ${BUTTON_SIZE / 2})`, 'aria-label': 'Expand the branches', 'aria-expanded': 'false' },
    buttonIcon: { d: COLLAPSED_ICON, transform: `translate(calc(w - ${BUTTON_SIZE / 2 + GROUP_STROKE_WIDTH / 2}), calc(h / 2))` }
};

/**
 * A container that stands in for a fork/join subgraph in the tree:
 * a `start` node, two branches and an `end` node they converge into.
 * The outer tree links connect to the group itself, but the group is
 * sized so that its top center is the top center of `start` and its
 * bottom center is the bottom center of `end` - the tree appears to
 * connect to those two nodes. The group is drawn as a translucent slab.
 */
export class Group extends dia.Element {

    preinitialize() {
        this.markup = groupMarkup;
    }

    defaults() {
        return util.defaultsDeep({
            type: 'tbg.Group',
            size: COLLAPSED_SIZE,
            collapsed: false,
            attrs: {
                body: {
                    width: 'calc(w)',
                    height: 'calc(h)',
                    rx: 6,
                    ry: 6,
                    ...EXPANDED_ATTRS.body
                },
                header: {
                    // Centered in the space left of the button.
                    x: `calc(w / 2 - ${(BUTTON_SIZE + GROUP_STROKE_WIDTH) / 2})`,
                    y: 'calc(h / 2)',
                    textVerticalAnchor: 'middle',
                    textAnchor: 'middle',
                    fontFamily: 'sans-serif',
                    fontSize: 12,
                    fontWeight: 'bold',
                    fill: COLORS.group.header,
                    text: 'Branches',
                    ...EXPANDED_ATTRS.header
                },
                button: {
                    event: TOGGLE_EVENT,
                    cursor: 'pointer',
                    // A focusable control: Enter and Space are handled by the app.
                    role: 'button',
                    tabindex: 0,
                    width: BUTTON_SIZE,
                    height: BUTTON_SIZE,
                    rx: 3,
                    ry: 3,
                    fill: COLORS.group.header,
                    ...EXPANDED_ATTRS.button
                },
                buttonIcon: {
                    stroke: '#FFFFFF',
                    strokeWidth: 2,
                    pointerEvents: 'none',
                    ...EXPANDED_ATTRS.buttonIcon
                }
            }
        }, super.defaults);
    }

    isCollapsed(): boolean {
        return Boolean(this.get('collapsed'));
    }

    toggle(collapsed: boolean = !this.isCollapsed()): void {
        if (collapsed === this.isCollapsed()) return;
        this.attr(collapsed ? COLLAPSED_ATTRS : EXPANDED_ATTRS);
        this.set('collapsed', collapsed);
    }

    getStart(): Node {
        return this.getGate('start');
    }

    getEnd(): Node {
        return this.getGate('end');
    }

    protected getGate(role: NodeRole): Node {
        const gate = this.getEmbeddedCells().find((cell) => Node.isNode(cell) && cell.getRole() === role);
        if (!gate) throw new Error(`Group ${this.id} has no ${role} node.`);
        return gate as Node;
    }

    static isGroup(cell: dia.Cell): cell is Group {
        return cell instanceof Group;
    }
}

export class Link extends dia.Link {

    defaults() {
        return util.defaultsDeep({
            type: 'tbg.Link',
            attrs: {
                line: {
                    connection: true,
                    stroke: COLORS.link,
                    strokeWidth: 1.5,
                    strokeLinejoin: 'round',
                    fill: 'none',
                    targetMarker: {
                        type: 'path',
                        d: 'M 8 -4 0 0 8 4 Z',
                        fill: COLORS.link,
                        stroke: COLORS.link
                    }
                }
            }
        }, super.defaults);
    }

    preinitialize() {
        this.markup = util.svg/* xml */`
            <path @selector="line"/>
        `;
    }

    static create(source: dia.Element, target: dia.Element): Link {
        return new Link({
            source: { id: source.id },
            target: { id: target.id }
        });
    }
}

export const cellNamespace = {
    tbg: { Node, Group, Link }
};
