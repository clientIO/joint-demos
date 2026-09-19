import { dia, util } from '@joint/plus';

// Layout metrics shared by the shapes and the layout.
export const NODE_SIZE = { width: 160, height: 40 };
/** The end of a group has no size: it is the point the paths of the group converge into. */
const GROUP_END_SIZE = { width: 0, height: 0 };
/** The start and the ends of the diagram are circles. */
const TERMINAL_SIZE = { width: 52, height: 52 };
/** The add button below a leaf of the tree, the same square as the insert button of a link. */
const ADD_BUTTON_SIZE = { width: 18, height: 18 };
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
    /** The outline of the start of the diagram and of its ends; red is kept for what is about to be deleted. */
    root: '#2E9E5B',
    terminal: '#4A5470',
    /** The pills that steer the flow: a decision, the start of a group. */
    gate: { fill: '#4666E5', stroke: '#4666E5', text: '#FFFFFF' },
    link: '#7A90EC',
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

/** The selector of the add button at the right end of a decision or the start of a fork; a click on it is recognized by it. */
export const ADD_BUTTON_SELECTOR = 'addButton';

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
/** The icon sits at the left end of the pill, the label is centered in the rest. */
const KIND_ICON_X = 18;
const KIND_LABEL_OFFSET = 9;
const LABEL_FONT_FAMILY = 'sans-serif';
const LABEL_FONT_SIZE = 13;
/** The height of a line of a label, as the text is rendered (`lineHeight`). */
const LABEL_LINE_HEIGHT = 1.3 * LABEL_FONT_SIZE;
/**
 * The room a pill keeps around its label: on either side, enough for the
 * icon at the left end or the button at the right end; above and below,
 * enough for a single line to sit in a pill of the minimal size.
 */
const LABEL_PADDING_X = 26;
const LABEL_PADDING_Y = 11;
/** A piece of a label between backticks is code: monospaced, a little smaller, tinted. */
const CODE_FONT_FAMILY = 'Menlo, Consolas, monospace';
const CODE_FONT_SIZE = 12;
const CODE_COLORS = { light: '#5B6B9E', dark: '#DCE2F5' };

/** Custom paper event triggered by the collapse/expand button on the start of a group. */
export const TOGGLE_EVENT = 'element:group:toggle';
const TOGGLE_RADIUS = 11;
const COLLAPSE_ICON = 'M -4 0 4 0';
const EXPAND_ICON = 'M -4 0 4 0 M 0 -4 0 4';

/*
    The pills: a step, a decision and the start of a group are rounded
    rectangles with an icon at the left end and a label centered in the
    rest. A decision and the start of a fork carry, at the right end, the
    button that adds an option or a branch; the start of a group carries the
    collapse/expand button of the group on its bottom edge. Each class puts
    together the markup it needs from these parts.
*/

const pillMarkup = util.svg/* xml */`
    <rect @selector="body"/>
    <path @selector="kindIcon"/>
    <text @selector="label"/>
`;
const addButtonMarkup = util.svg/* xml */`
    <rect @selector="addButton"/>
    <path @selector="addIcon"/>
`;
const toggleMarkup = util.svg/* xml */`
    <circle @selector="toggle"/>
    <path @selector="toggleIcon"/>
`;

const PILL_ATTRS = {
    body: {
        width: 'calc(w)',
        height: 'calc(h)',
        rx: 4,
        ry: 4,
        strokeWidth: 1.5,
        stroke: COLORS.node.stroke,
        fill: COLORS.node.fill
    },
    kindIcon: {
        transform: `translate(${KIND_ICON_X}, calc(h / 2))`,
        stroke: COLORS.node.stroke,
        strokeWidth: 1.5,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        fill: 'none',
        pointerEvents: 'none'
    },
    label: {
        x: `calc(w / 2 + ${KIND_LABEL_OFFSET})`,
        y: 'calc(h / 2)',
        textAnchor: 'middle',
        textVerticalAnchor: 'middle',
        fontFamily: LABEL_FONT_FAMILY,
        fontSize: LABEL_FONT_SIZE,
        lineHeight: `${LABEL_LINE_HEIGHT}px`,
        fill: COLORS.node.text
    }
};

/** A run of a label in one font: plain, or code. */
interface LabelSegment {
    text: string;
    code: boolean;
}

/** A text annotation of the `text` attribute: a range of the text with attributes of its own. */
interface LabelAnnotation {
    start: number;
    end: number;
    attrs: Record<string, string | number>;
}

interface ParsedLabel {
    /** The text with the backticks taken out, the newlines kept. */
    text: string;
    /** The ranges of `text` that are code, for the `annotations` attribute. */
    annotations: LabelAnnotation[];
    /** The lines, each in runs of one font, for measuring. */
    lines: LabelSegment[][];
}

/**
 * The little markup of a label: a piece between backticks, on one line, is
 * code (`npm ci`). A backtick without a match stays a backtick.
 */
function parseLabel(raw: string, codeColor: string): ParsedLabel {
    const codeAttrs = { 'font-family': CODE_FONT_FAMILY, 'font-size': CODE_FONT_SIZE, fill: codeColor };
    const annotations: LabelAnnotation[] = [];
    const lines: LabelSegment[][] = [];
    let text = '';
    raw.split('\n').forEach((line, lineIndex) => {
        if (lineIndex > 0) text += '\n';
        const segments: LabelSegment[] = [];
        const append = (segmentText: string, code: boolean): void => {
            if (segmentText.length === 0) return;
            const start = text.length;
            text += segmentText;
            segments.push({ text: segmentText, code });
            if (code) annotations.push({ start, end: text.length, attrs: codeAttrs });
        };
        let last = 0;
        for (const match of line.matchAll(/`([^`]+)`/g)) {
            append(line.slice(last, match.index), false);
            append(match[1], true);
            last = match.index + match[0].length;
        }
        append(line.slice(last), false);
        lines.push(segments);
    });
    return { text, annotations, lines };
}

/** A 2D context of an off-screen canvas, for measuring text in the fonts of the labels. */
let measuringContext: CanvasRenderingContext2D | null = null;

function measureSegment({ text, code }: LabelSegment): number {
    measuringContext ??= document.createElement('canvas').getContext('2d')!;
    measuringContext.font = code ? `${CODE_FONT_SIZE}px ${CODE_FONT_FAMILY}` : `${LABEL_FONT_SIZE}px ${LABEL_FONT_FAMILY}`;
    return measuringContext.measureText(text).width;
}

/** The width of the widest line of a parsed label and the height of all its lines. */
function measureLabel({ lines }: ParsedLabel): { width: number; height: number } {
    const width = Math.max(...lines.map((segments) => segments.reduce((sum, segment) => sum + measureSegment(segment), 0)));
    return { width, height: lines.length * LABEL_LINE_HEIGHT };
}

/**
 * Sets the label of a pill - parsed for its little markup - and sizes the
 * pill to it: the size of a node at least, wider for a long label and taller
 * for one of several lines (a newline in the label breaks a line). The code
 * is tinted for the fill of the pill: a light pill, or a dark one.
 */
function setPillLabel(pill: dia.Element, label: string, fill: 'light' | 'dark'): void {
    const parsed = parseLabel(label, CODE_COLORS[fill]);
    pill.attr('label', { text: parsed.text, annotations: parsed.annotations });
    const { width, height } = measureLabel(parsed);
    pill.resize(
        Math.max(NODE_SIZE.width, Math.ceil(width) + 2 * LABEL_PADDING_X),
        Math.max(NODE_SIZE.height, Math.ceil(height) + 2 * LABEL_PADDING_Y)
    );
}

/** The pills that steer the flow are filled: a decision, the start of a group. */
const FILLED_PILL_ATTRS = {
    body: { fill: COLORS.gate.fill, stroke: COLORS.gate.stroke, rx: 'calc(h / 2)', ry: 'calc(h / 2)' },
    kindIcon: { stroke: COLORS.gate.text },
    label: { fill: COLORS.gate.text }
};

/**
 * The button that adds a sibling option to a decision, or a branch to a
 * fork: at the right end of the pill, apart from the "add below" and
 * "insert" buttons, which sit on the links.
 */
const ADD_BUTTON_ATTRS = {
    [ADD_BUTTON_SELECTOR]: {
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
        d: PLUS_ICON,
        transform: 'translate(calc(w), calc(h / 2))',
        stroke: COLORS.gate.text,
        strokeWidth: 2,
        fill: 'none',
        pointerEvents: 'none'
    }
};

/** The collapse/expand button of a group, on the bottom edge of its start. Inverted colors, so that it stands out on the pill. */
const TOGGLE_ATTRS = {
    toggle: {
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
        d: COLLAPSE_ICON,
        transform: 'translate(calc(w / 2), calc(h))',
        stroke: COLORS.gate.fill,
        strokeWidth: 2,
        fill: 'none',
        pointerEvents: 'none'
    }
};

/** What every pill shares: the size of a node and the basic attributes; the type and the icon are the subclass's. */
function pillDefaults(type: string, extra: object, superDefaults: object): object {
    return util.defaultsDeep({ type, z: ELEMENT_Z, size: NODE_SIZE }, extra, { attrs: PILL_ATTRS }, superDefaults);
}

/** A step of the flow: a plain pill with a label, sized to it. */
export class Step extends dia.Element {

    preinitialize() {
        this.markup = pillMarkup;
    }

    defaults() {
        return pillDefaults('tbg.Step', { attrs: { kindIcon: { d: NODE_ICON }}}, super.defaults);
    }

    /** A step with its label and, below it, the command it runs, as code. */
    static create(label: string, run?: string): Step {
        const step = new Step();
        setPillLabel(step, run ? `${label}\n\`${run}\`` : label, 'light');
        return step;
    }

    static isStep(cell: dia.Cell): cell is Step {
        return cell instanceof Step;
    }
}

/**
 * A decision: a node of the tree that branches out - without a merge,
 * unlike a fork. A filled pill with a diamond and, at its right end, the
 * button that adds an option (shown once it has one, see
 * `setAddButtonVisible()`; with none it is a leaf with the usual add button
 * below).
 */
export class Decision extends dia.Element {

    preinitialize() {
        this.markup = [...pillMarkup, ...addButtonMarkup];
    }

    defaults() {
        return pillDefaults('tbg.Decision', {
            attrs: util.defaultsDeep({
                kindIcon: { d: DECISION_ICON },
                [ADD_BUTTON_SELECTOR]: { 'data-tooltip': 'Add an option' }
            }, FILLED_PILL_ATTRS, ADD_BUTTON_ATTRS)
        }, super.defaults);
    }

    static create(label: string = DECISION_LABEL): Decision {
        const decision = new Decision();
        setPillLabel(decision, label, 'dark');
        return decision;
    }

    setAddButtonVisible(visible: boolean): void {
        this.attr({
            [ADD_BUTTON_SELECTOR]: { display: visible ? null : 'none' },
            addIcon: { display: visible ? null : 'none' }
        });
    }

    static isDecision(cell: dia.Cell): cell is Decision {
        return cell instanceof Decision;
    }
}

/**
 * The start of a group: a filled pill labelled with the kind of the group,
 * with the icon of the kind and the collapse/expand button of the group on
 * its bottom edge. The start of a fork also carries, at its right end, the
 * button that adds a branch - a fork may have any number of them; a loop
 * has one body, so its start has no such button. When the group is
 * collapsed the start stays visible in its place and stands in for it.
 */
export class GroupStart extends dia.Element {

    preinitialize(attributes?: { kind?: GroupKind }) {
        const markup = [...pillMarkup, ...toggleMarkup];
        this.markup = attributes?.kind === 'fork' ? [...markup, ...addButtonMarkup] : markup;
    }

    defaults() {
        return pillDefaults('tbg.GroupStart', {
            kind: 'fork' satisfies GroupKind,
            attrs: util.defaultsDeep({
                [ADD_BUTTON_SELECTOR]: { 'data-tooltip': 'Add a branch' }
            }, FILLED_PILL_ATTRS, TOGGLE_ATTRS, ADD_BUTTON_ATTRS)
        }, super.defaults);
    }

    static create(kind: GroupKind): GroupStart {
        const start = new GroupStart({ kind });
        start.attr({
            kindIcon: { d: GROUP_ICONS[kind] },
            label: { text: GROUP_LABELS[kind] }
        });
        return start;
    }

    getKind(): GroupKind {
        return this.get('kind');
    }

    /** Flips the icon and the tooltip of the collapse/expand button. */
    setCollapsed(collapsed: boolean): void {
        this.attr({
            toggle: { 'data-tooltip': collapsed ? 'Expand' : 'Collapse' },
            toggleIcon: { d: collapsed ? EXPAND_ICON : COLLAPSE_ICON }
        });
    }

    static isGroupStart(cell: dia.Cell): cell is GroupStart {
        return cell instanceof GroupStart;
    }
}

/**
 * The end of a group: a point without size and without a picture. The paths
 * of the group converge into it, and the tree continues from it.
 */
export class GroupEnd extends dia.Element {

    preinitialize() {
        this.markup = [];
    }

    defaults() {
        return util.defaultsDeep({
            type: 'tbg.GroupEnd',
            z: ELEMENT_Z,
            size: GROUP_END_SIZE
        }, super.defaults);
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

/*
    The terminals: the start and the ends of the diagram are circles with
    their label inside.
*/

const terminalMarkup = util.svg/* xml */`
    <circle @selector="body"/>
    <text @selector="label"/>
`;

function terminalDefaults(type: string, label: string, stroke: string, strokeWidth: number, superDefaults: object): object {
    return util.defaultsDeep({
        type,
        z: ELEMENT_Z,
        size: TERMINAL_SIZE,
        attrs: {
            body: {
                cx: 'calc(w / 2)',
                cy: 'calc(h / 2)',
                r: 'calc(w / 2)',
                fill: COLORS.node.fill,
                stroke,
                strokeWidth
            },
            label: {
                text: label,
                x: 'calc(w / 2)',
                y: 'calc(h / 2)',
                textAnchor: 'middle',
                textVerticalAnchor: 'middle',
                fontFamily: 'sans-serif',
                fontSize: 12,
                fill: COLORS.node.text
            }
        }
    }, superDefaults);
}

/** The start of the diagram, its root: a circle outlined in green. */
export class Start extends dia.Element {

    preinitialize() {
        this.markup = terminalMarkup;
    }

    defaults() {
        return terminalDefaults('tbg.Start', 'Start', COLORS.root, 1.5, super.defaults);
    }

    static create(): Start {
        return new Start();
    }

    static isStart(cell: dia.Cell): cell is Start {
        return cell instanceof Start;
    }
}

/** An end of the diagram: a circle with the thick ring of a flowchart terminal, a leaf nothing can follow. */
export class End extends dia.Element {

    preinitialize() {
        this.markup = terminalMarkup;
    }

    defaults() {
        return terminalDefaults('tbg.End', 'End', COLORS.terminal, 3, super.defaults);
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
 * one - a plain node, or a group nothing follows (its button hangs from its
 * `end`); it goes away as soon as the element gets a real child. The buttons
 * are derived by the build (see `data/build.ts`).
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
        if (GroupEnd.isGroupEnd(target) || AddButton.isAddButton(target)) {
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
        return GroupEnd.isGroupEnd(source) && GroupStart.isGroupStart(target);
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
    tbg: { Step, Decision, Start, End, GroupStart, GroupEnd, Group, AddButton, Link }
};
