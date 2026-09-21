import { dia, util } from '@joint/plus';

// Layout metrics shared by the shapes and the layout.
export const NODE_SIZE = { width: 120, height: 40 };
export const PARENT_GAP = 40;
export const SIBLING_GAP = 24;
/** Horizontal breathing room of an expanded group. Vertically it fits its start and end exactly. */
export const GROUP_PADDING = 12;
export const COLLAPSED_SIZE = { width: 160, height: NODE_SIZE.height };
/** How far left of the box of a loop group its return link runs; a sibling on the left is kept that much further away. */
export const LOOP_GAP = SIBLING_GAP;

const COLORS = {
    node: { fill: '#FFFFFF', stroke: '#4666E5', text: '#222222' },
    gate: { fill: '#4666E5', stroke: '#4666E5', text: '#FFFFFF' },
    group: { fill: '#F7F9FF', stroke: '#7A90EC', header: '#4666E5' },
    link: '#7A90EC'
};

/** The stroke of an expanded group. */
const GROUP_STROKE_WIDTH = 12;

export type NodeRole = 'start' | 'end';

/** What a group stands in for: a fork of two branches that join again, or a loop whose end returns to its start. */
export type GroupKind = 'fork' | 'loop';

const GROUP_LABELS: Record<GroupKind, string> = { fork: 'Fork', loop: 'Loop' };

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
            type: 'Node',
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
    header: { display: 'none' }
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
    header: { display: null }
};

/**
 * A container that stands in for a subgraph the tree cannot hold: a `start`
 * node, some content and an `end` node the content converges into. A
 * *fork* group holds two branches that join again. A *loop* group holds a
 * tree whose `end` links back to its `start` - the return path, a dashed
 * link up the left side of the group. The outer tree links connect to the
 * group itself, but the group is sized so that its top center is the top
 * center of `start` and its bottom center is the bottom center of `end` -
 * the tree appears to connect to those two nodes. The group is drawn as a
 * translucent slab; its toggle is a tool (see `tools.ts`).
 */
export class Group extends dia.Element {

    preinitialize() {
        this.markup = groupMarkup;
    }

    defaults() {
        return util.defaultsDeep({
            type: 'Group',
            size: COLLAPSED_SIZE,
            kind: 'fork',
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
                    x: 'calc(w / 2)',
                    y: 'calc(h / 2)',
                    textVerticalAnchor: 'middle',
                    textAnchor: 'middle',
                    fontFamily: 'sans-serif',
                    fontSize: 12,
                    fontWeight: 'bold',
                    fill: COLORS.group.header,
                    text: 'Fork',
                    ...EXPANDED_ATTRS.header
                }
            }
        }, super.defaults);
    }

    static create(kind: GroupKind): Group {
        const group = new Group({ kind });
        group.attr('header/text', GROUP_LABELS[kind]);
        return group;
    }

    getKind(): GroupKind {
        return this.get('kind');
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
            type: 'Link',
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

    /** The return link of a loop group, from its `end` back to its `start`: dashed, as it runs against the flow. */
    static createReturn(source: dia.Element, target: dia.Element): Link {
        const link = Link.create(source, target);
        link.attr('line/strokeDasharray', '6 4');
        return link;
    }
}

export const cellNamespace = { Node, Group, Link };
