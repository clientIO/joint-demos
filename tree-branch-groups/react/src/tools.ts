import { dia, elementTools, linkTools, util } from '@joint/plus';

import { canDelete, canInsertGroup, getGrowthDirection, isEmptyPath } from './actions';
import { openAddMenu } from './add-menu';
import { Node } from './shapes';
import type { Group, GroupKind } from './shapes';

const BUTTON_RADIUS = 11;
const BUTTON_FILL = '#4666E5';
const DELETE_FILL = '#E54666';
const BUTTON_SPACING = 28;

const ADD_CHILD_ICON = 'M -5 0 5 0 M 0 -5 0 5';
// A fork: one line splitting into two.
const ADD_BRANCH_ICON = 'M 0 5 0 0 M 0 0 -4 -5 M 0 0 4 -5';
// A loop: an open circle with an arrow head at its end.
const ADD_CYCLE_ICON = 'M 3.5 -3.5 A 5 5 0 1 0 3.5 3.5 M 3.5 3.5 0.2 3.2 M 3.5 3.5 3.6 0.2';
const DELETE_ICON = 'M -4 -4 4 4 M -4 4 4 -4';
const COLLAPSE_ICON = 'M -4 0 4 0';
const EXPAND_ICON = 'M -4 0 4 0 M 0 -4 0 4';

export interface ToolActions {
    addChild(element: dia.Element): void;
    addGroup(element: dia.Element, kind: GroupKind): void;
    delete(element: dia.Element): void;
    insertNode(link: dia.Link): void;
    toggleGroup(group: Group): void;
}

interface ButtonOptions {
    icon: string;
    title: string;
    fill: string;
    /** The position on the element, in percent, plus an offset in pixels. */
    x: string;
    y: string;
    offset: { x: number; y: number };
    action: () => void;
}

function createButtonMarkup(icon: string, title: string, fill: string): dia.MarkupJSON {
    return util.svg/* xml */`
        <circle @selector="body" r="${BUTTON_RADIUS}" fill="${fill}" stroke="#FFFFFF" stroke-width="1.5" cursor="pointer"/>
        <path d="${icon}" fill="none" stroke="#FFFFFF" stroke-width="2" pointer-events="none"/>
        <title>${title}</title>
    `;
}

function createButton({ icon, title, fill, x, y, offset, action }: ButtonOptions): elementTools.Button {
    return new elementTools.Button({
        x,
        y,
        offset,
        useModelGeometry: true,
        markup: createButtonMarkup(icon, title, fill),
        action
    });
}

/**
 * The element the "add" tools of the hovered element act on. The tree
 * continues below a group from the group element, so the `start` node of a
 * collapsed group stands in for it while the `end` is hidden. An expanded
 * `start` adds nothing: it has its branches. The `end` node has no hover
 * tools either - it is a button, and a click on it opens the add menu (see
 * `handleElementClick()`).
 */
function getAddTarget(element: dia.Element): dia.Element | null {
    if (!Node.isNode(element)) return element;
    const group = element.getParentCell() as Group | null;
    switch (element.getRole()) {
        case 'start': return group?.isCollapsed() ? group : null;
        case 'end': return null;
        default: return element;
    }
}

/**
 * A click on the `end` node of a group - its plus button - opens a menu with
 * what can be added below the group: a node, a branch group, a cycle group.
 * Clicks on other elements do nothing.
 */
export function handleElementClick(view: dia.ElementView, actions: ToolActions): void {
    const element = view.model;
    if (!Node.isNode(element) || element.getRole() !== 'end') return;
    const group = element.getParentCell() as Group;
    openAddMenu(view.el, (choice) => {
        if (choice === 'node') actions.addChild(group);
        else actions.addGroup(group, choice);
    });
}

/**
 * The element the "delete" tool of the hovered element acts on: a plain node
 * deletes itself, the `start` node of a group deletes the group. The `end`
 * node deletes nothing - it is the button that adds below the group.
 */
function getDeleteTarget(element: dia.Element): dia.Element | null {
    if (!Node.isNode(element)) return element;
    switch (element.getRole()) {
        case 'start': return element.getParentCell() as Group;
        case 'end': return null;
        default: return element;
    }
}

/**
 * The "add" tools acting on `target`: a row of buttons centered on the edge
 * the tree grows from - the bottom edge, or the top edge on the return path
 * of a cycle: add a child node and, where a group reads top-down, add a
 * branch group or a cycle group as a child.
 */
function createAddTools(graph: dia.Graph, target: dia.Element, actions: ToolActions): dia.ToolView[] {
    const growthEdge = getGrowthDirection(graph, target) === 'up' ? '0%' : '100%';

    const addButtons: Array<[icon: string, title: string, action: () => void]> = [
        [ADD_CHILD_ICON, 'Add a child', () => actions.addChild(target)]
    ];
    if (canInsertGroup(graph, target)) {
        addButtons.push(
            [ADD_BRANCH_ICON, 'Add a branch group', () => actions.addGroup(target, 'branch')],
            [ADD_CYCLE_ICON, 'Add a cycle group', () => actions.addGroup(target, 'cycle')]
        );
    }
    // The row of buttons is centered on the edge.
    const firstOffset = -(addButtons.length - 1) * BUTTON_SPACING / 2;
    return addButtons.map(([icon, title, action], index) => createButton({
        icon,
        title,
        fill: BUTTON_FILL,
        x: '50%',
        y: growthEdge,
        offset: { x: firstOffset + index * BUTTON_SPACING, y: 0 },
        action
    }));
}

/**
 * The "delete" tool acting on `target`, in the corner of the hovered element
 * on the edge opposite to the one the tree grows from. `null` when the
 * target cannot be deleted.
 */
function createDeleteTool(graph: dia.Graph, target: dia.Element, actions: ToolActions): dia.ToolView | null {
    if (!canDelete(graph, target)) return null;
    const oppositeEdge = getGrowthDirection(graph, target) === 'up' ? '100%' : '0%';
    return createButton({
        icon: DELETE_ICON,
        title: Node.isNode(target) ? 'Delete the node' : 'Delete the group',
        fill: DELETE_FILL,
        x: '100%',
        y: oppositeEdge,
        offset: { x: 0, y: 0 },
        action: () => actions.delete(target)
    });
}

/** The collapse/expand button of a group, in the top left corner of its `start` node. */
function createToggleTool(group: Group, actions: ToolActions): dia.ToolView {
    const collapsed = group.isCollapsed();
    return createButton({
        icon: collapsed ? EXPAND_ICON : COLLAPSE_ICON,
        title: collapsed ? 'Expand the group' : 'Collapse the group',
        fill: BUTTON_FILL,
        x: '0%',
        y: '0%',
        offset: { x: 0, y: 0 },
        action: () => actions.toggleGroup(group)
    });
}

/**
 * The tools of the hovered element: the toggle of its group on a `start`
 * node, the "add" tools of the element it adds below and the "delete" tool
 * of the element it deletes (see `getAddTarget()` and `getDeleteTarget()`).
 * `null` when the element has no tools.
 */
export function createHoverTools(graph: dia.Graph, element: dia.Element, actions: ToolActions): dia.ToolsView | null {
    const tools: dia.ToolView[] = [];
    if (Node.isNode(element) && element.getRole() === 'start') {
        tools.push(createToggleTool(element.getParentCell() as Group, actions));
    }
    const addTarget = getAddTarget(element);
    if (addTarget) tools.push(...createAddTools(graph, addTarget, actions));
    const deleteTarget = getDeleteTarget(element);
    const deleteTool = deleteTarget && createDeleteTool(graph, deleteTarget, actions);
    if (deleteTool) tools.push(deleteTool);
    return tools.length > 0 ? new dia.ToolsView({ tools }) : null;
}

/**
 * The tools of a hovered link: a button in the middle of an emptied path
 * (a link from one gate of a group straight to the other) that inserts a node
 * into it. Every other link has no tools.
 */
export function createLinkTools(link: dia.Link, actions: ToolActions): dia.ToolsView | null {
    if (!isEmptyPath(link)) return null;
    return new dia.ToolsView({
        tools: [
            new linkTools.Button({
                distance: '50%',
                markup: createButtonMarkup(ADD_CHILD_ICON, 'Insert a node', BUTTON_FILL),
                action: () => actions.insertNode(link)
            })
        ]
    });
}
