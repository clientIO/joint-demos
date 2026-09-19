import { dia, util } from '@joint/plus';

// Layout metrics shared by the shapes and the layout.
export const NODE_SIZE = { width: 120, height: 40 };
/** The `end` of a group has no size: it is the point the paths of the group converge into. */
export const END_SIZE = { width: 0, height: 0 };
/** The add button below a leaf of the tree, the same square as the insert button of a link. */
export const ADD_BUTTON_SIZE = { width: 18, height: 18 };
/**
 * How far from its target the insert button of a link sits when something is
 * in the way below the source (see `placeLinkTools()`); a layout metric too,
 * as the empty loop is sized around it.
 */
export const INSERT_BUTTON_FROM_TARGET = 30;
const PLUS_ICON = 'M -4 0 4 0 M 0 -4 0 4';
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
    /** The outline of the root of the diagram and of its terminals; red is kept for what is about to be deleted. */
    root: '#2E9E5B',
    terminal: '#4A5470',
    gate: { fill: '#4666E5', stroke: '#4666E5', text: '#FFFFFF' },
    link: '#7A90EC'
};

/**
 * The roles of the special nodes. The `start` and `end` are the gates of a
 * group; a `decision` is a node of the tree that branches out - without a
 * merge, unlike a fork - and carries a button that adds children to it; a
 * `terminal` is an end of the diagram, a leaf nothing can follow.
 */
export type NodeRole = 'start' | 'end' | 'decision' | 'terminal';

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

const nodeMarkup = util.svg/* xml */`
    <rect @selector="body"/>
    <path @selector="kindIcon"/>
    <text @selector="label"/>
    <circle @selector="toggle"/>
    <path @selector="toggleIcon"/>
    <rect @selector="addButton"/>
    <path @selector="addIcon"/>
`;

/** The selector of the add button at the right end of a `decision` or the `start` of a fork; a click on it is recognized by it. */
export const ADD_BUTTON_SELECTOR = 'addButton';

/**
 * The icon next to the label of the `start` of a group, drawn the way the
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
/** A card with two lines: a plain node, a step. */
export const NODE_ICON = 'M -6 -6 H 6 V 6 H -6 Z M -3 -2 H 3 M -3 2 H 3';
/** The icon sits at the left end of the pill, the label is centered in the rest. */
const KIND_ICON_X = 18;
const KIND_LABEL_OFFSET = 9;

/** Custom paper event triggered by the collapse/expand button on the `start` of a group. */
export const TOGGLE_EVENT = 'element:group:toggle';
const TOGGLE_RADIUS = 11;
const COLLAPSE_ICON = 'M -4 0 4 0';
const EXPAND_ICON = 'M -4 0 4 0 M 0 -4 0 4';

/**
 * A plain rectangle. The `start` and `end` of a group are nodes with a
 * `role`: the `start` is a pill labelled with the kind of the group, an icon
 * of the kind next to the label and the collapse/expand button of the group
 * on its bottom edge - all a part of the markup; the `end` an invisible
 * point without size -
 * the paths of the group converge into it, and the tree continues from it.
 */
export class Node extends dia.Element {

    preinitialize() {
        this.markup = nodeMarkup;
    }

    defaults() {
        return util.defaultsDeep({
            type: 'tbg.Node',
            z: ELEMENT_Z,
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
                },
                // The icon of the kind of a group; only its `start` shows it.
                kindIcon: {
                    display: 'none',
                    transform: `translate(${KIND_ICON_X}, calc(h / 2))`,
                    stroke: COLORS.gate.text,
                    strokeWidth: 1.5,
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round',
                    fill: 'none',
                    pointerEvents: 'none'
                },
                // The collapse/expand button; only the `start` of a group shows it.
                // Inverted colors, so that it stands out on the pill.
                toggle: {
                    display: 'none',
                    cx: 'calc(w / 2)',
                    cy: 'calc(h)',
                    r: TOGGLE_RADIUS,
                    fill: COLORS.gate.text,
                    stroke: COLORS.gate.fill,
                    strokeWidth: 1.5,
                    cursor: 'pointer',
                    event: TOGGLE_EVENT,
                    'data-tooltip': 'Collapse'
                },
                toggleIcon: {
                    display: 'none',
                    transform: 'translate(calc(w / 2), calc(h))',
                    stroke: COLORS.gate.fill,
                    strokeWidth: 2,
                    fill: 'none',
                    pointerEvents: 'none'
                },
                // The button that adds a sibling option to a `decision`, or a
                // branch to a fork: at the right end of the pill, apart from the
                // "add below" and "insert" buttons, which sit on the links.
                [ADD_BUTTON_SELECTOR]: {
                    display: 'none',
                    x: `calc(w - ${ADD_BUTTON_SIZE.width / 2})`,
                    y: `calc(h / 2 - ${ADD_BUTTON_SIZE.height / 2})`,
                    width: ADD_BUTTON_SIZE.width,
                    height: ADD_BUTTON_SIZE.height,
                    rx: 3,
                    ry: 3,
                    fill: COLORS.gate.fill,
                    stroke: COLORS.gate.text,
                    strokeWidth: 1.5,
                    cursor: 'pointer'
                },
                addIcon: {
                    display: 'none',
                    d: PLUS_ICON,
                    transform: 'translate(calc(w), calc(h / 2))',
                    stroke: COLORS.gate.text,
                    strokeWidth: 2,
                    fill: 'none',
                    pointerEvents: 'none'
                }
            }
        }, super.defaults);
    }

    static create(label: string, role?: NodeRole): Node {
        const node = new Node({ role });
        node.attr('label/text', label);
        if (role && role !== 'terminal') {
            node.attr({
                body: { fill: COLORS.gate.fill, stroke: COLORS.gate.stroke, rx: 'calc(h / 2)', ry: 'calc(h / 2)' },
                label: { fill: COLORS.gate.text }
            });
        } else {
            // A plain node (or a terminal): the step icon in the color of its border.
            node.attr({
                kindIcon: { display: null, d: NODE_ICON, stroke: COLORS.node.stroke },
                label: { x: `calc(w / 2 + ${KIND_LABEL_OFFSET})` }
            });
        }
        if (role === 'end') {
            node.resize(END_SIZE.width, END_SIZE.height);
            node.attr({ body: { display: 'none' }, label: { display: 'none' }});
        }
        return node;
    }

    /**
     * The `start` of a group of the given kind: a pill labelled with the kind,
     * with its icon next to the label and the collapse/expand button of the
     * group on its bottom edge.
     */
    static createStart(kind: GroupKind): Node {
        const node = Node.create(GROUP_LABELS[kind], 'start');
        node.attr({
            kindIcon: { display: null, d: GROUP_ICONS[kind] },
            label: { x: `calc(w / 2 + ${KIND_LABEL_OFFSET})` },
            toggle: { display: null },
            toggleIcon: { display: null, d: COLLAPSE_ICON }
        });
        if (kind === 'fork') {
            // A fork takes more branches: the button at its right end adds one.
            node.attr([ADD_BUTTON_SELECTOR, 'data-tooltip'], 'Add a branch');
            node.setAddButtonVisible(true);
        }
        return node;
    }

    /** The root of the diagram: a plain node labelled `Start`, outlined in green. */
    static createRoot(): Node {
        const node = Node.create('Start');
        node.attr({ body: { stroke: COLORS.root }, kindIcon: { stroke: COLORS.root }});
        return node;
    }

    /** An end of the diagram: a node labelled `End`, outlined in red, that nothing can follow. */
    static createTerminal(): Node {
        const node = Node.create('End', 'terminal');
        node.attr({ body: { stroke: COLORS.terminal }, kindIcon: { stroke: COLORS.terminal }});
        return node;
    }

    /**
     * A decision: a pill labelled `Decision`, with a diamond next to the label
     * and, at its right end, the button that adds a sibling option (shown
     * once it has a child, see `setAddButtonVisible()`).
     */
    static createDecision(): Node {
        const node = Node.create(DECISION_LABEL, 'decision');
        node.attr({
            kindIcon: { display: null, d: DECISION_ICON },
            label: { x: `calc(w / 2 + ${KIND_LABEL_OFFSET})` },
            [ADD_BUTTON_SELECTOR]: { 'data-tooltip': 'Add an option' }
        });
        return node;
    }

    /**
     * Shows or hides the button at the right end of a pill that adds a sibling
     * option to a `decision` or a branch to a fork. A decision shows it once
     * it has a child; with none, it is a leaf with the usual add button below.
     */
    setAddButtonVisible(visible: boolean): void {
        this.attr({
            [ADD_BUTTON_SELECTOR]: { display: visible ? null : 'none' },
            addIcon: { display: visible ? null : 'none' }
        });
    }

    /** Flips the icon and the tooltip of the collapse/expand button of a `start` node. */
    setCollapsedIcon(collapsed: boolean): void {
        this.attr({
            toggle: { 'data-tooltip': collapsed ? 'Expand' : 'Collapse' },
            toggleIcon: { d: collapsed ? EXPAND_ICON : COLLAPSE_ICON }
        });
    }

    getRole(): NodeRole | undefined {
        return this.get('role');
    }

    /** The start and the end of a group: the nodes the paths of the group run between. */
    isGate(): boolean {
        const role = this.getRole();
        return role === 'start' || role === 'end';
    }

    isDecision(): boolean {
        return this.getRole() === 'decision';
    }

    isTerminal(): boolean {
        return this.getRole() === 'terminal';
    }

    static isNode(cell: dia.Cell): cell is Node {
        return cell instanceof Node;
    }
}

/**
 * The add button below a leaf of the tree: an element of the graph, linked
 * from the leaf, so that the tree layout places it like a child. A click on
 * it opens the add menu for the leaf. Every element without a successor has
 * one - a plain node, or a group nothing follows (its button hangs from its
 * `end`); it goes away as soon as the element gets a real child. The buttons
 * are maintained by `ensureAddButtons()` before every layout.
 */
export class AddButton extends dia.Element {

    preinitialize() {
        this.markup = util.svg/* xml */`
            <rect @selector="body"/>
            <path @selector="icon"/>
        `;
    }

    defaults() {
        return util.defaultsDeep({
            type: 'tbg.AddButton',
            z: ELEMENT_Z,
            size: ADD_BUTTON_SIZE,
            attrs: {
                body: {
                    width: 'calc(w)',
                    height: 'calc(h)',
                    rx: 3,
                    ry: 3,
                    fill: COLORS.gate.fill,
                    stroke: COLORS.gate.text,
                    strokeWidth: 1.5,
                    cursor: 'pointer',
                    'data-tooltip': 'Add below'
                },
                icon: {
                    d: PLUS_ICON,
                    transform: 'translate(calc(w / 2), calc(h / 2))',
                    stroke: COLORS.gate.text,
                    strokeWidth: 2,
                    fill: 'none',
                    pointerEvents: 'none'
                }
            }
        }, super.defaults);
    }

    static isAddButton(cell: dia.Cell): cell is AddButton {
        return cell instanceof AddButton;
    }
}

/**
 * A container that stands in for a subgraph the tree layout cannot handle:
 * a `start` node, content of a `kind` (two branches, or a loop) and an
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
 * (`fork-group.ts`, `loop-group.ts`); the group only knows its gates.
 */
export class Group extends dia.Element {

    preinitialize() {
        // Never rendered; a valid markup nonetheless.
        this.markup = util.svg/* xml */`
            <rect @selector="body"/>
        `;
    }

    defaults() {
        return util.defaultsDeep({
            type: 'tbg.Group',
            z: ELEMENT_Z,
            size: NODE_SIZE,
            kind: 'fork' satisfies GroupKind,
            collapsed: false,
            attrs: {
                body: { width: 'calc(w)', height: 'calc(h)', fill: 'none', stroke: 'none' }
            }
        }, super.defaults);
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

    toggle(collapsed: boolean = !this.isCollapsed()): void {
        if (collapsed === this.isCollapsed()) return;
        this.set('collapsed', collapsed);
        this.getStart().setCollapsedIcon(collapsed);
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

const LINK_WIDTH = 1.5;

const TARGET_MARKER = {
    type: 'path',
    d: 'M 8 -4 0 0 8 4 Z',
    fill: COLORS.link,
    stroke: COLORS.link
};

/**
 * The text above the insert button of a link to an option of a decision or a
 * fork: `option 1`, `option 2`, ... The only label a link has; the insert
 * button is a link tool (see `placeLinkTools()`).
 */
const BRANCH_LABEL_INDEX = 0;
/** The name sits above the insert button, right next to the line. */
const BRANCH_LABEL_OFFSET_X = 8;
export const BRANCH_LABEL_OFFSET_ALONG = -17;
const BRANCH_LABEL = {
    markup: util.svg/* xml */`
        <text @selector="branchText"/>
    `,
    attrs: {
        branchText: {
            fontFamily: 'sans-serif',
            fontSize: 11,
            fill: '#6A6A75',
            textAnchor: 'start',
            textVerticalAnchor: 'middle',
            pointerEvents: 'none'
        }
    },
    position: { distance: 0.5, offset: { x: BRANCH_LABEL_OFFSET_X, y: 0 }}
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

export class Link extends dia.Link {

    defaults() {
        return util.defaultsDeep({
            type: 'tbg.Link',
            z: LINK_Z,
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
        const isEnd = Node.isNode(target) && target.getRole() === 'end';
        if (isEnd || AddButton.isAddButton(target)) {
            this.removeAttr('line/targetMarker');
        } else {
            this.attr('line/targetMarker', TARGET_MARKER);
        }
    }

    /**
     * Names the link as an option of a decision or a fork (`option 1`,
     * `option 2`, ...), with a text next to its insert button, or removes
     * the name.
     */
    setBranchName(name: string | null): void {
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
    }

    /** Whether a link from `source` to `target` is the return link of a loop: from its `end` back to its `start`. */
    static isReturnLink(source: dia.Element, target: dia.Element): boolean {
        return Node.isNode(source) && source.getRole() === 'end' && Node.isNode(target) && target.getRole() === 'start';
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

export const cellNamespace = {
    tbg: { Node, Group, AddButton, Link }
};
