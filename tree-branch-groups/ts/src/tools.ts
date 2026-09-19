import { dia, elementTools, g, highlighters, linkTools, ui, util } from '@joint/plus';

import { canAddTerminal, canDelete, canSplit, getDeletedCells } from './actions';
import { isCellVisible } from './layout';
import { openAddMenu } from './add-menu';
import type { AddChoice } from './add-menu';
import { ADD_BUTTON_SELECTOR, AddButton, BRANCH_LABEL_OFFSET_ALONG, Group, INSERT_BUTTON_FROM_TARGET, Link, Node, TOGGLE_EVENT } from './shapes';

const BUTTON_RADIUS = 11;
const DELETE_FILL = '#E54666';
const ADD_FILL = '#4666E5';
const BUTTON_STROKE = '#FFFFFF';

/** The "add" buttons are squares, so that they differ from the round toggle and delete buttons. */
type ButtonShape = 'circle' | 'square';

const DELETE_ICON = 'M -4 -4 4 4 M -4 4 4 -4';
const ADD_ICON = 'M -4 0 4 0 M 0 -4 0 4';
const INSERT_BUTTON_SIZE = 18;

export interface ToolActions {
    addBelow(element: dia.Element, choice: AddChoice): void;
    insertOnLink(link: Link, choice: AddChoice): void;
    delete(element: dia.Element): void;
    toggleGroup(group: Group): void;
}

interface ButtonOptions {
    icon: string;
    title: string;
    fill: string;
    shape: ButtonShape;
    /** The position on the element, in percent, plus an offset in pixels. */
    x: string;
    y: string;
    offset: { x: number; y: number };
    action: (evt: dia.Event, view: dia.CellView, tool: dia.ToolView) => void;
}

function createButtonMarkup(icon: string, title: string, fill: string, shape: ButtonShape): dia.MarkupJSON {
    const half = INSERT_BUTTON_SIZE / 2;
    // The class picks the hover color in the stylesheet.
    const className = `button ${fill === DELETE_FILL ? 'delete' : 'add'}`;
    // The title is the tooltip (see `addTooltips()`).
    const body = shape === 'circle'
        ? `<circle @selector="body" class="${className}" r="${BUTTON_RADIUS}" fill="${fill}" stroke="${BUTTON_STROKE}" stroke-width="1.5" cursor="pointer" data-tooltip="${title}"/>`
        : `<rect @selector="body" class="${className}" x="${-half}" y="${-half}" width="${INSERT_BUTTON_SIZE}" height="${INSERT_BUTTON_SIZE}" rx="3" ry="3" fill="${fill}" stroke="${BUTTON_STROKE}" stroke-width="1.5" cursor="pointer" data-tooltip="${title}"/>`;
    return util.svg/* xml */`
        ${body}
        <path d="${icon}" fill="none" stroke="${BUTTON_STROKE}" stroke-width="2" pointer-events="none"/>
    `;
}

function createButton({ icon, title, fill, shape, x, y, offset, action }: ButtonOptions): elementTools.Button {
    return new elementTools.Button({
        x,
        y,
        offset,
        useModelGeometry: true,
        markup: createButtonMarkup(icon, title, fill, shape),
        action
    });
}

/** What can be inserted anywhere: a node, a decision, a fork, a loop. */
const INSERT_CHOICES: AddChoice[] = ['node', 'decision', 'fork', 'loop'];

/** What can be added below `parent`: everything, and an end of the diagram outside of a group. */
function getAddChoices(parent: dia.Element): AddChoice[] {
    return canAddTerminal(parent) ? [...INSERT_CHOICES, 'end'] : INSERT_CHOICES;
}

/**
 * A click on an add button - the one hanging below a leaf, the one on a
 * decision, or the one on the start of a fork - opens the add menu below it
 * with what can be added there: a child, or a new branch. Clicks on other
 * elements do nothing.
 */
export function handleElementClick(view: dia.ElementView, evt: dia.Event, actions: ToolActions): void {
    const element = view.model;
    const graph = element.graph;
    if (Node.isNode(element)) {
        // The button on a decision, or on the start of a fork (a new branch).
        const target = evt.target;
        if (!(target instanceof Element) || target.getAttribute('joint-selector') !== ADD_BUTTON_SELECTOR) return;
        if (!element.isDecision() && element.getRole() !== 'start') return;
        openAddMenu(target as SVGElement, getAddChoices(element), (choice) => actions.addBelow(element, choice));
    } else if (AddButton.isAddButton(element)) {
        // The button below a leaf.
        const [parent] = graph.getNeighbors(element, { inbound: true });
        if (!parent) return;
        openAddMenu(view.el, getAddChoices(parent), (choice) => actions.addBelow(parent, choice));
    }
}

/**
 * The element the "delete" tool of the hovered element acts on: a plain node
 * deletes itself, the `start` node of a group deletes the group. The `end`
 * node and the add buttons delete nothing.
 */
function getDeleteTarget(element: dia.Element): dia.Element | null {
    if (Node.isNode(element)) {
        switch (element.getRole()) {
            case 'start': return element.getParentCell() as Group;
            case 'end': return null;
            default: return element;
        }
    }
    return AddButton.isAddButton(element) ? null : element;
}

/** The id of the highlighter, and the class it adds, on the cells a hovered delete tool would remove. */
const DELETE_HIGHLIGHT = 'to-be-deleted';

/** The views highlighted at the moment, to take the highlight off again. */
let highlightedViews: dia.CellView[] = [];

/**
 * Turns the cells a deletion of `target` would remove red, by a class on
 * their views - the visible ones; the content of a collapsed group has none.
 * The add buttons among them are left alone: buttons do not turn red.
 */
function highlightDeletion(paper: dia.Paper, target: dia.Element): void {
    clearDeletionHighlight();
    for (const cell of getDeletedCells(paper.model, target)) {
        // The buttons keep their color: only the elements and the links turn red.
        if (!isCellVisible(cell) || AddButton.isAddButton(cell)) continue;
        const view = paper.findViewByModel(cell);
        if (!view) continue;
        highlighters.addClass.add(view, 'root', DELETE_HIGHLIGHT, { className: DELETE_HIGHLIGHT });
        highlightedViews.push(view);
    }
}

/** Takes the deletion highlight off. */
export function clearDeletionHighlight(): void {
    for (const view of highlightedViews) highlighters.addClass.remove(view, DELETE_HIGHLIGHT);
    highlightedViews = [];
}

/**
 * The "delete" tool acting on `target`, at the top left of the hovered
 * element, inset so that it stays on the element. Hovering the tool
 * highlights what it would remove.
 * `null` when the target cannot be deleted.
 */
function createDeleteTool(graph: dia.Graph, target: dia.Element, actions: ToolActions, paper: dia.Paper): dia.ToolView | null {
    if (!canDelete(graph, target)) return null;
    const tool = createButton({
        icon: DELETE_ICON,
        title: Node.isNode(target)
            ? (target.isDecision() ? 'Delete the decision with everything below it' : target.isTerminal() ? 'Delete the end' : 'Delete the node')
            : 'Delete the group',
        fill: DELETE_FILL,
        shape: 'circle',
        // Top left, a little towards the middle: the pointer reaches the
        // button without leaving the element - not even a round pill.
        x: '0%',
        y: '0%',
        offset: { x: 12, y: 2 },
        action: () => {
            clearDeletionHighlight();
            actions.delete(target);
        }
    });
    tool.el.addEventListener('mouseenter', () => highlightDeletion(paper, target));
    tool.el.addEventListener('mouseleave', () => clearDeletionHighlight());
    return tool;
}

/**
 * The tools of the hovered element: the "delete" tool of the element it
 * deletes (see `getDeleteTarget()`). Adding happens on the links and on the
 * add buttons, collapsing on the button of the `start` node. `null` when the
 * element has no tools.
 */
export function createHoverTools(paper: dia.Paper, element: dia.Element, actions: ToolActions): dia.ToolsView | null {
    const deleteTarget = getDeleteTarget(element);
    const deleteTool = deleteTarget && createDeleteTool(paper.model, deleteTarget, actions, paper);
    return deleteTool ? new dia.ToolsView({ tools: [deleteTool] }) : null;
}

/** The insert button of a link: a square plus, a `linkTools.Button` at `distance` along the link. */
function createInsertTool(link: Link, distance: number, actions: ToolActions): dia.ToolView {
    return new linkTools.Button({
        distance,
        markup: createButtonMarkup(ADD_ICON, 'Insert here', ADD_FILL, 'square'),
        action: (_evt, _view, tool) => {
            openAddMenu(tool.el, INSERT_CHOICES, (choice) => actions.insertOnLink(link, choice));
        }
    });
}

/**
 * Whether the link out of `element` has something right below the element:
 * the collapse button of a collapsed group, or the return link of a loop,
 * which leaves the link below the loop and joins it below the loop's start.
 */
function hasSomethingBelow(element: dia.Element): boolean {
    if (Group.isGroup(element)) return element.isCollapsed() || element.getKind() === 'loop';
    if (!Node.isNode(element) || element.getRole() !== 'start') return false;
    const group = element.getParentCell();
    return group !== null && Group.isGroup(group) && group.getKind() === 'loop';
}

/**
 * Whether `element` is the end of a loop: the link into it from a leaf gets
 * its insert button a fixed distance below the leaf, the mirror image of the
 * link out of the loop's start, whose button sits a fixed distance above its
 * child - the return link runs at equal distances around both.
 */
function isLoopEnd(element: dia.Element): boolean {
    if (!Node.isNode(element) || element.getRole() !== 'end') return false;
    const group = element.getParentCell();
    return group !== null && Group.isGroup(group) && group.getKind() === 'loop';
}

/**
 * Where the insert button of a rendered link goes, as a distance along the
 * link: the middle of its longest vertical part - the part the link has of
 * its own, not the one it shares with its siblings on a bar, and never a
 * horizontal part. When the link leaves an element with something right
 * below it (see `hasSomethingBelow()`) - the collapse button of a collapsed
 * group, the return link of a loop - the button sits near the child instead,
 * a fixed distance from the target, whatever room the link was given; when
 * it joins the end of a loop, a fixed distance from the source (see
 * `isLoopEnd()`). `null` for a link without a vertical part.
 */
function getInsertButtonDistance(view: dia.LinkView): number | null {
    const points = [view.sourcePoint, ...view.route, view.targetPoint];
    let longest: g.Line | null = null;
    let longestIndex = -1;
    for (let i = 0; i < points.length - 1; i++) {
        const segment = new g.Line(points[i], points[i + 1]);
        if (Math.abs(segment.start.x - segment.end.x) > 0.5) continue;
        if (!longest || segment.length() > longest.length()) {
            longest = segment;
            longestIndex = i;
        }
    }
    if (!longest) return null;
    const source = view.model.getSourceElement();
    const target = view.model.getTargetElement();
    if (longestIndex === 0 && source && hasSomethingBelow(source)) {
        // Such a link is straight: the button sits a fixed distance above the child.
        return Math.max(view.getConnectionLength() - INSERT_BUTTON_FROM_TARGET, INSERT_BUTTON_SIZE);
    }
    if (longestIndex === 0 && target && isLoopEnd(target)) {
        // The vertical part leaves the leaf: the button sits a fixed distance below it.
        return Math.min(INSERT_BUTTON_FROM_TARGET, longest.length() - INSERT_BUTTON_SIZE);
    }
    const point = longest.pointAtLength(longest.length() / 2);
    return view.getConnection().closestPointLength(point);
}

/**
 * Gives every rendered link that can be split its insert button, a link tool
 * that stays on: not a hover tool. The button sits on the longest vertical
 * part of the link, and so does the name of an option, a label above it.
 * (The return link of a loop cannot be split; its own label, an arrow, keeps
 * its place in the middle of the link.)
 * The routes are read from the rendered views, so this runs after every
 * layout has been rendered - and after `paper.removeTools()`, which takes
 * the buttons of the previous layout away.
 */
export function placeLinkTools(paper: dia.Paper, actions: ToolActions): void {
    for (const link of paper.model.getLinks()) {
        if (!(link instanceof Link) || !isCellVisible(link)) continue;
        const view = paper.findViewByModel(link) as dia.LinkView | undefined;
        if (!view) continue;
        if (!canSplit(link)) continue;
        const distance = getInsertButtonDistance(view);
        if (distance === null) continue;
        // The name of an option sits a little above the button, on the same vertical part.
        link.labels().forEach((_label, index) => {
            link.prop(['labels', index, 'position', 'distance'], Math.max(0, distance + BRANCH_LABEL_OFFSET_ALONG));
        });
        view.addTools(new dia.ToolsView({ tools: [createInsertTool(link, distance, actions)] }));
    }
}

/**
 * One tooltip for every button on the paper - the buttons of the pills and
 * the add buttons below the leaves, the insert buttons of the links and the
 * delete tools - each named by its `data-tooltip` attribute.
 */
export function addTooltips(paper: dia.Paper): ui.Tooltip {
    return new ui.Tooltip({
        rootTarget: paper.el,
        target: '[data-tooltip]',
        // `Top` names the side of the tooltip that touches the target: the tooltip hangs below the button.
        position: ui.Tooltip.TooltipPosition.Top,
        padding: 12,
        // Not before the pointer has rested on the button for a moment: the
        // tooltip fades in after a delay.
        animation: { delay: '500ms', duration: '150ms' }
    });
}

/**
 * Wires the interactions: the tools of the hovered element (see
 * `createHoverTools()`), the add menu on a click on an add button - below a
 * leaf, on a decision, on the start of a fork (see `handleElementClick()`) -
 * and the collapse/expand button of a group. The insert buttons of the links
 * are placed after every layout (see `placeLinkTools()`).
 */
export function addHoverTools(paper: dia.Paper, actions: ToolActions): void {

    // The collapse/expand button on the `start` node of a group is a part of its markup.
    paper.on(TOGGLE_EVENT, (elementView: dia.ElementView, evt: dia.Event) => {
        evt.stopPropagation();
        const group = elementView.model.getParentCell();
        if (group && Group.isGroup(group)) actions.toggleGroup(group);
    });

    paper.on('element:pointerclick', (elementView: dia.ElementView, evt: dia.Event) => {
        handleElementClick(elementView, evt, actions);
    });

    paper.on('element:mouseenter', (elementView: dia.ElementView) => {
        const tools = createHoverTools(paper, elementView.model, actions);
        if (!tools) return;
        elementView.removeTools();
        elementView.addTools(tools);
    });

    paper.on('element:mouseleave', (elementView: dia.ElementView) => {
        // The delete tool goes with the hover; so does its highlight.
        clearDeletionHighlight();
        elementView.removeTools();
    });
}
