import { g } from '@joint/plus';
import type { dia } from '@joint/plus';

import { GROUP_LABELS, Group, Link, Node, PARENT_GAP } from './shapes';
import { createTreeLayout, fitGroupToContent, joinLeavesInto } from './tree-layout';

/**
 * A branch group: a fork/join. The `start` node has two branches, and every
 * leaf of the branches converges into the `end` node.
 *
 *          start
 *         /     \
 *        a       b
 *         \     /
 *           end
 */

/**
 * Adds a branch group to the graph: a `start` node, two branches of one node
 * each (`nextLabel` names them) and an `end` node the branches converge into.
 * The content, including the inner links, is embedded in the group.
 */
export function createBranchGroup(graph: dia.Graph, nextLabel: () => string): Group {
    const group = Group.create('branch');
    const start = Node.create(GROUP_LABELS.branch, 'start');
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

/** Every leaf of a branch connects to the `end` of the group. */
export function getBranchSink(group: Group): Node {
    return group.getEnd();
}

/** Groups may only be inserted into a branch where they read top-down: everywhere in a branch group. */
export function canInsertGroupInBranch(): boolean {
    return true;
}

/** A branch is never emptied: without its last node the `start` would link to the `end` directly. */
export function canEmptyBranch(): boolean {
    return false;
}

/**
 * Lays out the content of an expanded branch group: the tree that grows from
 * `start` (with `end` excluded, so the two branches stay a tree), then `end`
 * right below the branches on the axis of `start`, joined by a horizontal
 * bar (`joinLeavesInto()`).
 */
export function layoutBranchGroup(graph: dia.Graph, group: Group): void {
    const start = group.getStart();
    const end = group.getEnd();

    const treeLayout = createTreeLayout(graph, {
        filter: (children) => children.filter((child) => child.id !== end.id)
    });
    treeLayout.layoutTree(start);

    // The area of the root is the bounding box of the whole tree (in graph coordinates).
    const { x, y, width, height } = treeLayout.getLayoutArea(start)!;
    const bbox = new g.Rect(x, y, width, height);
    const axisX = start.getBBox().center().x;

    const endSize = end.size();
    end.position(axisX - endSize.width / 2, bbox.y + bbox.height + PARENT_GAP);

    joinLeavesInto(graph, end);

    fitGroupToContent(group, bbox.union(end.getBBox()));
}
