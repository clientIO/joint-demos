import { dia, util } from '@joint/plus';
import { ElementModel } from '@joint/react-plus';

// Layout metrics shared by the shapes, the layout and the React components.
export const NODE_SIZE = { width: 120, height: 40 };
export const PARENT_GAP = 40;
export const SIBLING_GAP = 24;
/** How far the box of a group reaches beyond the link that runs down its side. A fork has no such link and no padding. */
export const GROUP_PADDING = 12;
/** How far left of its content the return link of a loop group runs; the box of the group is that much wider on each side. */
export const LOOP_GAP = SIBLING_GAP;
/** How much wider the button in the corner of an element makes it. */
export const WIDEN_BY = 20;
/** How far right of its content the line past the branch of an `if` group runs; the box is that much wider on each side. */
export const IF_GAP = SIBLING_GAP;

export const NODE_TYPE = 'Node';
export const GROUP_TYPE = 'Group';

export const COLORS = {
    node: { fill: '#FFFFFF', stroke: '#4666E5', text: '#222222' },
    gate: { fill: '#4666E5', stroke: '#4666E5', text: '#FFFFFF' },
    group: { fill: '#7A90EC', button: '#4666E5' },
    link: '#7A90EC',
    /** The paper behind a label, which the label covers the link with. */
    background: '#F3F7F6'
};

/**
 * The look of the one label of the diagram: `skip`, on the line that goes
 * past the branch of an `if` group. A chip drawn over the line - the built-in
 * background hugs the letters, which leaves the line showing through at their
 * edges - and centered on the line, which is where the label of a link sits
 * unless it is told otherwise.
 */
const LABEL_ATTRS = (text: string) => ({
    text: {
        text,
        fontFamily: 'sans-serif',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 0.3,
        fill: COLORS.group.button
    },
    rect: {
        x: 'calc(x - 7)',
        y: 'calc(y - 4)',
        width: 'calc(w + 14)',
        height: 'calc(h + 8)',
        rx: 9,
        ry: 9,
        fill: COLORS.background,
        stroke: COLORS.link,
        strokeWidth: 1
    }
});

export type NodeRole = 'start' | 'end';

/**
 * What a group stands in for: a fork of two branches that join again, a loop
 * whose end returns to its start, or an `if` - one branch, taken or skipped.
 */
export type GroupKind = 'fork' | 'loop' | 'if';

const GROUP_LABELS: Record<GroupKind, string> = { fork: 'Fork', loop: 'Loop', if: 'Condition' };

/** What a group of `kind` is called: the label of its start node, which is the group on the screen. */
export function getGroupLabel(kind: GroupKind): string {
    return GROUP_LABELS[kind];
}

/** The React-facing state of a node: what the component renders. */
export interface NodeData {
    label: string;
    role?: NodeRole;
}

/** The React-facing state of a group. */
export interface GroupData {
    kind: GroupKind;
    collapsed: boolean;
}

/**
 * A plain rectangle. The `start` and `end` of a group are nodes with a `role`.
 * Extends the React element model, so the paper mounts the `renderElement`
 * output into its view; the look lives in the `NodeView` component.
 */
export class Node extends ElementModel {

    defaults() {
        return {
            ...super.defaults(),
            type: NODE_TYPE,
            size: NODE_SIZE,
            data: { label: '' } satisfies NodeData
        };
    }

    static create(label: string, role?: NodeRole): Node {
        return new Node({ data: { label, role } satisfies NodeData });
    }

    /**
     * The end of a group: where its branches meet again, a point of the layout
     * and no part of the diagram. It is 0x0, so that the tree converges on it
     * exactly, and it renders nothing (see `cells.tsx`). The tools of a group
     * are on its start node.
     */
    static createEnd(): Node {
        const node = new Node({ data: { label: '', role: 'end' } satisfies NodeData });
        node.resize(0, 0);
        return node;
    }

    getData(): NodeData {
        return this.get('data') as NodeData;
    }

    getRole(): NodeRole | undefined {
        return this.getData().role;
    }

    /** The start and the end of a group are not editable. */
    isGate(): boolean {
        return this.getRole() !== undefined;
    }

    static isNode(cell: dia.Cell): cell is Node {
        return cell instanceof Node;
    }
}

/**
 * A container that stands in for a subgraph the tree cannot hold: a `start`
 * node, some content and an `end` node the content converges into. A
 * *fork* group holds two branches that join again. A *loop* group holds a
 * tree whose `end` links back to its `start` - the return path, a dashed
 * link up the left side of the group. An *if* group holds one branch and a
 * `no` line down the right side of the group, inside its box: the way past
 * the branch. The outer tree links connect to the group itself, but the group
 * is sized so that its top center is the top center of `start` and its bottom
 * center is the bottom center of `end` - the tree appears to connect to those
 * two nodes. Collapsed, it is sized to its `start` node alone, which is all
 * that is left of it on the screen: nothing changes shape or colour, the
 * content simply goes. Drawn by the `GroupView` component, and only while the
 * slabs are switched on.
 */
export class Group extends ElementModel {

    defaults() {
        return {
            ...super.defaults(),
            type: GROUP_TYPE,
            size: NODE_SIZE,
            data: { kind: 'fork', collapsed: false } satisfies GroupData
        };
    }

    static create(kind: GroupKind): Group {
        return new Group({ data: { kind, collapsed: false } satisfies GroupData });
    }

    getData(): GroupData {
        return this.get('data') as GroupData;
    }

    getKind(): GroupKind {
        return this.getData().kind;
    }

    isCollapsed(): boolean {
        return this.getData().collapsed;
    }

    toggle(collapsed: boolean = !this.isCollapsed()): void {
        this.set('data', { ...this.getData(), collapsed } satisfies GroupData);
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

/** The links keep their JointJS markup; only the elements are React. */
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

    /** Takes the arrow off a link that ends in a point of the layout, not at a node to arrive at. */
    withoutArrow(): this {
        this.attr('line/targetMarker', null);
        return this;
    }

    /**
     * A branch joining the flow again: from the leaf of a branch to the point
     * the branch converges on, or - labelled `skip` - from the start of an `if`
     * straight past its branch. The tree layout never sees it, a tree having
     * no two ways to a node (see `layout.ts`), and it carries no arrow.
     */
    static createJoin(source: dia.Element, target: dia.Element, label?: string): Link {
        const link = Link.create(source, target);
        if (label) link.labels([{ attrs: LABEL_ATTRS(label) }]);
        link.set('join', true);
        return link.withoutArrow();
    }

    /** Whether the link joins a branch back into the flow, rather than continuing the tree. */
    static isJoin(link: dia.Link): boolean {
        return Boolean(link.get('join'));
    }

}

export const cellNamespace = { Node, Group, Link };
