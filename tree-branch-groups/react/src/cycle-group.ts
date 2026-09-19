import { g } from '@joint/plus';
import type { dia } from '@joint/plus';

import { GROUP_LABELS, Group, Link, Node, PARENT_GAP } from './shapes';
import { createTreeLayout, fitGroupToContent, forkChildrenFrom, getAxisX, joinLeavesInto } from './tree-layout';

/**
 * A cycle group: a loop. The children of the `start` node root the tree that
 * grows down on the right; its leaves converge into the `end` node. The
 * children of the `end` node root the tree that grows up on the left - the
 * return path; its leaves converge back into `start`. The `start` is created
 * with one child, the return path empty: `end` then links to `start` directly
 * and nodes are inserted into that link. A gate gets more children when one
 * of them is deleted and its children move up.
 *
 *         ┌───▶ start
 *         d      ├─────┐
 *         c      a     b
 *         └──── end ◀──┘
 *
 * (`a` is the only node of a new cycle; `c` and `d` were inserted later.)
 *
 * Both trees are laid out by the tree layout, the return path with the
 * direction `T`. The gates sit in the middle of the group; the tree on the
 * right hangs from `start` and joins `end` with the usual bars, the return
 * path leaves `end` and enters `start` sideways. Its links are dashed: they
 * run against the flow.
 */

/** Horizontal distance between the return path and the tree on the right. */
const LOOP_GAP = PARENT_GAP;

/**
 * Adds a cycle group to the graph: `start`, a node below it on the right
 * (`nextLabel` names it), `end`, and the link that closes the loop from `end`
 * back to `start`. The return path starts empty; nodes are inserted into that
 * link. The content is embedded in the group.
 */
export function createCycleGroup(graph: dia.Graph, nextLabel: () => string): Group {
    const group = Group.create('cycle');
    const start = Node.create(GROUP_LABELS.cycle, 'start');
    const down = Node.create(nextLabel());
    const end = Node.create('End', 'end');

    const links = [
        Link.create(start, down),
        Link.create(down, end),
        Link.create(end, start)
    ];

    graph.addCells([group, start, down, end, ...links]);
    group.embed([start, down, end, ...links]);

    return group;
}

/** The link from `end` straight to `start`: the return path while it is empty. */
export function getReturnLink(graph: dia.Graph, group: Group): dia.Link | undefined {
    const start = group.getStart();
    return graph.getConnectedLinks(group.getEnd(), { outbound: true }).find((link) => link.getTargetElement() === start);
}

/**
 * The gate a path through the group starts from: `start` for the tree on the
 * right, `end` for the return path on the left. Found by walking up the tree
 * the element belongs to - a nested group is walked from its group element.
 */
function getSourceGate(graph: dia.Graph, group: Group, element: dia.Element): Node {
    let current = element;
    while (!(Node.isNode(current) && current.isGate())) {
        const [parent] = graph.getNeighbors(current, { inbound: true });
        if (!parent) throw new Error(`Element ${element.id} is not on a path through group ${group.id}.`);
        current = parent;
    }
    return current;
}

/** Whether `element` is on the return path: the tree that grows up from `end`. */
export function isOnReturnPath(graph: dia.Graph, group: Group, element: dia.Element): boolean {
    return getSourceGate(graph, group, element).getRole() === 'end';
}

/** The gate the leaves below `element` converge into: the gate opposite to the one its path starts from. */
export function getCycleSink(graph: dia.Graph, group: Group, element: dia.Element): Node {
    return isOnReturnPath(graph, group, element) ? group.getStart() : group.getEnd();
}

/**
 * A nested group reads top-down, from its `start` to its `end`. On the
 * return path the tree grows up, so a group inserted there would be entered
 * through its `end` - groups are only offered on the tree on the right.
 */
export function canInsertGroupInCycle(graph: dia.Graph, group: Group, element: dia.Element): boolean {
    return !isOnReturnPath(graph, group, element);
}

/**
 * The return path may be emptied: `end` then links to `start` directly and
 * the link is routed around the left side of the group. The tree on the
 * right keeps its last node.
 */
export function canEmptyCyclePath(graph: dia.Graph, group: Group, element: dia.Element): boolean {
    return isOnReturnPath(graph, group, element);
}

interface Tree {
    elements: dia.Element[];
    links: dia.Link[];
}

/**
 * The elements of the trees that grow from `roots` and the links between
 * them, up to (not including) the gates and the links into them. Follows the
 * outbound links only, so a nested group is a single element of the tree.
 */
function collectTrees(graph: dia.Graph, roots: dia.Element[]): Tree {
    const elements: dia.Element[] = [];
    const links: dia.Link[] = [];
    const queue = [...roots];
    while (queue.length > 0) {
        const element = queue.shift()!;
        elements.push(element);
        for (const link of graph.getConnectedLinks(element, { outbound: true })) {
            const child = link.getTargetElement();
            if (!child || (Node.isNode(child) && child.isGate())) continue;
            links.push(link);
            queue.push(child);
        }
    }
    return { elements, links };
}

/** Moves a tree collected by `collectTrees()`: the elements with their content, the links with their vertices. */
function translateTree(tree: Tree, dx: number, dy: number): void {
    for (const element of tree.elements) element.translate(dx, dy);
    for (const link of tree.links) link.translate(dx, dy);
}

/** The children of a gate: the roots of the tree that grows from it. The other gate is not one of them. */
function getTreeRoots(graph: dia.Graph, gate: Node): dia.Element[] {
    return graph.getNeighbors(gate, { outbound: true }).filter((child) => !(Node.isNode(child) && child.isGate()));
}

/**
 * Lays out the content of an expanded cycle group. Both gates sit on the
 * axis of `start`, in the middle of the group.
 *
 * 1. The tree on the right grows down from `start` (with `end` excluded from
 *    the layout); the return path grows up from `end` (with `start`
 *    excluded). The return path is then placed left of the tree, a gap
 *    apart, and both are shifted so that the axis runs through the middle of
 *    them - or, should the return path be wider than the tree, so that it
 *    stays clear of the gates; the group is then wider than its content.
 * 2. `end` is placed below the taller of the two, on the axis.
 * 3. On the right the links are the bars of a tree: from `start` down to the
 *    roots, from the leaves down to `end`. On the left they loop: out of
 *    `end` sideways and up on the axis of a root, up on the axis of a leaf
 *    and into `start` sideways - dashed, as they run against the flow.
 */
export function layoutCycleGroup(graph: dia.Graph, group: Group): void {
    const start = group.getStart();
    const end = group.getEnd();
    const downRoots = getTreeRoots(graph, start);
    const upRoots = getTreeRoots(graph, end);
    if (downRoots.length === 0) throw new Error(`The start of cycle group ${group.id} has no child.`);

    const startBBox = start.getBBox();
    const axisX = startBBox.center().x;

    createTreeLayout(graph, {
        filter: (children) => children.filter((child) => child.id !== end.id)
    }).layoutTree(start);
    const downTree = collectTrees(graph, downRoots);
    let downBBox = graph.getCellsBBox(downTree.elements)!;

    // Laid out above `end` wherever `end` is now.
    createTreeLayout(graph, {
        direction: 'T',
        filter: (children) => children.filter((child) => child.id !== start.id)
    }).layoutTree(end);
    const upTree = collectTrees(graph, upRoots);
    let upBBox = graph.getCellsBBox(upTree.elements);
    const upWidth = upBBox?.width ?? 0;

    // The return path (an empty one is the link alone), a gap, the tree on the right.
    const width = upWidth + LOOP_GAP + downBBox.width;
    const upRight = Math.min(axisX - width / 2 + upWidth, axisX - LOOP_GAP);
    const downLeft = upRight + LOOP_GAP;

    const endBBox = end.getBBox();
    const endY = startBBox.corner().y + PARENT_GAP + Math.max(downBBox.height, upBBox?.height ?? 0) + PARENT_GAP;
    end.position(axisX - endBBox.width / 2, endY);

    translateTree(downTree, downLeft - downBBox.x, 0);
    downBBox = graph.getCellsBBox(downTree.elements)!;
    if (upBBox) {
        translateTree(upTree, upRight - upBBox.corner().x, endY - endBBox.y);
        upBBox = graph.getCellsBBox(upTree.elements)!;
    } else {
        upBBox = new g.Rect(upRight, startBBox.y, 0, 0);
    }

    // The tree on the right: bars below `start` and above `end`.
    forkChildrenFrom(graph, start);
    joinLeavesInto(graph, end);

    // The return path: out of `end` to the left, into `start` from the left.
    const startY = startBBox.center().y;
    const endCenterY = end.getBBox().center().y;
    for (const link of graph.getConnectedLinks(end, { outbound: true })) {
        const root = link.getTargetElement();
        if (!root || (Node.isNode(root) && root.isGate())) continue;
        link.vertices([{ x: getAxisX(root), y: endCenterY }]);
    }
    for (const link of graph.getConnectedLinks(start, { inbound: true })) {
        const leaf = link.getSourceElement();
        if (!leaf || (Node.isNode(leaf) && leaf.isGate())) continue;
        link.vertices([{ x: getAxisX(leaf), y: startY }]);
    }
    // With no return path, `end` links to `start` directly: down the left side of the group.
    const returnLink = getReturnLink(graph, group);
    if (returnLink) {
        returnLink.vertices([{ x: upRight, y: endCenterY }, { x: upRight, y: startY }]);
    }

    // The return path runs against the flow of the tree: its links are dashed.
    const backwardLinks = [
        ...graph.getConnectedLinks(end, { outbound: true }),
        ...upTree.links,
        ...graph.getConnectedLinks(start, { inbound: true })
    ];
    for (const link of backwardLinks) {
        if (link instanceof Link) link.setBackward(true);
    }

    // Symmetric around the axis: the gates are in the middle of the group.
    const content = downBBox.union(upBBox).union(startBBox).union(end.getBBox());
    const halfWidth = Math.max(axisX - content.x, content.corner().x - axisX);
    fitGroupToContent(group, new g.Rect(axisX - halfWidth, content.y, 2 * halfWidth, content.height));
}
