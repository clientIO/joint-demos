import { dia, elementTools, g, highlighters, linkTools, ui, util } from '@joint/plus';

import { canAddTerminal, canDelete, canSplit, getDeletedCells } from './actions';
import { isCellVisible } from './layout';
import { openAddMenu, openMenu } from './menu';
import type { AddChoice } from './menu';
import { ADD_BUTTON_SELECTOR, AddButton, BRANCH_LABEL_OFFSET_ALONG, COLORS, Decision, End, Group, GroupEnd, GroupStart, INSERT_BUTTON_FROM_TARGET, Link, TOGGLE_EVENT } from './shapes';

/** The insert buttons are squares, so that they differ from the round toggle and "more" buttons. */
const ADD_FILL = '#4666E5';
const BUTTON_STROKE = '#FFFFFF';
const ADD_ICON = 'M -4 0 4 0 M 0 -4 0 4';
const INSERT_BUTTON_SIZE = 18;
/** The "remove" item of the menu of an element: a cross, in red. */
const DELETE_FILL = '#E54666';
const DELETE_ICON = 'M -5 -5 5 5 M -5 5 5 -5';

export interface ToolActions {
    addBelow(element: dia.Element, choice: AddChoice): void;
    insertOnLink(link: Link, choice: AddChoice): void;
    delete(element: dia.Element): void;
    toggleGroup(group: Group): void;
}

/** The markup of the square insert button of a link: a plus, named by its tooltip (see `addTooltips()`). */
function createInsertButtonMarkup(title: string): dia.MarkupJSON {
    const half = INSERT_BUTTON_SIZE / 2;
    // The class picks the hover color in the stylesheet.
    return util.svg/* xml */`
        <rect @selector="body" class="button add" x="${-half}" y="${-half}" width="${INSERT_BUTTON_SIZE}" height="${INSERT_BUTTON_SIZE}" rx="3" ry="3" fill="${ADD_FILL}" stroke="${BUTTON_STROKE}" stroke-width="1.5" cursor="pointer" data-tooltip="${title}"/>
        <path d="${ADD_ICON}" fill="none" stroke="${BUTTON_STROKE}" stroke-width="2" pointer-events="none"/>
    `;
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
    if (Decision.isDecision(element) || GroupStart.isGroupStart(element)) {
        // The button on a decision, or on the start of a fork (a new branch).
        const target = evt.target;
        if (!(target instanceof Element) || target.getAttribute('joint-selector') !== ADD_BUTTON_SELECTOR) return;
        openAddMenu(target as SVGElement, getAddChoices(element), (choice) => actions.addBelow(element, choice));
    } else if (AddButton.isAddButton(element)) {
        // The button below a leaf.
        const [parent] = graph.getNeighbors(element, { inbound: true });
        if (!parent) return;
        openAddMenu(view.el, getAddChoices(parent), (choice) => actions.addBelow(parent, choice));
    }
}

/**
 * The element the menu of the hovered element acts on: a plain node
 * deletes itself, the `start` node of a group deletes the group. The `end`
 * node and the add buttons delete nothing. The `Delete` key on the selected
 * element acts on the same target.
 */
export function getDeleteTarget(element: dia.Element): dia.Element | null {
    if (GroupStart.isGroupStart(element)) return element.getParentCell() as Group;
    if (GroupEnd.isGroupEnd(element) || AddButton.isAddButton(element)) return null;
    return element;
}

/** The item of the menu that removes `target`: "Remove" and what it is - a loop, a fork, a decision, an end, a node. */
function getDeleteTitle(target: dia.Element): string {
    if (Group.isGroup(target)) return `Remove the ${target.getKind()}`;
    if (Decision.isDecision(target)) return 'Remove the decision';
    if (End.isEnd(target)) return 'Remove the end';
    return 'Remove the node';
}

/** The id of the highlighter, and the class it adds, on the cells a hovered "remove" item would remove. */
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

/** The "more" button: three dots at the top right of the hovered element, inside it; a click opens the menu of the element. */
const MENU_BUTTON_RADIUS = 9;
const MENU_DOT_RADIUS = 1.5;
const MENU_DOT_GAP = 4.5;

function createMenuButtonMarkup(color: string): dia.MarkupJSON {
    const dots = [-MENU_DOT_GAP, 0, MENU_DOT_GAP]
        .map((x) => `<circle cx="${x}" cy="0" r="${MENU_DOT_RADIUS}" fill="${color}" pointer-events="none"/>`)
        .join('');
    // A transparent disc catches the pointer; the class picks the hover tint in the stylesheet.
    return util.svg/* xml */`
        <circle @selector="body" class="button menu" r="${MENU_BUTTON_RADIUS}" fill="transparent" cursor="pointer" data-tooltip="More"/>
        ${dots}
    `;
}

/**
 * The "more" tool of the hovered `element`, acting on `target` (see
 * `getDeleteTarget()`): three dots at the top right, inside the element and
 * clear of the button at its right end, in the color of its text. A click
 * opens the menu of the element - its removal; hovering the item highlights
 * what it would remove. `null` when the target cannot be deleted: the menu
 * would be empty.
 */
function createMenuTool(paper: dia.Paper, element: dia.Element, target: dia.Element, actions: ToolActions): dia.ToolView | null {
    if (!canDelete(paper.model, target)) return null;
    const filled = Decision.isDecision(element) || GroupStart.isGroupStart(element);
    return new elementTools.Button({
        x: '100%',
        y: '0%',
        offset: { x: -(MENU_BUTTON_RADIUS + 13), y: MENU_BUTTON_RADIUS + 1 },
        useModelGeometry: true,
        markup: createMenuButtonMarkup(filled ? COLORS.gate.text : COLORS.node.stroke),
        action: (_evt, _view, tool) => {
            openMenu(tool.el, [{ action: 'remove', label: getDeleteTitle(target), icon: DELETE_ICON, color: DELETE_FILL }], {
                onChoose: () => actions.delete(target),
                onHover: (action) => (action === 'remove' ? highlightDeletion(paper, target) : clearDeletionHighlight())
            });
        }
    });
}

/**
 * The tools of the hovered element: the "more" tool with the menu of the
 * element it acts on (see `getDeleteTarget()`). Adding happens on the links
 * and on the add buttons, collapsing on the button of the `start` node.
 * `null` when the element has no tools.
 */
export function createHoverTools(paper: dia.Paper, element: dia.Element, actions: ToolActions): dia.ToolsView | null {
    const target = getDeleteTarget(element);
    const menuTool = target && createMenuTool(paper, element, target, actions);
    return menuTool ? new dia.ToolsView({ tools: [menuTool] }) : null;
}

/** The insert button of a link: a square plus, a `linkTools.Button` at `distance` along the link. */
function createInsertTool(link: Link, distance: number, actions: ToolActions): dia.ToolView {
    return new linkTools.Button({
        distance,
        markup: createInsertButtonMarkup('Insert here'),
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
    return GroupStart.isGroupStart(element) && element.getKind() === 'loop';
}

/**
 * Whether `element` is the end of a loop: the link into it from a leaf gets
 * its insert button a fixed distance below the leaf, the mirror image of the
 * link out of the loop's start, whose button sits a fixed distance above its
 * child - the return link runs at equal distances around both.
 */
function isLoopEnd(element: dia.Element): boolean {
    return GroupEnd.isGroupEnd(element) && element.getGroup().getKind() === 'loop';
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
 * One tooltip for every button under `root` - the buttons of the pills and
 * the add buttons below the leaves, the insert buttons of the links, the
 * delete tools and the buttons of the toolbar - each named by its
 * `data-tooltip` attribute.
 */
export function addTooltips(root: HTMLElement): ui.Tooltip {
    return new ui.Tooltip({
        rootTarget: root,
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
