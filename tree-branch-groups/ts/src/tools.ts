import { dia, elementTools, g, highlighters, linkTools, ui, util } from '@joint/plus';

import { canAddTerminal, canDelete, canSplit, getDeletedCells } from './actions';
import { isCellVisible } from './layout';
import { openAddMenu, openMenu } from './menu';
import type { AddChoice } from './menu';
import { ADD_BUTTON_SELECTOR, ADD_BUTTON_SIZE, AddButtonModel, BRANCH_LABEL_OFFSET_ALONG, COLORS, DecisionModel, EndModel, GroupModel, GroupEndModel, GroupStartModel, INSERT_BUTTON_FROM_TARGET, LinkModel, PLUS_ICON, TOGGLE_EVENT } from './shapes';

/** The insert buttons are squares, so that they differ from the round toggle and "more" buttons: blue, marked in white like every add button. */
const ADD_FILL = COLORS.button.fill;
const ADD_STROKE = COLORS.button.text;
const ADD_ICON = PLUS_ICON;
const INSERT_BUTTON_SIZE = ADD_BUTTON_SIZE.width;
/** The "remove" item of the menu of an element: a cross, in red. */
const DELETE_FILL = COLORS.danger;
const DELETE_ICON = 'M -5 -5 5 5 M -5 5 5 -5';

export interface ToolActions {
    addBelow(element: dia.Element, choice: AddChoice): void;
    insertOnLink(link: LinkModel, choice: AddChoice): void;
    delete(element: dia.Element): void;
    toggleGroup(group: GroupModel): void;
    /** Whether `element` with everything below it has anywhere to move to. */
    canMove(element: dia.Element): boolean;
    /** Starts moving `element` with everything below it: the drop points take it instead of adding. */
    startMove(element: dia.Element): void;
    /** The element being moved, if any. While one is, the tools drop it and add nothing. */
    getMoved(): dia.Element | null;
    /** The cells that move with it, to mark them. */
    getMovedCells(): dia.Cell[];
    /** The cells that would move with `element`: for the preview of a move, before it starts. */
    getMovedCellsOf(element: dia.Element): dia.Cell[];
    canDropBelow(parent: dia.Element): boolean;
    canDropOnLink(link: LinkModel): boolean;
    dropBelow(parent: dia.Element): void;
    dropOnLink(link: LinkModel): void;
}

/** The "move to" item of the menu of an element: an arrow out and down, in the blue of the nodes. */
const MOVE_ICON = 'M -6 -6 V 6 H 6 M 6 6 L 2 2 M 6 6 L 2 10';

/** The markup of the square button of a link: a plus, named by its tooltip (see `addTooltips()`). */
function createInsertButtonMarkup(title: string): dia.MarkupJSON {
    const half = INSERT_BUTTON_SIZE / 2;
    // The class picks the hover color in the stylesheet.
    return util.svg/* xml */`
        <rect @selector="body" class="button add" x="${-half}" y="${-half}" width="${INSERT_BUTTON_SIZE}" height="${INSERT_BUTTON_SIZE}" rx="3" ry="3" fill="${ADD_FILL}" stroke="${ADD_STROKE}" stroke-width="1.5" cursor="pointer" data-tooltip="${title}"/>
        <path d="${ADD_ICON}" fill="none" stroke="${ADD_STROKE}" stroke-width="2" pointer-events="none"/>
    `;
}

/** What can be inserted anywhere: a step, a decision, a fork, a loop. */
const INSERT_CHOICES: AddChoice[] = ['step', 'decision', 'fork', 'loop'];

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
function handleElementClick(view: dia.ElementView, evt: dia.Event, actions: ToolActions): void {
    const element = view.model;
    const graph = element.graph;
    let parent: dia.Element;
    let target: HTMLElement | SVGElement;
    if (DecisionModel.isDecision(element) || GroupStartModel.isGroupStart(element)) {
        // The button on a decision, or on the start of a fork (a new branch).
        if (!(evt.target instanceof Element) || evt.target.getAttribute('joint-selector') !== ADD_BUTTON_SELECTOR) return;
        parent = element;
        target = evt.target as SVGElement;
    } else if (AddButtonModel.isAddButton(element)) {
        // The button below a leaf.
        [parent] = graph.getNeighbors(element, { inbound: true });
        if (!parent) return;
        target = view.el;
    } else {
        return;
    }
    if (actions.getMoved()) {
        // A drop point of the move, where the move can go.
        if (actions.canDropBelow(parent)) actions.dropBelow(parent);
        return;
    }
    openAddMenu(target, getAddChoices(parent), (choice) => actions.addBelow(parent, choice));
}

/**
 * The element the menu of `element` acts on - and the `Delete` key, when
 * it is selected: a node acts on itself, the `start` of a group on the
 * group. The `end` of a group and the add buttons have no menu.
 */
export function getActionTarget(element: dia.Element): dia.Element | null {
    if (GroupStartModel.isGroupStart(element)) return element.getParentCell() as GroupModel;
    if (GroupEndModel.isGroupEnd(element) || AddButtonModel.isAddButton(element)) return null;
    return element;
}

/** The item of the menu that removes `target`: "Remove" and what it is - a loop, a fork, a decision, an end, a step. */
function getDeleteTitle(target: dia.Element): string {
    if (GroupModel.isGroup(target)) return `Remove the ${target.getKind()}`;
    if (DecisionModel.isDecision(target)) return 'Remove the decision';
    if (EndModel.isEnd(target)) return 'Remove the end';
    return 'Remove the step';
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
        if (!isCellVisible(cell) || AddButtonModel.isAddButton(cell)) continue;
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


/** The class on the faded cells - what a hovered collapse button would hide, what a hovered "move" item would move: light colors (see the stylesheet). */
const FADED_CLASS = 'faded';

/** The views faded at the moment, to restore them. */
let fadedViews: dia.CellView[] = [];

/** Fades `cells` - the visible ones - by a class on their views; what was faded before is restored first. */
function fadeCells(paper: dia.Paper, cells: Iterable<dia.Cell>): void {
    clearFaded();
    for (const cell of cells) {
        if (!isCellVisible(cell)) continue;
        const view = paper.findViewByModel(cell);
        if (!view) continue;
        highlighters.addClass.add(view, 'root', FADED_CLASS, { className: FADED_CLASS });
        fadedViews.push(view);
    }
}

/** Restores the faded cells. */
export function clearFaded(): void {
    for (const view of fadedViews) highlighters.addClass.remove(view, FADED_CLASS);
    fadedViews = [];
}

/**
 * Fades what a collapse of `group` would hide - its content, nested groups
 * included, and the links of the content. The start of the group stays: it
 * stands in for the collapsed group. Nothing for a group already collapsed.
 */
function highlightCollapse(paper: dia.Paper, group: GroupModel): void {
    if (group.isCollapsed()) {
        clearFaded();
        return;
    }
    const start = group.getStart();
    const content = group.getEmbeddedCells({ deep: true }).filter((cell) => cell !== start);
    const links = content.filter((cell) => cell.isElement()).flatMap((cell) => paper.model.getConnectedLinks(cell));
    fadeCells(paper, new Set([...content, ...links]));
}

/** The "more" button: three dots at the top right of the hovered element, inside it; a click opens the menu of the element. */
const MENU_BUTTON_RADIUS = 9;
const MENU_DOT_RADIUS = 1.5;
const MENU_DOT_GAP = 4.5;
/**
 * Where the button sits: on a step at the top right, at the same gap from
 * the top and from the right; on a pill further from the right, inside its
 * round end; on an end at the top, centered.
 */
const MENU_BUTTON_GAP = 4;
const MENU_BUTTON_OFFSET_ON_PILL = { x: -(MENU_BUTTON_RADIUS + 13), y: MENU_BUTTON_RADIUS + 1 };

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
 * `getActionTarget()`): three dots at the top right, inside the element and
 * clear of the button at its right end, in the color of its text. A click
 * opens the menu of the element - its removal; hovering the item highlights
 * what it would remove. `null` when the target cannot be deleted: the menu
 * would be empty.
 */
function createMenuTool(paper: dia.Paper, element: dia.Element, target: dia.Element, actions: ToolActions): dia.ToolView | null {
    if (!canDelete(paper.model, target)) return null;
    const filled = DecisionModel.isDecision(element) || GroupStartModel.isGroupStart(element);
    const centered = EndModel.isEnd(element);
    return new elementTools.Button({
        x: centered ? '50%' : '100%',
        y: '0%',
        offset: centered ? { x: 0, y: MENU_BUTTON_RADIUS + MENU_BUTTON_GAP }
            : filled ? MENU_BUTTON_OFFSET_ON_PILL
                : { x: -(MENU_BUTTON_RADIUS + MENU_BUTTON_GAP), y: MENU_BUTTON_RADIUS + MENU_BUTTON_GAP },
        useModelGeometry: true,
        markup: createMenuButtonMarkup(filled ? COLORS.gate.text : COLORS.node.stroke),
        action: (_evt, _view, tool) => {
            openMenu(tool.el, [
                // Greyed out when there is nowhere to move the element to.
                { action: 'move', label: 'Move to…', icon: MOVE_ICON, color: COLORS.node.stroke, disabled: !actions.canMove(target) },
                { action: 'remove', label: getDeleteTitle(target), icon: DELETE_ICON, color: DELETE_FILL }
            ], {
                onChoose: (action) => (action === 'move' ? actions.startMove(target) : actions.delete(target)),
                // The hovered item shows what it would do: "remove" turns the cells red, "move" fades what would move.
                onHover: (action) => {
                    if (action === 'remove') highlightDeletion(paper, target); else clearDeletionHighlight();
                    if (action === 'move') fadeCells(paper, actions.getMovedCellsOf(target)); else clearFaded();
                }
            });
        }
    });
}

/**
 * The tools of the hovered element: the "more" tool with the menu of the
 * element it acts on (see `getActionTarget()`). Adding happens on the links
 * and on the add buttons, collapsing on the button of the `start` node.
 * `null` when the element has no tools.
 */
function createHoverTools(paper: dia.Paper, element: dia.Element, actions: ToolActions): dia.ToolsView | null {
    // While a move is on, the drop points are the only tools.
    if (actions.getMoved()) return null;
    const target = getActionTarget(element);
    const menuTool = target && createMenuTool(paper, element, target, actions);
    return menuTool ? new dia.ToolsView({ tools: [menuTool] }) : null;
}

/**
 * The button of a link, a `linkTools.Button` at `distance` along it: a
 * square plus that inserts - or, while a move is on, drops the moved
 * subtree into the link. The same plus as every other drop point; only
 * the tooltip tells.
 */
function createInsertTool(link: LinkModel, distance: number, actions: ToolActions): dia.ToolView {
    const moving = actions.getMoved() !== null;
    return new linkTools.Button({
        distance,
        markup: createInsertButtonMarkup(moving ? 'Move here' : 'Insert here'),
        action: (_evt, _view, tool) => {
            if (moving) {
                actions.dropOnLink(link);
            } else {
                openAddMenu(tool.el, INSERT_CHOICES, (choice) => actions.insertOnLink(link, choice));
            }
        }
    });
}

/** The class on the cells of the subtree being moved, and on the buttons that cannot take it - hidden. */
const MOVING_CLASS = 'moving';
const NO_DROP_CLASS = 'no-drop';

/** The views marked for the move at the moment, to unmark them. */
let markedViews: { view: dia.CellView; className: string }[] = [];

/**
 * Marks the move in progress: the subtree that moves - faded, its links
 * and buttons included - and the buttons that cannot take it - hidden. Nothing
 * while no move is on: the marks of the last one come off.
 */
export function markMove(paper: dia.Paper, actions: ToolActions): void {
    for (const { view, className } of markedViews) highlighters.addClass.remove(view, className);
    markedViews = [];
    const moved = actions.getMoved();
    if (!moved) return;
    const mark = (cell: dia.Cell, className: string, selector: string = 'root'): void => {
        const view = isCellVisible(cell) ? paper.findViewByModel(cell) : undefined;
        if (!view) return;
        highlighters.addClass.add(view, selector, `${className}-${selector}`, { className });
        markedViews.push({ view, className: `${className}-${selector}` });
    };
    for (const cell of actions.getMovedCells()) mark(cell, MOVING_CLASS);
    for (const element of paper.model.getElements()) {
        const hasPillButton = GroupStartModel.isGroupStart(element) ? element.getKind() === 'fork' : DecisionModel.isDecision(element);
        if (hasPillButton) {
            // The button at the right end of a decision or of the start of a fork: only that button, not the pill.
            if (!actions.canDropBelow(element)) {
                mark(element, NO_DROP_CLASS, ADD_BUTTON_SELECTOR);
                mark(element, NO_DROP_CLASS, 'addIcon');
            }
        } else if (AddButtonModel.isAddButton(element)) {
            // The button below a leaf.
            const [parent] = paper.model.getNeighbors(element, { inbound: true });
            if (parent && !actions.canDropBelow(parent)) {
                // The button goes with its link: a link into nothing would hang from the leaf.
                mark(element, NO_DROP_CLASS);
                for (const link of paper.model.getConnectedLinks(element, { inbound: true })) mark(link, NO_DROP_CLASS);
            }
        }
    }
}

/**
 * Whether the link out of `element` has something right below the element:
 * the collapse button of a collapsed group, or the return link of a loop,
 * which leaves the link below the loop and joins it below the loop's start.
 */
function hasSomethingBelow(element: dia.Element): boolean {
    if (GroupModel.isGroup(element)) return element.isCollapsed() || element.getKind() === 'loop';
    return GroupStartModel.isGroupStart(element) && element.getKind() === 'loop';
}

/**
 * Whether `element` is the end of a loop: the link into it from a leaf gets
 * its insert button a fixed distance below the leaf, the mirror image of the
 * link out of the loop's start, whose button sits a fixed distance above its
 * child - the return link runs at equal distances around both.
 */
function isLoopEnd(element: dia.Element): boolean {
    return GroupEndModel.isGroupEnd(element) && element.getGroup().getKind() === 'loop';
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
        if (!(link instanceof LinkModel) || !isCellVisible(link)) continue;
        const view = paper.findViewByModel(link) as dia.LinkView | undefined;
        if (!view) continue;
        if (!canSplit(link)) continue;
        // While a move is on, only the links that can take it get a button.
        if (actions.getMoved() && !actions.canDropOnLink(link)) continue;
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
 * "more" tools and the buttons of the toolbar - each named by its
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
        clearFaded();
        const group = elementView.model.getParentCell();
        if (group && GroupModel.isGroup(group)) actions.toggleGroup(group);
    });

    // Hovering the collapse button dims what it would hide; the pointer leaving it, or the element, restores it.
    const isToggle = (evt: dia.Event): boolean => evt.target instanceof Element && evt.target.closest('[joint-selector="toggle"], [joint-selector="toggleIcon"]') !== null;
    paper.on('element:mouseover', (elementView: dia.ElementView, evt: dia.Event) => {
        const group = elementView.model.getParentCell();
        if (isToggle(evt) && GroupStartModel.isGroupStart(elementView.model) && group && GroupModel.isGroup(group)) {
            highlightCollapse(paper, group);
        } else {
            clearFaded();
        }
    });
    paper.on('element:mouseout', (_elementView: dia.ElementView, evt: dia.Event) => {
        if (isToggle(evt)) clearFaded();
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
        // The "more" tool goes with the hover; so do the previews of its menu and of the collapse button.
        clearDeletionHighlight();
        clearFaded();
        elementView.removeTools();
    });
}
