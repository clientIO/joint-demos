import type { dia } from '@joint/plus';

import { Group, Link, Node, PARENT_GAP } from './shapes';
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

/**
 * Inside a group every leaf of a branch connects to the `end` node. When a
 * leaf gets its first child, the link to `end` moves down to the child; every
 * further child gets a link to `end` of its own.
 */
function connectChildToEnd(graph: dia.Graph, parent: dia.Element, child: dia.Element): void {
    const container = parent.getParentCell();
    if (!container || !Group.isGroup(container)) return;
    const end = container.getEnd();
    const endLink = graph.getConnectedLinks(parent, { outbound: true }).find((link) => link.getTargetCell() === end);
    if (endLink) {
        endLink.source(child);
    } else {
        const link = Link.create(child, end);
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
 * the return path. The content, including the inner links, is embedded in
 * the group.
 */
export function createGroup(graph: dia.Graph, kind: GroupKind): Group {
    const group = Group.create(kind);
    const start = Node.create('Start', 'start');
    const end = Node.create('End', 'end');
    const nodes = kind === 'fork' ? [Node.create(nextLabel()), Node.create(nextLabel())] : [Node.create(nextLabel())];
    nodes.forEach((node, index) => node.set('siblingRank', index));

    const links = nodes.flatMap((node) => [Link.create(start, node), Link.create(node, end)]);
    if (kind === 'loop') links.push(Link.createReturn(end, start));

    graph.addCells([group, start, ...nodes, end, ...links]);
    group.embed([start, ...nodes, end, ...links]);

    return group;
}

/** Adds a group of `kind` as the last child of `parent`. */
export function insertGroup(graph: dia.Graph, parent: dia.Element, kind: GroupKind): Group {
    const group = createGroup(graph, kind);
    attachChild(graph, parent, group);
    return group;
}
