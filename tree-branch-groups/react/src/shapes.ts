import { dia, util } from '@joint/plus';
import { ElementModel } from '@joint/react-plus';

// Layout metrics shared by the shapes, the layout and the React components.
export const NODE_SIZE = { width: 120, height: 40 };
export const PARENT_GAP = 40;
export const SIBLING_GAP = 24;
/** Horizontal breathing room of an expanded group. Vertically it fits its start and end exactly. */
export const GROUP_PADDING = 12;
export const COLLAPSED_SIZE = { width: 160, height: NODE_SIZE.height };

export const NODE_TYPE = 'tbg.Node';
export const GROUP_TYPE = 'tbg.Group';

export const COLORS = {
    node: { fill: '#FFFFFF', stroke: '#4666E5', text: '#222222' },
    gate: { fill: '#4666E5', stroke: '#4666E5', text: '#FFFFFF' },
    group: { fill: '#7A90EC', button: '#4666E5' },
    link: '#7A90EC'
};

export type NodeRole = 'start' | 'end';

/** The React-facing state of a node: what the component renders. */
export interface NodeData {
    label: string;
    role?: NodeRole;
}

/** The React-facing state of a group. */
export interface GroupData {
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
 * A container that stands in for a fork/join subgraph in the tree:
 * a `start` node, two branches and an `end` node they converge into.
 * The outer tree links connect to the group itself, but the group is
 * sized so that its top center is the top center of `start` and its
 * bottom center is the bottom center of `end` - the tree appears to
 * connect to those two nodes. Drawn by the `GroupView` component.
 */
export class Group extends ElementModel {

    defaults() {
        return {
            ...super.defaults(),
            type: GROUP_TYPE,
            size: COLLAPSED_SIZE,
            data: { collapsed: false } satisfies GroupData
        };
    }

    getData(): GroupData {
        return this.get('data') as GroupData;
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
