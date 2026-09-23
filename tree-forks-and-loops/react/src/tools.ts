import { dia, elementTools, util } from '@joint/plus';

import { canRemove } from './actions';
import { isCellPainted } from './layout';
import { Group, Node } from './shapes';
import type { GroupKind } from './shapes';

const BUTTON_RADIUS = 11;
const BUTTON_FILL = '#4666E5';
/** The one button that takes something away is the one button that is not blue. */
const REMOVE_FILL = '#E05263';

const ADD_CHILD_ICON = 'M -5 0 5 0 M 0 -5 0 5';
// A fork: one line splitting into two.
const ADD_FORK_ICON = 'M 0 5 0 0 M 0 0 -4 -5 M 0 0 4 -5';
// A loop: a box of a path that returns to its start.
const ADD_LOOP_ICON = 'M -1 -5 H 4 V 5 H -4 V 0 M -6 2 L -4 0 L -2 2';
// A condition: a line straight down, and a branch off it to the right and down.
const ADD_IF_ICON = 'M -3 -5 V 5 M -3 -2 H 3 V 5';
// A cross: the element goes.
const REMOVE_ICON = 'M -4 -4 L 4 4 M 4 -4 L -4 4';
// Arrows pointing apart: the element gets wider.
const WIDEN_ICON = 'M -5 0 H 5 M -5 0 L -2 -3 M -5 0 L -2 3 M 5 0 L 2 -3 M 5 0 L 2 3';
// Chevrons: up folds the content of the group away, down brings it back.
const COLLAPSE_ICON = 'M -4 2 L 0 -2 L 4 2';
const EXPAND_ICON = 'M -4 -2 L 0 2 L 4 -2';

export interface ToolActions {
    addChild(element: dia.Element): void;
    addGroup(element: dia.Element, kind: GroupKind): void;
    toggle(group: Group): void;
    widen(element: dia.Element): void;
    remove(element: dia.Element): void;
}

interface ButtonOptions {
    icon: string;
    title: string;
    /** Where on the element the button sits - a percentage of its box, or pixels from its top left - and how far off that point. */
    x: number | string;
    y: number | string;
    offsetX?: number;
    offsetY?: number;
    /** The toggle of a group is drawn in reversed colors: a white disc with a blue outline and icon. */
    reversed?: boolean;
    /** Asked on every update of the tools whether the button belongs on the screen. */
    visibility?: (view: dia.ElementView) => boolean;
    /** The disc of the button; blue unless it says otherwise. */
    fill?: string;
    action: () => void;
}

function createButton({ icon, title, x, y, offsetX = 0, offsetY = 0, reversed = false, fill: color = BUTTON_FILL, visibility, action }: ButtonOptions): elementTools.Button {
    const fill = reversed ? '#FFFFFF' : color;
    const stroke = reversed ? color : '#FFFFFF';
    return new elementTools.Button({
        x,
        y,
        offset: { x: offsetX, y: offsetY },
        useModelGeometry: true,
        visibility,
        markup: util.svg/* xml */`
            <circle @selector="body" r="${BUTTON_RADIUS}" fill="${fill}" stroke="${stroke}" stroke-width="1.5" cursor="pointer"/>
            <path d="${icon}" fill="none" stroke="${stroke}" stroke-width="2" pointer-events="none"/>
            <title>${title}</title>
        `,
        action
    });
}

/**
 * The element the tools of the hovered element act on. The tree continues
 * below a group from the group element, so the `start` node of a group stands
 * in for its group: it is the group on the screen, and it is where the toggle
 * is. An expanded group itself takes no tools - its slab lets the pointer
 * through, and is not even drawn most of the time; a collapsed group is a
 * node of the tree and takes them. An `if` stands for the point below it,
 * where its branch comes back: what is added there follows the `if`. The
 * `end` node is a point and takes nothing.
 */
function getToolsTarget(element: dia.Element): dia.Element | null {
    if (Group.isGroup(element)) return element.isCollapsed() ? element : null;
    if (!Node.isNode(element)) return element;
    switch (element.getRole()) {
        case 'start': return element.getParentCell() as dia.Element;
        case 'end': return null;
        default: return element;
    }
}

/** How far apart the add buttons of a hovered element stand, center to center. */
const BUTTON_PITCH = 28;

/**
 * The element the pointer is on, if any. The buttons of a hover are told to
 * ask for it on every update of the tools, rather than being shown and hidden
 * by hand: a tools view shows every tool that was not explicitly hidden the
 * first time it renders, which on an async paper happens after the hiding.
 * The element and not its view, because a layout takes the tools off the paper
 * and puts them back, and the view of an element may be a new one by then -
 * while the pointer has not moved.
 */
let hoveredElement: dia.Element | null = null;

/** Whether the buttons of a hover belong on `view` right now. */
function isHovered(view: dia.ElementView): boolean {
    return view.model === hoveredElement;
}

/**
 * The button in the top left corner of a hovered element, which takes it out
 * of the tree - the whole group, on the start node of one - and hands what
 * hung on it to what it hung on.
 */
function createRemoveButton(element: dia.Element, actions: ToolActions): elementTools.Button {
    return createButton({
        icon: REMOVE_ICON,
        title: 'Remove it',
        x: '0%',
        y: '0%',
        fill: REMOVE_FILL,
        visibility: isHovered,
        action: () => actions.remove(element)
    });
}

/**
 * The button in the top right corner of a hovered element, which makes it
 * wider. The layout reads the sizes of the elements, so the tree is laid out
 * again around it - which is what the button is here to show.
 */
function createWidenButton(element: dia.Element, actions: ToolActions): elementTools.Button {
    return createButton({
        icon: WIDEN_ICON,
        title: 'Make it wider',
        x: '100%',
        y: '0%',
        visibility: isHovered,
        action: () => actions.widen(element)
    });
}

/**
 * The four buttons of a hovered element: add a child node, a fork group, a
 * loop group, an `if` group - all below `target`, centered on the bottom
 * edge. Two on each side of the toggle where the element carries one: five
 * buttons in a row are wider than the element they sit under.
 */
function createHoverButtons(target: dia.Element, actions: ToolActions, withToggle: boolean): elementTools.Button[] {
    const buttons: Array<Omit<ButtonOptions, 'x' | 'y' | 'offsetX'>> = [
        { icon: ADD_CHILD_ICON, title: 'Add a child', action: () => actions.addChild(target) },
        { icon: ADD_FORK_ICON, title: 'Add a fork group', action: () => actions.addGroup(target, 'fork') },
        { icon: ADD_LOOP_ICON, title: 'Add a loop group', action: () => actions.addGroup(target, 'loop') },
        { icon: ADD_IF_ICON, title: 'Add a condition group', action: () => actions.addGroup(target, 'if') }
    ];
    // A row centered on the bottom edge of the element, with the middle place
    // left to the toggle where there is one.
    const places = withToggle ? [-2, -1, 1, 2] : buttons.map((_, index) => index - (buttons.length - 1) / 2);
    return buttons.map((button, index) => createButton({
        ...button,
        x: '50%',
        y: '100%',
        offsetX: places[index] * BUTTON_PITCH,
        visibility: isHovered
    }));
}

/**
 * What a hovered element carries the toggle of: a group hangs it on its
 * `start` node, which is drawn in either state and is where the group is on
 * the screen. Not on the slab, which is switched off most of the time and
 * would take the toggle with it.
 */
function getToggleTarget(element: dia.Element): Group | null {
    if (!Node.isNode(element) || element.getRole() !== 'start') return null;
    const group = element.getParentCell();
    return group && Group.isGroup(group) ? group : null;
}

/**
 * The toggle of a group, a tool shown all the time on the bottom edge of the
 * element that carries it: the `start` node of an expanded group, and the
 * node-sized slab of a collapsed one. Both are the same place on the screen -
 * a group is as wide as its start node at the top and its box begins there.
 * Drawn in the layer of the tools, over the slab and the node alike.
 */
function createToggleButtons(group: Group, actions: ToolActions): elementTools.Button[] {
    const collapsed = group.isCollapsed();
    return [createButton({
        icon: collapsed ? EXPAND_ICON : COLLAPSE_ICON,
        title: collapsed ? 'Show what is folded away' : 'Fold the content away',
        x: '50%',
        y: '100%',
        reversed: true,
        action: () => actions.toggle(group)
    })];
}

/** The tools of a view: the view of all of them, and the buttons of a hover among them, shown and hidden as the pointer comes and goes. */
interface ViewTools {
    view: dia.ToolsView;
    hoverButtons: elementTools.Button[];
}

const toolsByView = new WeakMap<dia.ElementView, ViewTools>();

/**
 * Puts the tools on the view of `element`: the toggle of a group, and the
 * buttons of a hover, which show while the pointer is on it. Says where the
 * pointer is with `hovered`; called without it - after a layout - it leaves
 * the hover where it was, so that the buttons of an element the pointer never
 * left come back with its tools. The tools are built once
 * per view and then shown or hidden, never rebuilt on a hover: a tool
 * carries the id of its element, so the pointer entering a tool is an
 * `element:mouseenter` of the element too, and a rebuild then would replace
 * the tool under the pointer - and fire the event again, and swallow the click.
 */
export function updateTools(elementView: dia.ElementView, actions: ToolActions, hovered?: boolean): void {
    if (hovered !== undefined) hoveredElement = hovered ? elementView.model : null;
    const element = elementView.model;
    let tools = toolsByView.get(elementView);
    if (!tools || !elementView.hasTools()) {
        const target = getToolsTarget(element);
        const toggleTarget = getToggleTarget(element);
        const toggle = toggleTarget ? createToggleButtons(toggleTarget, actions) : [];
        const hoverButtons = target ? createHoverButtons(target, actions, toggle.length > 0) : [];
        // Every node can be made wider, whether or not it takes the other
        // buttons, and every node but the root of the tree can go.
        if (Node.isNode(element) && element.getRole() !== 'end') {
            hoverButtons.push(createWidenButton(element, actions));
            if (element.graph && canRemove(element.graph, element)) hoverButtons.push(createRemoveButton(element, actions));
        }
        if (toggle.length + hoverButtons.length === 0) return;
        const view = new dia.ToolsView({ tools: [...toggle, ...hoverButtons] });
        elementView.addTools(view);
        tools = { view, hoverButtons };
        toolsByView.set(elementView, tools);
    }
    // A tools view mounts on its first update with a visible tool: one with
    // every tool hidden - a node's, until its first hover - is not in the
    // DOM yet, and the hover alone does not put it there.
    elementView.updateTools();
}

/**
 * Shows the toggles of the drawn groups - after every layout, which takes
 * the tools off the paper first (a hidden view is not disposed while it has
 * tools) - and, while an element is hovered, its four add buttons. Not for
 * the content of a collapsed group, nor for a group whose slab is off: the
 * paper keeps its views, but the tools live in a layer of their own and
 * would show without the cells.
 */
export function addTools(paper: dia.Paper, actions: ToolActions): void {
    for (const element of paper.model.getElements()) {
        if (!isCellPainted(element)) continue;
        const view = paper.findViewByModel(element) as dia.ElementView | undefined;
        if (view) updateTools(view, actions);
    }
}

