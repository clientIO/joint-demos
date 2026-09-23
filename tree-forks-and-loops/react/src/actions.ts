import type { dia } from '@joint/plus';

import { Group, Link, Node, PARENT_GAP, getGroupLabel } from './shapes';
import type { GroupKind } from './shapes';

let nodeCounter = 0;

function nextLabel(): string {
    nodeCounter += 1;
    return `Node ${nodeCounter}`;
}

/** The rank of a new child: after the existing children of the parent. */
function nextSiblingRank(graph: dia.Graph, parent: dia.Element): number {
    return graph.getNeighbors(parent, { outbound: true }).length;
}

/** The point a branch converges on: the end node of the group that holds it, if any. */
function getBranchEnd(element: dia.Element): Node | null {
    const container = element.getParentCell();
    return container && Group.isGroup(container) ? container.getEnd() : null;
}

/**
 * Every leaf of a branch connects to the point the branch converges on. When a
 * leaf gets its first child, that link moves down to the child; every further
 * child gets a link of its own.
 */
function connectChildToEnd(graph: dia.Graph, parent: dia.Element, child: dia.Element): void {
    const end = getBranchEnd(parent);
    if (!end) return;
    const endLink = graph.getConnectedLinks(parent, { outbound: true }).find((link) => link.getTargetCell() === end);
    if (endLink) {
        endLink.source(child);
    } else {
        const link = Link.createJoin(child, end);
        graph.addCell(link);
        link.reparent();
    }
}

/**
 * Connects `parent` to `child` (both already in the graph) and keeps the child
 * inside the group of the parent, if any. The link is reparented into the
 * group of its ends, so that the group hides it when it collapses.
 */
function attachChild(graph: dia.Graph, parent: dia.Element, child: dia.Element): void {
    // Embed first: a link is reparented into the common ancestor of its ends,
    // so the child has to be inside the group before any link to it is made.
    // A link left at the top level would not move along with the group.
    const container = parent.getParentCell();
    if (container) container.embed(child);

    connectChildToEnd(graph, parent, child);
    child.set('siblingRank', nextSiblingRank(graph, parent));
    // Seed the position below the parent so that the first render does not flash at the origin.
    const parentBBox = parent.getBBox();
    child.position(parentBBox.x, parentBBox.y + parentBBox.height + PARENT_GAP, { deep: true });

    const link = Link.create(parent, child);
    graph.addCell(link);
    link.reparent();
}

/** Adds a plain node as the last child of `parent`. */
export function addChild(graph: dia.Graph, parent: dia.Element): Node {
    const node = Node.create(nextLabel());
    graph.addCell(node);
    attachChild(graph, parent, node);
    return node;
}

/**
 * Adds a group to the graph: a `start` node, its content and an `end` node
 * the content converges into - two branches of one node each for a fork
 * group, one node for a loop group, whose `end` links back to its `start`:
 * the return path, and one node for an `if` group, which the `no` line runs
 * past on its way from the `start` to the `end`. The content, including the
 * inner links, is embedded in the group.
 */
export function createGroup(graph: dia.Graph, kind: GroupKind): Group {
    const group = Group.create(kind);
    // The start node is the group on the screen, and says which kind it is.
    const start = Node.create(getGroupLabel(kind), 'start');
    const end = Node.createEnd();
    const nodes = kind === 'fork' ? [Node.create(nextLabel()), Node.create(nextLabel())] : [Node.create(nextLabel())];
    nodes.forEach((node, index) => node.set('siblingRank', index));

    const links = kind === 'if'
        // The branch of an `if` stands on the axis like the content of any
        // other group; what makes it an `if` is the second way out of the
        // start node, labelled `skip`, which goes past the branch and joins
        // the flow again at the end node - the return link of a loop, the
        // other way round. The tree layout sees neither of the two joins.
        ? [Link.create(start, nodes[0]), Link.createJoin(nodes[0], end), Link.createJoin(start, end, 'skip')]
        : nodes.flatMap((node) => [Link.create(start, node), Link.createJoin(node, end)]);
    if (kind === 'loop') links.push(Link.createReturn(end, start));

    graph.addCells([group, start, ...nodes, end, ...links]);
    group.embed([start, ...nodes, end, ...links]);

    return group;
}

/** The link of the tree that leads to `element`: what it hangs on, if anything. */
function getParentLink(graph: dia.Graph, element: dia.Element): dia.Link | null {
    return graph.getConnectedLinks(element, { inbound: true }).find((link) => !Link.isJoin(link)) ?? null;
}

/**
 * What the remove button of `element` takes away: a whole group, if the
 * element is the start node that stands for it, and the element itself
 * otherwise. The rest of a group is no use without its start node.
 */
function getRemovable(element: dia.Element): dia.Element {
    const container = element.getParentCell();
    const isStart = Node.isNode(element) && element.getRole() === 'start';
    return isStart && container && Group.isGroup(container) ? container : element;
}

/** Whether `element` can go: everything but the root of the tree, which nothing hangs on. */
export function canRemove(graph: dia.Graph, element: dia.Element): boolean {
    return Boolean(getParentLink(graph, getRemovable(element)));
}

/**
 * A leaf of a branch joins the end node of its group. Gives `element` that
 * link if it has lost its last child and has none of its own yet.
 */
function joinToEnd(graph: dia.Graph, element: dia.Element): void {
    const end = getBranchEnd(element);
    if (!end) return;
    // Anything leading out of it - a child, or a join it still has - is reason enough to leave it alone.
    if (graph.getConnectedLinks(element, { outbound: true }).length > 0) return;
    const link = Link.createJoin(element, end);
    graph.addCell(link);
    link.reparent();
}

/**
 * Removes `element` and hands its children to whatever it hung on - the whole
 * group, if the element is the start node of one, content and all. A leaf
 * takes its join with it, and the element it hung on takes over that join if
 * it is now a leaf itself.
 */
export function removeElement(graph: dia.Graph, element: dia.Element): void {
    const target = getRemovable(element);
    const parentLink = getParentLink(graph, target);
    const parent = parentLink?.getSourceElement();
    if (!parentLink || !parent) return;

    for (const link of graph.getConnectedLinks(target, { outbound: true })) {
        if (Link.isJoin(link)) link.remove(); else link.source(parent);
    }
    parentLink.remove();
    target.remove({ deep: true });
    joinToEnd(graph, parent);
}

/** Adds a group of `kind` as the last child of `parent`. */
export function insertGroup(graph: dia.Graph, parent: dia.Element, kind: GroupKind): Group {
    const group = createGroup(graph, kind);
    attachChild(graph, parent, group);
    return group;
}
