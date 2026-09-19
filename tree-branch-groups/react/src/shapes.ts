import { dia, util } from '@joint/plus';
import { ElementModel } from '@joint/react-plus';

// Layout metrics shared by the shapes, the layout and the React components.
export const NODE_SIZE = { width: 120, height: 40 };
/** The `end` of a group is a small round button. */
export const END_SIZE = { width: 24, height: 24 };
export const PARENT_GAP = 40;
export const SIBLING_GAP = 24;
/** Horizontal room a group keeps around its content in the tree that contains it. */
export const GROUP_PADDING = 12;

export const NODE_TYPE = 'tbg.Node';
export const GROUP_TYPE = 'tbg.Group';

export const COLORS = {
    node: { fill: '#FFFFFF', stroke: '#4666E5', text: '#222222' },
    gate: { fill: '#4666E5', stroke: '#4666E5', text: '#FFFFFF' },
    link: '#7A90EC'
};

export type NodeRole = 'start' | 'end';

/**
 * What a group stands in for: a fork/join of two branches, or a loop whose
 * return path climbs back from the end to the start.
 */
export type GroupKind = 'branch' | 'cycle';

/** The label of the start node of a group. */
export const GROUP_LABELS: Record<GroupKind, string> = {
    branch: 'Branch',
    cycle: 'Loop'
};

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
 * A plain rectangle. The `start` and `end` of a group are nodes with a
 * `role`: the `start` is a pill labelled with the kind of the group, the
 * `end` a small round button with a plus - hovering it shows what can be
 * added below the group. Extends the React element model, so the paper
 * mounts the `renderElement` output into its view; the look lives in the
 * `NodeView` component.
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
        return new Node({
            size: role === 'end' ? END_SIZE : NODE_SIZE,
            data: { label, role } satisfies NodeData
        });
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
 * A container that stands in for a subgraph the tree layout cannot handle:
 * a `start` node, content of a `kind` (two branches, or a cycle) and an
 * `end` node. The outer tree links connect to the group itself, but the
 * group is positioned and sized from its `start` to its `end`, and the links
 * are anchored on those two gates (see `gateAnchor`) - the tree appears to
 * connect to them. The group is never rendered: the paper's `cellVisibility`
 * hides it, so it is only a node of the layout.
 *
 * A collapsed group shrinks to the size of a node and hides its content. Its
 * `start` node, labelled with the kind of the group, stays visible in its
 * place and stands in for it.
 *
 * The content of each kind is created and laid out by its own module
 * (`branch-group.ts`, `cycle-group.ts`); the group only knows its gates.
 */
export class Group extends ElementModel {

    defaults() {
        return {
            ...super.defaults(),
            type: GROUP_TYPE,
            size: NODE_SIZE,
            data: { kind: 'branch', collapsed: false } satisfies GroupData
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
        if (collapsed === this.isCollapsed()) return;
        this.set('data', { ...this.getData(), collapsed } satisfies GroupData);
    }

    getStart(): Node {
        return this.getGate('start');
    }

    /**
     * The vertical axis the tree connects to the group on: the common axis of
     * its gates. A collapsed group is a plain node, connected in its middle.
     */
    getAxisX(): number {
        return this.isCollapsed() ? this.getBBox().center().x : this.getStart().getBBox().center().x;
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
            type: 'tbg.Link',
            attrs: {
                // A wide, invisible copy of the line: the hover target of the link tools.
                wrapper: {
                    connection: true,
                    stroke: 'transparent',
                    strokeWidth: 12,
                    fill: 'none'
                },
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
            <path @selector="wrapper"/>
            <path @selector="line"/>
        `;
    }

    /** A link into the `end` of a group has no arrowhead: the `end` is a button, not a step. */
    static create(source: dia.Element, target: dia.Element): Link {
        const link = new Link({
            source: { id: source.id },
            target: { id: target.id }
        });
        if (Node.isNode(target) && target.getRole() === 'end') link.removeAttr('line/targetMarker');
        return link;
    }

    /** A link that runs against the flow of the tree - on the return path of a cycle - is dashed. */
    setBackward(backward: boolean): void {
        this.attr('line/strokeDasharray', backward ? '6 4' : 'none');
    }
}

export const cellNamespace = {
    tbg: { Node, Group, Link }
};
