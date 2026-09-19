import { dia, util } from '@joint/plus';
import { ElementModel, LinkModel } from '@joint/react-plus';

// Layout metrics shared by the models, the layout and the React components.
/** The size of a pill before it is measured; its minimum afterwards (see `index.css`). */
const NODE_SIZE = { width: 160, height: 40 };
/** The start and the ends of the diagram are circles. */
const TERMINAL_SIZE = { width: 52, height: 52 };
/** The add button below a leaf of the tree, the same square as the insert button of a link. */
const ADD_BUTTON_SIZE = { width: 18, height: 18 };
export const INSERT_BUTTON_SIZE = 18;
/**
 * How far from its target the insert button of a link sits when something is
 * in the way below the source (see `getInsertButtonPoint()`); a layout metric
 * too, as the empty loop is sized around it.
 */
export const INSERT_BUTTON_FROM_TARGET = 30;
/** Vertical distance between a parent and its children; room enough for the insert button of the link between them. */
export const PARENT_GAP = 60;
export const SIBLING_GAP = 24;
/** Horizontal room a group keeps around its content in the tree that contains it. */
export const GROUP_PADDING = 12;

/** The links are drawn below the elements; the return link of a loop below the other links. */
const BACKWARD_LINK_Z = 0;
const LINK_Z = 1;
const ELEMENT_Z = 2;

export const COLORS = {
    background: '#F3F7F6',
    node: { fill: '#FFFFFF', stroke: '#4666E5', text: '#222222' },
    /** The fills of the start of the diagram and of its ends; red is kept for what is about to be deleted. */
    root: '#3C9A7A',
    terminal: '#2B3555',
    /** The pills that steer the flow: a decision, the start of a group. */
    gate: { fill: '#4666E5', stroke: '#4666E5', text: '#FFFFFF' },
    link: '#7A90EC',
    /** The add buttons: the blue of the nodes, marked in white. */
    button: { fill: '#4666E5', text: '#FFFFFF' },
    /** The frame around the selected element: a shade darker than the nodes. */
    selection: '#3552C4'
};

/**
 * What a group stands in for: a fork/join of two branches, or a loop whose
 * return path climbs back from the end to the start.
 */
export type GroupKind = 'fork' | 'loop';

/** The label of the start node of a group. */
export const GROUP_LABELS: Record<GroupKind, string> = {
    fork: 'Fork',
    loop: 'Loop'
};
export const DECISION_LABEL = 'Decision';

/**
 * The icon next to the label of the start of a group, drawn the way the
 * diagram draws the group itself: a fork is a stem that splits over a bar
 * into two drops with arrowheads; a loop is a circuit that runs down on the
 * right and back up on the left, with an arrowhead on the way back.
 */
export const GROUP_ICONS: Record<GroupKind, string> = {
    fork: 'M 0 -8 V -3 M -5 -3 H 5 M -5 -3 V 7 M 5 -3 V 7 M -7.5 4.5 L -5 7 L -2.5 4.5 M 2.5 4.5 L 5 7 L 7.5 4.5',
    loop: 'M -2 -6 H 6 V 6 H -6 V -1 M -8.5 1.5 L -6 -1 L -3.5 1.5'
};
/** The diamond of a flowchart decision. */
export const DECISION_ICON = 'M 0 -7 L 7 0 L 0 7 L -7 0 Z';
/** A card with two lines: a step. */
export const NODE_ICON = 'M -6 -6 H 6 V 6 H -6 Z M -3 -2 H 3 M -3 2 H 3';

/*
    The models. Each element is an `ElementModel` of `@joint/react`: a cell
    whose view is a portal for a React component (see `cells/`), with what
    the component renders in `data`. The models carry no markup and no
    attributes of their own; their size is measured from what React renders.
*/

/** The React-facing state of a step: its label and, as the case may be, the command it runs. */
export interface StepData {
    label: string;
    run?: string;
}

/** A step of the flow: a pill with a label and, below it, the command it runs. */
export class Step extends ElementModel {

    defaults() {
        return { ...super.defaults(), type: 'tbg.Step', z: ELEMENT_Z, size: NODE_SIZE };
    }

    static create(label: string, run?: string): Step {
        const data: StepData = run ? { label, run } : { label };
        return new Step({ data });
    }

    static isStep(cell: dia.Cell): cell is Step {
        return cell instanceof Step;
    }
}

/** The React-facing state of a decision: its label, and whether it has options - then its pill carries the button that adds another. */
export interface DecisionData {
    label: string;
    hasOptions: boolean;
}

/** A decision: a node of the tree that branches out - without a merge, unlike a fork. A filled pill with a diamond. */
export class Decision extends ElementModel {

    defaults() {
        return { ...super.defaults(), type: 'tbg.Decision', z: ELEMENT_Z, size: NODE_SIZE };
    }

    static create(label: string = DECISION_LABEL, hasOptions: boolean = false): Decision {
        const data: DecisionData = { label, hasOptions };
        return new Decision({ data });
    }

    static isDecision(cell: dia.Cell): cell is Decision {
        return cell instanceof Decision;
    }
}

/** The React-facing state of the start of a group: the kind of the group, and whether it is collapsed. */
export interface GroupStartData {
    kind: GroupKind;
    collapsed: boolean;
}

/**
 * The start of a group: a filled pill labelled with the kind of the group,
 * with the icon of the kind and the collapse/expand button of the group on
 * its bottom edge. The start of a fork also carries, at its right end, the
 * button that adds a branch. When the group is collapsed the start stays
 * visible in its place and stands in for it.
 */
export class GroupStart extends ElementModel {

    defaults() {
        return { ...super.defaults(), type: 'tbg.GroupStart', z: ELEMENT_Z, size: NODE_SIZE };
    }

    static create(kind: GroupKind, collapsed: boolean = false): GroupStart {
        const data: GroupStartData = { kind, collapsed };
        return new GroupStart({ data });
    }

    getKind(): GroupKind {
        return (this.get('data') as GroupStartData).kind;
    }

    static isGroupStart(cell: dia.Cell): cell is GroupStart {
        return cell instanceof GroupStart;
    }
}

/**
 * The end of a group: a point without size and without a picture. The paths
 * of the group converge into it, and the tree continues from it. Not an
 * `ElementModel`: it has nothing for React to render, and the paper shows
 * a link only once the React content of both of its ends is mounted - an
 * element without a portal counts as mounted.
 */
export class GroupEnd extends dia.Element {

    preinitialize() {
        this.markup = [];
    }

    defaults() {
        return util.defaultsDeep({ type: 'tbg.GroupEnd', z: ELEMENT_Z, size: { width: 0, height: 0 } }, super.defaults);
    }

    static create(): GroupEnd {
        return new GroupEnd();
    }

    /** The group the end closes. */
    getGroup(): Group {
        const group = this.getParentCell();
        if (!group || !Group.isGroup(group)) throw new Error(`The end ${this.id} is not in a group.`);
        return group;
    }

    static isGroupEnd(cell: dia.Cell): cell is GroupEnd {
        return cell instanceof GroupEnd;
    }
}

/** The gates of a group: the nodes the paths of the group run between. */
export type Gate = GroupStart | GroupEnd;

export function isGate(cell: dia.Cell): cell is Gate {
    return cell instanceof GroupStart || cell instanceof GroupEnd;
}

/** The start of the diagram, its root: a green circle. */
export class Start extends ElementModel {

    defaults() {
        return { ...super.defaults(), type: 'tbg.Start', z: ELEMENT_Z, size: TERMINAL_SIZE };
    }

    static create(): Start {
        return new Start();
    }

    static isStart(cell: dia.Cell): cell is Start {
        return cell instanceof Start;
    }
}

/** An end of the diagram: a dark circle, a leaf nothing can follow. */
export class End extends ElementModel {

    defaults() {
        return { ...super.defaults(), type: 'tbg.End', z: ELEMENT_Z, size: TERMINAL_SIZE };
    }

    static create(): End {
        return new End();
    }

    static isEnd(cell: dia.Cell): cell is End {
        return cell instanceof End;
    }
}

/**
 * The add button below a leaf of the tree: an element of the graph, linked
 * from the leaf, so that the tree layout places it like a child. A click on
 * it opens the add menu for the leaf. Every element without a successor has
 * one - a step, or a group nothing follows; it goes away as soon as the
 * element gets a child. The buttons are derived by the build (see `data/build.ts`).
 */
export class AddButton extends ElementModel {

    defaults() {
        return { ...super.defaults(), type: 'tbg.AddButton', z: ELEMENT_Z, size: ADD_BUTTON_SIZE };
    }

    static isAddButton(cell: dia.Cell): cell is AddButton {
        return cell instanceof AddButton;
    }
}

/**
 * A container that stands in for a subgraph the tree layout cannot handle:
 * a `start` node, content of a `kind` (branches, or a loop) and an `end`
 * node. The outer tree links connect to the group itself, but the group is
 * positioned and sized from its `start` to its `end`, and the links are
 * anchored on those two gates (see `gateAnchor`) - the tree appears to
 * connect to them. The group is never rendered: the paper's `cellVisibility`
 * hides it, so it is only a node of the layout. Not an `ElementModel`: no
 * React content (see `GroupEnd`).
 *
 * A collapsed group shrinks to the size of a node and hides its content. Its
 * `start` node, labelled with the kind of the group, stays visible in its
 * place and stands in for it.
 */
export class Group extends dia.Element {

    preinitialize() {
        // Never rendered; a valid markup nonetheless.
        this.markup = [];
    }

    defaults() {
        return util.defaultsDeep({ type: 'tbg.Group', z: ELEMENT_Z, size: NODE_SIZE, kind: 'fork' satisfies GroupKind, collapsed: false }, super.defaults);
    }

    static create(kind: GroupKind): Group {
        return new Group({ kind });
    }

    getKind(): GroupKind {
        return this.get('kind');
    }

    isCollapsed(): boolean {
        return Boolean(this.get('collapsed'));
    }

    getStart(): GroupStart {
        const start = this.getEmbeddedCells().find(GroupStart.isGroupStart);
        if (!start) throw new Error(`Group ${this.id} has no start.`);
        return start;
    }

    /**
     * The vertical axis the tree connects to the group on: the common axis of
     * its gates. A collapsed group is a plain node, connected in its middle.
     */
    getAxisX(): number {
        return this.isCollapsed() ? this.getBBox().center().x : this.getStart().getBBox().center().x;
    }

    getEnd(): GroupEnd {
        const end = this.getEmbeddedCells().find(GroupEnd.isGroupEnd);
        if (!end) throw new Error(`Group ${this.id} has no end.`);
        return end;
    }

    static isGroup(cell: dia.Cell): cell is Group {
        return cell instanceof Group;
    }
}

const LINK_WIDTH = 1.5;

const TARGET_MARKER = {
    type: 'path',
    d: 'M 8 -4 0 0 8 4 Z',
    fill: COLORS.link,
    stroke: COLORS.link
};

/**
 * The React-facing state of a link: whether it runs against the flow (the
 * return link of a loop, which shows an arrow in its middle) and the name of
 * the option it leads to, for a link from a decision or from the start of a
 * fork (see `nameOptions()` in `layout/index.ts`).
 */
export interface LinkData {
    backward?: boolean;
    optionName?: string;
}

/**
 * A link of the tree: a `LinkModel` of `@joint/react`, drawn by JointJS -
 * the line, with a copy in the color of the background right below it, so
 * that where two links run on top of each other the gaps of a dashed one
 * show the background - with its buttons and labels rendered by React (see
 * `link-view.tsx`).
 */
export class Link extends LinkModel {

    defaults() {
        return {
            ...super.defaults(),
            type: 'tbg.Link',
            z: LINK_Z,
            attrs: {
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
        };
    }

    static create(source: dia.Element, target: dia.Element): Link {
        const link = new Link({ source: { id: source.id }});
        link.connectTo(target);
        return link;
    }

    /**
     * Points the link at `target`. A link into the `end` of a group or into
     * an add button has no arrowhead: neither is a step.
     */
    connectTo(target: dia.Element): void {
        this.target({ id: target.id });
        if (GroupEnd.isGroupEnd(target) || AddButton.isAddButton(target)) {
            this.removeAttr('line/targetMarker');
        } else {
            this.attr('line/targetMarker', TARGET_MARKER);
        }
    }

    getData(): LinkData {
        return (this.get('data') ?? {}) as LinkData;
    }

    private setData(change: Partial<LinkData>): void {
        // A new object: the React records of the graph change by identity.
        this.set('data', { ...this.getData(), ...change });
    }

    /** Names the link as an option of a decision or a fork (`option 1`, `option 2`, ...), or takes the name off. */
    setOptionName(name: string | null): void {
        if (this.isBackward()) return;
        this.setData({ optionName: name ?? undefined });
    }

    /** Whether a link from `source` to `target` is the return link of a loop: from its `end` back to its `start`. */
    static isReturnLink(source: dia.Element, target: dia.Element): boolean {
        return GroupEnd.isGroupEnd(source) && GroupStart.isGroupStart(target);
    }

    /**
     * A link that runs against the flow of the tree - the return link of a
     * loop - is dashed and lies below the other links, so that a link
     * crossing it runs over it. It has no arrowhead: its end merges into
     * another link; an arrow in its middle, rendered by React, shows the way.
     */
    setBackward(backward: boolean): void {
        this.set({ z: backward ? BACKWARD_LINK_Z : LINK_Z });
        this.setData({ backward });
        // The stylesheet of `@joint/react` styles the line through CSS, which
        // beats a `stroke-dasharray` attribute: the dashes come from a class.
        this.attr('line/class', backward ? 'jj-link-line backward' : 'jj-link-line');
        if (backward) this.removeAttr('line/targetMarker');
    }

    isBackward(): boolean {
        return Boolean(this.getData().backward);
    }
}

export const cellNamespace = {
    tbg: { Step, Decision, Start, End, GroupStart, GroupEnd, Group, AddButton, Link }
};
