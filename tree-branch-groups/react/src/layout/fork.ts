import { g } from '@joint/plus';
import type { dia } from '@joint/plus';

import type { Group } from '../shapes';
import { SINK_GAP, createTreeLayout, fitGroupToContent, joinLeavesInto } from './tree';

/**
 * A fork group: a fork/join. The children of the `start` node are the
 * branches, and every leaf of the branches converges into the `end` node.
 * A new fork is empty: `start` links straight to `end` (see `build.ts`).
 *
 *          start
 *         /     \
 *        a       b
 *         \     /
 *           end
 */

/**
 * Lays out the content of an expanded fork group: the tree that grows from
 * `start` (with `end` excluded, so the branches stay a tree), then `end`
 * right below the branches on the axis of `start`, joined by a horizontal
 * bar (`joinLeavesInto()`). The branches are named on their links like the
 * options of a decision (see `nameOptions()` in `layout/index.ts`).
 */
export function layoutForkGroup(graph: dia.Graph, group: Group): void {
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
    end.position(axisX - endSize.width / 2, bbox.y + bbox.height + SINK_GAP);

    joinLeavesInto(graph, end);

    fitGroupToContent(group, bbox.union(end.getBBox()));
}
