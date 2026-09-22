import { dia, elementTools, g, highlighters, linkTools, ui, util } from '@joint/plus';

import { canAddTerminal, canDelete, canSplit, getActionTarget, getDeleteTitle, getDeletedCells } from './actions';
import { isCellVisible } from './layout';
import { openAddMenu, openMenu } from './menu';
import type { AddChoice } from './menu';
import { ADD_BUTTON_SELECTOR, ADD_BUTTON_SIZE, AddButtonModel, BRANCH_LABEL_OFFSET_ALONG, COLORS, DROP_POINT_SIZE, DecisionModel, EndModel, GroupModel, GroupEndModel, GroupStartModel, INSERT_BUTTON_FROM_TARGET, LinkModel, PLUS_ICON, TOGGLE_EVENT } from './shapes';
import { setAddButtonSize } from './shapes/pill';

/** The insert buttons are squares, so that they differ from the round toggle and "more" buttons: blue, marked in white like every add button, outlined in the color of the paper. */
const ADD_FILL = COLORS.button.fill;
const ADD_OUTLINE = COLORS.button.outline;
const ADD_MARK = COLORS.button.text;
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

/** The "move to" item of the menu of an element: an arrow out and down, in the teal of a move. */
const MOVE_ICON = 'M -6 -6 V 6 H 6 M 6 6 L 2 2 M 6 6 L 2 10';

/** The markup of the square button of a link, `size` wide and high: a plus, named by its tooltip (see `addTooltips()`). */
function createInsertButtonMarkup(title: string, size: number): dia.MarkupJSON {
    const half = size / 2;
    // The class picks the hover color in the stylesheet.
    return util.svg/* xml */`
        <rect @selector="body" class="button add" x="${-half}" y="${-half}" width="${size}" height="${size}" rx="3" ry="3" fill="${ADD_FILL}" stroke="${ADD_OUTLINE}" stroke-width="1.5" cursor="pointer" data-tooltip="${title}"/>
        <path d="${ADD_ICON}" transform="scale(${size / INSERT_BUTTON_SIZE})" fill="none" stroke="${ADD_MARK}" stroke-width="2" pointer-events="none"/>
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
 * Keeps the browser's own context menu from opening on the right click that
 * opens ours. JointJS reports the click on the press, and the `contextmenu`
 * event follows - by then our menu is under the pointer, outside the paper,
 * and the paper's own `preventDefault()` no longer reaches it.
 */
function suppressNativeContextMenu(): void {
    document.addEventListener('contextmenu', (evt) => evt.preventDefault(), { once: true, capture: true });
}

/**
 * A mark on cells: a class on their views - the visible ones; the content
 * of a collapsed group has none - which the stylesheet colors (see the
 * previews and the marks of a move there). The marker remembers the views
 * it marked, to take the mark off again.
 */
class ViewMarker {
    private marked: { view: dia.CellView; id: string }[] = [];

    constructor(private readonly className: string) {}

    /** Marks `cells` on `selector` of their views - the whole view by default - on top of what is marked. */
    add(paper: dia.Paper, cells: Iterable<dia.Cell>, selector = 'root'): void {
        const id = `${this.className}-${selector}`;
        for (const cell of cells) {
            if (!isCellVisible(cell)) continue;
            const view = paper.findViewByModel(cell);
            if (!view) continue;
            highlighters.addClass.add(view, selector, id, { className: this.className });
            this.marked.push({ view, id });
        }
    }

    /** Marks `cells` alone: what was marked before is unmarked first. */
    set(paper: dia.Paper, cells: Iterable<dia.Cell>): void {
        this.clear();
        this.add(paper, cells);
    }

    clear(): void {
        for (const { view, id } of this.marked) highlighters.addClass.remove(view, id);
        this.marked = [];
    }
}

/** The previews of the menu of an element and of the collapse button: what a hovered "remove" item would remove, in red; what a hovered "move" item would move, in teal; what a collapse would hide, faded. */
const deletionPreview = new ViewMarker('to-be-deleted');
const movePreview = new ViewMarker('to-be-moved');
const collapsePreview = new ViewMarker('faded');

/** Takes every preview off: on a rebuild, and when the pointer leaves the element. */
export function clearPreviews(): void {
    deletionPreview.clear();
    movePreview.clear();
    collapsePreview.clear();
}

/** Turns the cells a deletion of `target` would remove red. The add buttons among them are left alone: buttons do not turn red. */
function previewDeletion(paper: dia.Paper, target: dia.Element): void {
    deletionPreview.set(paper, getDeletedCells(paper.model, target).filter((cell) => !AddButtonModel.isAddButton(cell)));
}

/**
 * Fades what a collapse of `group` would hide - its content, nested groups
 * included, and the links of the content. The start of the group stays: it
 * stands in for the collapsed group. Nothing for a group already collapsed.
 */
function previewCollapse(paper: dia.Paper, group: GroupModel): void {
    if (group.isCollapsed()) {
        collapsePreview.clear();
        return;
    }
    const start = group.getStart();
    const content = group.getEmbeddedCells({ deep: true }).filter((cell) => cell !== start);
    const links = content.filter((cell) => cell.isElement()).flatMap((cell) => paper.model.getConnectedLinks(cell));
    collapsePreview.set(paper, new Set([...content, ...links]));
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
        action: (_evt, _view, tool) => openElementMenu(paper, target, tool.el, actions)
    });
}

/**
 * The menu of an element, acting on `target` (see `getActionTarget()`),
 * below `anchor` - the "more" button, or the pointer of a right click: its
 * move and its removal; hovering an item shows what it would do.
 */
function openElementMenu(paper: dia.Paper, target: dia.Element, anchor: HTMLElement | SVGElement | g.PlainPoint, actions: ToolActions): void {
    openMenu(anchor, [
        // Greyed out when there is nowhere to move the element to.
        { action: 'move', label: 'Move to…', icon: MOVE_ICON, color: COLORS.move, disabled: !actions.canMove(target) },
        { action: 'remove', label: getDeleteTitle(target), icon: DELETE_ICON, color: DELETE_FILL }
    ], {
        onChoose: (action) => (action === 'move' ? actions.startMove(target) : actions.delete(target)),
        // The hovered item shows what it would do: "remove" turns the cells red, "move" marks what would move.
        onHover: (action) => {
            if (action === 'remove') previewDeletion(paper, target); else deletionPreview.clear();
            if (action === 'move') movePreview.set(paper, actions.getMovedCellsOf(target)); else movePreview.clear();
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
 * subtree into the link: larger then, like every other drop point.
 */
function createInsertTool(link: LinkModel, distance: number, actions: ToolActions): dia.ToolView {
    const moving = actions.getMoved() !== null;
    return new linkTools.Button({
        distance,
        markup: createInsertButtonMarkup(moving ? 'Move here' : 'Insert here', moving ? DROP_POINT_SIZE : INSERT_BUTTON_SIZE),
        action: (_evt, _view, tool) => {
            if (moving) {
                actions.dropOnLink(link);
            } else {
                openAddMenu(tool.el, INSERT_CHOICES, (choice) => actions.insertOnLink(link, choice));
            }
        }
    });
}

/** The marks of a move in progress: the subtree being moved - faded - and the buttons that cannot take it - hidden. */
const movingMark = new ViewMarker('moving');
const noDropMark = new ViewMarker('no-drop');

/**
 * Marks the move in progress: the subtree that moves - faded, its links
 * and buttons included - the buttons that cannot take it - hidden - and the
 * buttons that can, the drop points - larger. With no move on, the marks of
 * the last one come off and the buttons are their usual size.
 */
export function markMove(paper: dia.Paper, actions: ToolActions): void {
    movingMark.clear();
    noDropMark.clear();
    const moved = actions.getMoved();
    if (moved) movingMark.add(paper, actions.getMovedCells());
    const buttonSize = (takes: boolean): number => (takes ? DROP_POINT_SIZE : ADD_BUTTON_SIZE.width);
    for (const element of paper.model.getElements()) {
        const hasPillButton = GroupStartModel.isGroupStart(element) ? element.getKind() === 'fork' : DecisionModel.isDecision(element);
        if (hasPillButton) {
            // The button at the right end of a decision or of the start of a fork: only that button, not the pill.
            const takes = moved !== null && actions.canDropBelow(element);
            setAddButtonSize(element, buttonSize(takes));
            if (moved && !takes) {
                noDropMark.add(paper, [element], ADD_BUTTON_SELECTOR);
                noDropMark.add(paper, [element], 'addIcon');
            }
        } else if (AddButtonModel.isAddButton(element)) {
            // The button below a leaf.
            const [parent] = paper.model.getNeighbors(element, { inbound: true });
            const takes = moved !== null && parent !== undefined && actions.canDropBelow(parent);
            element.setButtonSize(buttonSize(takes));
            if (moved && !takes) {
                // The button goes with its link: a link into nothing would hang from the leaf.
                noDropMark.add(paper, [element, ...paper.model.getConnectedLinks(element, { inbound: true })]);
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
 * Where the insert button of a link goes, as a distance along its route:
 * the middle of its longest vertical part - the part the link has of its
 * own, not the one it shares with its siblings on a bar, and never a
 * horizontal part. When the link leaves an element with something right
 * below it (see `hasSomethingBelow()`) - the collapse button of a collapsed
 * group, the return link of a loop - the button sits near the child instead,
 * a fixed distance from the target, whatever room the link was given; when
 * it joins the end of a loop, a fixed distance from the source (see
 * `isLoopEnd()`). `null` for a link without a vertical part.
 */
function getInsertButtonDistance(link: LinkModel): number | null {
    const { points, path } = link.getConnection();
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
    const source = link.getSourceElement();
    const target = link.getTargetElement();
    if (longestIndex === 0 && source && hasSomethingBelow(source)) {
        // Such a link is straight: the button sits a fixed distance above the child.
        return Math.max(path.length() - INSERT_BUTTON_FROM_TARGET, INSERT_BUTTON_SIZE);
    }
    if (longestIndex === 0 && target && isLoopEnd(target)) {
        // The vertical part leaves the leaf: the button sits a fixed distance below it.
        return Math.min(INSERT_BUTTON_FROM_TARGET, longest.length() - INSERT_BUTTON_SIZE);
    }
    const point = longest.pointAtLength(longest.length() / 2);
    return path.closestPointLength(point);
}

/**
 * Gives every visible link that can be split its insert button, a link tool
 * that stays on: not a hover tool. The button sits on the longest vertical
 * part of the link, and so does the name of an option, a label above it.
 * (The return link of a loop cannot be split; its own label, an arrow, keeps
 * its place in the middle of the link.)
 * The routes are read from the models (see `LinkModel.getConnection()`), so
 * this runs right after every layout - and after `paper.removeTools()`,
 * which takes the buttons of the previous layout away.
 */
export function placeLinkTools(paper: dia.Paper, actions: ToolActions): void {
    for (const link of paper.model.getLinks()) {
        if (!(link instanceof LinkModel) || !isCellVisible(link)) continue;
        if (!canSplit(link)) continue;
        // While a move is on, only the links that can take it get a button.
        if (actions.getMoved() && !actions.canDropOnLink(link)) continue;
        const distance = getInsertButtonDistance(link);
        if (distance === null) continue;
        const view = paper.findViewByModel(link) as dia.LinkView | undefined;
        if (!view) continue;
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
        collapsePreview.clear();
        const group = elementView.model.getParentCell();
        if (group && GroupModel.isGroup(group)) actions.toggleGroup(group);
    });

    // Hovering the collapse button dims what it would hide; the pointer leaving it, or the element, restores it.
    const isToggle = (evt: dia.Event): boolean => evt.target instanceof Element && evt.target.closest('[joint-selector="toggle"], [joint-selector="toggleIcon"]') !== null;
    paper.on('element:mouseover', (elementView: dia.ElementView, evt: dia.Event) => {
        const group = elementView.model.getParentCell();
        if (isToggle(evt) && GroupStartModel.isGroupStart(elementView.model) && group && GroupModel.isGroup(group)) {
            previewCollapse(paper, group);
        } else {
            collapsePreview.clear();
        }
    });
    paper.on('element:mouseout', (_elementView: dia.ElementView, evt: dia.Event) => {
        if (isToggle(evt)) collapsePreview.clear();
    });

    paper.on('element:pointerclick', (elementView: dia.ElementView, evt: dia.Event) => {
        handleElementClick(elementView, evt, actions);
    });

    // A right click on an element opens the menu of its "more" button, at the pointer.
    paper.on('element:contextmenu', (elementView: dia.ElementView, evt: dia.Event) => {
        evt.preventDefault();
        if (actions.getMoved()) return;
        const target = getActionTarget(elementView.model);
        if (!target || !canDelete(paper.model, target)) return;
        openElementMenu(paper, target, { x: evt.clientX!, y: evt.clientY! }, actions);
        suppressNativeContextMenu();
    });

    paper.on('element:mouseenter', (elementView: dia.ElementView) => {
        const tools = createHoverTools(paper, elementView.model, actions);
        if (!tools) return;
        elementView.removeTools();
        elementView.addTools(tools);
    });

    paper.on('element:mouseleave', (elementView: dia.ElementView) => {
        // The "more" tool goes with the hover; so do the previews of its menu and of the collapse button.
        clearPreviews();
        elementView.removeTools();
    });
}
