import type { dia, g } from '@joint/plus';

import { layoutForkGroup } from './fork-group';
import { LOOP_GAP, LOOP_START_ROOM, layoutLoopGroup } from './loop-group';
import { AddButton, Group, Link, NODE_SIZE, Node } from './shapes';
import type { GroupKind } from './shapes';
import { createTreeLayout } from './tree-layout';

/**
 * A cell is hidden by a collapse when one of its ancestors is a collapsed
 * group - unless the cell is the `start` node of that group, which stays
 * visible and stands in for the group. A group nested in a collapsed group
 * hides its `start` as well.
 */
export function isHiddenByCollapse(cell: dia.Cell): boolean {
    return cell.getAncestors().some((ancestor) => {
        if (!Group.isGroup(ancestor) || !ancestor.isCollapsed()) return false;
        return !(Node.isNode(cell) && cell.getRole() === 'start' && cell.getParentCell() === ancestor);
    });
}

/**
 * The visibility predicate of the paper (`cellVisibility`). A group is never
 * rendered - it is a node of the layout, not of the picture. A link
 * disappears together with either of its end elements, which covers the
 * outer links of a group nested inside a collapsed group.
 */
export function isCellVisible(cell: dia.Cell): boolean {
    if (Group.isGroup(cell)) return false;
    if (isHiddenByCollapse(cell)) return false;
    if (cell.isLink()) {
        const source = cell.getSourceElement();
        const target = cell.getTargetElement();
        if (!source || !target) return false;
        return !isHiddenByCollapse(source) && !isHiddenByCollapse(target);
    }
    return true;
}

/** The word the options of a decision or the branches of a fork are named with: `option 1`, `option 2`, ... */
const OPTION_NAME = 'option';

/**
 * Extra room between a decision (or the start of a fork) and its children,
 * so that the name of an option fits next to the insert button of its link.
 * The tree layout reads it from the `offset` attribute of the child.
 */
const OPTION_ROOM = 30;

/** The kind of the group `element` is the start of, if it is one. */
function getStartedKind(element: dia.Element): GroupKind | null {
    if (!Node.isNode(element) || element.getRole() !== 'start') return null;
    const group = element.getParentCell();
    return group !== null && Group.isGroup(group) ? group.getKind() : null;
}

/** Whether the children of `element` are its options: a decision, or the start of a fork. */
function hasOptions(element: dia.Element): boolean {
    return (Node.isNode(element) && element.isDecision()) || getStartedKind(element) === 'fork';
}

/** Extra room below a loop: the return link leaves the link out of it there. */
const LOOP_ROOM = 15;

/**
 * The room the children of `element` need below it for a reason other than
 * a name: below a collapsed group, whose pill carries the collapse button;
 * below the start of a loop, whose pill carries it too and where the return
 * link joins the link out of it; below a loop, where the return link leaves
 * the link out of it. The insert button of such a link sits at the far end,
 * near the child (see `placeLinkTools()`).
 */
function getRoomBelow(element: dia.Element): number {
    if (Group.isGroup(element)) {
        if (element.isCollapsed()) return OPTION_ROOM;
        return element.getKind() === 'loop' ? LOOP_ROOM : 0;
    }
    return getStartedKind(element) === 'loop' ? LOOP_START_ROOM : 0;
}

/** The options of `parent`: its children, gates and add buttons aside. */
function getOptions(graph: dia.Graph, parent: dia.Element): dia.Element[] {
    return graph.getNeighbors(parent, { outbound: true })
        .filter((child) => !(Node.isNode(child) && child.isGate()) && !AddButton.isAddButton(child));
}

/**
 * Gives the options of every decision and every fork the room their names
 * need, and the children of some elements the room that keeps the insert
 * button of their link clear (see `getRoomBelow()`); takes
 * it away from every other element (a node moved down by an insertion, for
 * one). Before the layout, which reads the `offset`.
 */
function makeRoomForOptions(graph: dia.Graph): void {
    for (const element of graph.getElements()) {
        if (Node.isNode(element) && element.isGate()) continue;
        element.set({ offset: 0 });
    }
    for (const parent of graph.getElements()) {
        const room = hasOptions(parent) ? OPTION_ROOM : getRoomBelow(parent);
        if (room === 0) continue;
        for (const child of getOptions(graph, parent)) child.set({ offset: room });
    }
}

/**
 * Names the links from every decision and every fork to their options
 * `option 1`, `option 2`, ... from left to right - or as the option was
 * named (`nameOption()`) - and takes the name off every other link. After
 * the layout, which decides the order.
 */
function nameOptions(graph: dia.Graph): void {
    for (const link of graph.getLinks()) {
        if (link instanceof Link) link.setBranchName(null);
    }
    for (const parent of graph.getElements().filter(hasOptions)) {
        const options = getOptions(graph, parent).sort((a, b) => a.getBBox().center().x - b.getBBox().center().x);
        for (const link of graph.getConnectedLinks(parent, { outbound: true })) {
            const option = link.getTargetElement()!;
            const index = options.indexOf(option);
            if (index < 0 || !(link instanceof Link)) continue;
            const name = option.get('optionName') as string | undefined;
            link.setBranchName(name ?? `${OPTION_NAME} ${index + 1}`);
        }
    }
}

/**
 * Gives every expanded loop with a sibling on its left extra room before it
 * (`prevSiblingGap`), for its return link, which runs outside of the box of
 * the group. Not a loop without one: the tree layout would shift a lone
 * child by half the gap, and a loop below a single parent is to line up
 * with it. Not a collapsed loop either: it shows no return link.
 */
function makeRoomForReturnLinks(graph: dia.Graph): void {
    for (const group of graph.getElements().filter(Group.isGroup)) {
        if (group.getKind() !== 'loop') continue;
        // A collapsed loop shows no return link: no room for it.
        const [parent] = graph.getNeighbors(group, { inbound: true });
        const siblings = parent && !group.isCollapsed() ? getOptions(graph, parent) : [];
        siblings.sort((a, b) => ((a.get('siblingRank') ?? 0) - (b.get('siblingRank') ?? 0)) || (a.getBBox().x - b.getBBox().x));
        group.set({ prevSiblingGap: siblings.indexOf(group) > 0 ? LOOP_GAP : 0 });
    }
}

/** Lays out the content of an expanded group; each kind of group has a layout of its own. */
function layoutGroup(graph: dia.Graph, group: Group): void {
    switch (group.getKind()) {
        case 'fork': return layoutForkGroup(graph, group);
        case 'loop': return layoutLoopGroup(graph, group);
    }
}

/**
 * Lays out the whole diagram bottom-up: the deepest groups first, because a
 * group is a single node of the tree that contains it and its size has to be
 * known before that tree is laid out. Makes room for the names of the
 * options first and names them last, in the order the layout put them in.
 * Returns the bounding box of the visible elements.
 */
export function runLayout(graph: dia.Graph, root: dia.Element): g.Rect | null {

    makeRoomForOptions(graph);
    makeRoomForReturnLinks(graph);

    const groups = graph.getElements()
        .filter(Group.isGroup)
        .filter((group) => !isHiddenByCollapse(group))
        .sort((a, b) => b.getAncestors().length - a.getAncestors().length);

    for (const group of groups) {
        if (group.isCollapsed()) {
            // A node-sized group with its `start` in its place, standing in for it.
            group.resize(NODE_SIZE.width, NODE_SIZE.height);
            group.getStart().position(group.position().x, group.position().y);
        } else {
            layoutGroup(graph, group);
        }
    }

    createTreeLayout(graph).layoutTree(root);
    nameOptions(graph);

    return graph.getCellsBBox(graph.getElements().filter(isCellVisible));
}
