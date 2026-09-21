import { dia, elementTools, util } from '@joint/plus';

import { isCellVisible } from './layout';
import { Group, NODE_SIZE, Node } from './shapes';
import type { GroupKind } from './shapes';

const BUTTON_RADIUS = 11;
const BUTTON_FILL = '#4666E5';

const ADD_CHILD_ICON = 'M -5 0 5 0 M 0 -5 0 5';
// A fork: one line splitting into two.
const ADD_FORK_ICON = 'M 0 5 0 0 M 0 0 -4 -5 M 0 0 4 -5';
// A loop: a box of a path that returns to its start.
const ADD_LOOP_ICON = 'M -1 -5 H 4 V 5 H -4 V 0 M -6 2 L -4 0 L -2 2';
// Chevrons: up folds the content of the group away, down brings it back.
const COLLAPSE_ICON = 'M -4 2 L 0 -2 L 4 2';
const EXPAND_ICON = 'M -4 -2 L 0 2 L 4 -2';

export interface ToolActions {
    addChild(element: dia.Element): void;
    addGroup(element: dia.Element, kind: GroupKind): void;
    toggleGroup(group: Group): void;
}

interface ButtonOptions {
    icon: string;
    title: string;
    /** Where on the element the button sits - a percentage of its box, or pixels from its top left - and how far off that point. */
    x: number | string;
    y: number | string;
    offsetX?: number;
    /** The toggle of a group is drawn in reversed colors: a white disc with a blue outline and icon. */
    reversed?: boolean;
    action: () => void;
}

function createButton({ icon, title, x, y, offsetX = 0, reversed = false, action }: ButtonOptions): elementTools.Button {
    const fill = reversed ? '#FFFFFF' : BUTTON_FILL;
    const stroke = reversed ? BUTTON_FILL : '#FFFFFF';
    return new elementTools.Button({
        x,
        y,
        offset: { x: offsetX, y: 0 },
        useModelGeometry: true,
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
 * below a group from the group element, so the `end` node of a group stands
 * in for its group; an expanded group itself has none - its slab lets the
 * pointer through. A collapsed group is a node of the tree and takes the
 * tools. The `start` node has none either - it has its branches.
 */
function getToolsTarget(element: dia.Element): dia.Element | null {
    if (Group.isGroup(element)) return element.isCollapsed() ? element : null;
    if (!Node.isNode(element)) return element;
    switch (element.getRole()) {
        case 'start': return null;
        case 'end': return element.getParentCell() as dia.Element;
        default: return element;
    }
}

/**
 * The three buttons of a hovered element: add a child node, a fork group,
 * a loop group - all below `target`, centered on the bottom edge; right of
 * the toggle on a collapsed group, which carries one there.
 */
function createHoverButtons(target: dia.Element, actions: ToolActions, shift: number): elementTools.Button[] {
    return [
        createButton({ icon: ADD_CHILD_ICON, title: 'Add a child', x: '50%', y: '100%', offsetX: shift - 28, action: () => actions.addChild(target) }),
        createButton({ icon: ADD_FORK_ICON, title: 'Add a fork group', x: '50%', y: '100%', offsetX: shift, action: () => actions.addGroup(target, 'fork') }),
        createButton({ icon: ADD_LOOP_ICON, title: 'Add a loop group', x: '50%', y: '100%', offsetX: shift + 28, action: () => actions.addGroup(target, 'loop') })
    ];
}

/**
 * The toggle of a group, a tool on the group shown all the time. Its top
 * center is the top center of its `start` node, so a node's height down the
 * middle is the bottom edge of `start` when the group is expanded - and the
 * bottom edge of the group itself, node-sized, when it is collapsed. Drawn
 * in the layer of the tools, over the slab and the node alike.
 */
function createToggleButtons(group: Group, actions: ToolActions): elementTools.Button[] {
    const collapsed = group.isCollapsed();
    return [createButton({
        icon: collapsed ? EXPAND_ICON : COLLAPSE_ICON,
        title: collapsed ? 'Expand the group' : 'Collapse the group',
        x: '50%',
        y: NODE_SIZE.height,
        reversed: true,
        action: () => actions.toggleGroup(group)
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
 * buttons of a hover, shown while it is `hovered`. The tools are built once
 * per view and then shown or hidden, never rebuilt on a hover: a tool
 * carries the id of its element, so the pointer entering a tool is an
 * `element:mouseenter` of the element too, and a rebuild then would replace
 * the tool under the pointer - and fire the event again, and swallow the click.
 */
function updateTools(elementView: dia.ElementView, actions: ToolActions, hovered: boolean): void {
    const element = elementView.model;
    let tools = toolsByView.get(elementView);
    if (!tools || !elementView.hasTools()) {
        const target = getToolsTarget(element);
        const toggle = Group.isGroup(element) ? createToggleButtons(element, actions) : [];
        // A collapsed group carries its toggle where the buttons would go: they stand right of it.
        const hoverButtons = target ? createHoverButtons(target, actions, toggle.length > 0 ? 56 : 0) : [];
        if (toggle.length + hoverButtons.length === 0) return;
        const view = new dia.ToolsView({ tools: [...toggle, ...hoverButtons] });
        elementView.addTools(view);
        tools = { view, hoverButtons };
        toolsByView.set(elementView, tools);
    }
    for (const button of tools.hoverButtons) {
        if (hovered) button.show(); else button.hide();
    }
    // A tools view mounts on its first update with a visible tool: one with
    // every tool hidden - a node's, until its first hover - is not in the
    // DOM yet, and `show()` alone does not put it there.
    elementView.updateTools();
}

/**
 * Shows the toggles of the visible groups - after every layout, which
 * takes the tools off the paper first (a hidden view is not disposed while
 * it has tools) - and, while an element is hovered, its three add buttons.
 * Not for the content of a collapsed group: the paper keeps its views, but
 * the tools live in a layer of their own and would show without the cells.
 */
export function addTools(paper: dia.Paper, actions: ToolActions): void {
    for (const element of paper.model.getElements()) {
        if (!isCellVisible(element)) continue;
        const view = paper.findViewByModel(element) as dia.ElementView | undefined;
        if (view) updateTools(view, actions, false);
    }
}

export function addHoverTools(paper: dia.Paper, actions: ToolActions): void {
    paper.on('element:mouseenter', (elementView: dia.ElementView) => updateTools(elementView, actions, true));
    paper.on('element:mouseleave', (elementView: dia.ElementView) => updateTools(elementView, actions, false));
}
