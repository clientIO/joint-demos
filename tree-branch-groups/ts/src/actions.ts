import type { dia } from '@joint/plus';

import { Group, Link, Node, PARENT_GAP } from './shapes';

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
 * Adds a group to the graph: a `start` node, two branches of one node each
 * and an `end` node the branches converge into. The content, including the
 * inner links, is embedded in the group.
 */
export function createBranchGroup(graph: dia.Graph): Group {
    const group = new Group();
    const start = Node.create('Start', 'start');
    const branchA = Node.create(nextLabel());
    const branchB = Node.create(nextLabel());
    const end = Node.create('End', 'end');

    branchA.set('siblingRank', 0);
    branchB.set('siblingRank', 1);

    const links = [
        Link.create(start, branchA),
        Link.create(start, branchB),
        Link.create(branchA, end),
        Link.create(branchB, end)
    ];

    graph.addCells([group, start, branchA, branchB, end, ...links]);
    group.embed([start, branchA, branchB, end, ...links]);

    return group;
}

/** Adds a branch group as the last child of `parent`. */
export function insertBranchGroup(graph: dia.Graph, parent: dia.Element): Group {
    const group = createBranchGroup(graph);
    attachChild(graph, parent, group);
    return group;
}
