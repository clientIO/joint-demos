import { g } from '@joint/plus';
import type { dia } from '@joint/plus';

import { INSERT_BUTTON_FROM_TARGET, Link, PARENT_GAP, isGate } from '../shapes';
import type { Group } from '../shapes';
import { createTreeLayout, fitGroupToContent, forkChildrenFrom, getAxisX } from './tree';

/**
 * A loop group. The children of the `start` node root the tree that grows
 * down on the right; its leaves converge into the `end` node, and `end` links
 * straight back to `start` - the return path, a single dashed link that runs
 * up the left side of the group. A new loop is empty: `start` links straight
 * to `end` (see `build.ts`), and the tree grows by insertions into that link.
 *
 *        ┌──▶ start
 *        ┆      ├─────┐
 *        ┆      a     b
 *        └──── end ◀──┘
 *
 * The tree is laid out by the tree layout. The gates sit in the middle of the
 * group; the tree hangs from `start` with the usual bar and its leaves enter
 * `end` from the side; the return link goes down, left, up and back in
 * under `start`. Nothing can be added to the return path: a node
 * there would run once per iteration exactly like a node of the tree.
 */

/**
 * Horizontal distance between the return link and the tree. The link runs
 * outside of the box of the group; a loop with a sibling on its left asks
 * the tree layout for that much more room before it (see
 * `makeRoomForReturnLinks()` in `layout/index.ts`), so that the sibling keeps
 * clear of the link.
 */
export const LOOP_GAP = 40;
/**
 * How far below a gate the return link diverges from or merges into the link
 * out of the gate: further below `start`, clear of the collapse button
 * hanging under its pill. The insert button of that link sits at the far
 * end, near the child (the link gets room for it, see `getRoomBelow()` in
 * `layout/index.ts`).
 */
const RETURN_DROP_BELOW_END = 20;
const RETURN_DROP_BELOW_START = 30;
/** Where the return link ends: a little way down the link out of `start`, past the merge. */
const RETURN_ARROW_BELOW_START = RETURN_DROP_BELOW_START + 12;

/**
 * Extra room below the start of a loop (read by `getRoomBelow()` in
 * `layout/index.ts`), and the gap between the leaves of the tree and `end`: chosen
 * so that the return link runs as far above the tree as below it - from
 * where it joins the link out of `start` to the tree, and from the tree to
 * where it leaves the link out of `end`.
 */
export const LOOP_START_ROOM = 40;
const LOOP_JOIN_GAP = PARENT_GAP + LOOP_START_ROOM - RETURN_DROP_BELOW_START - RETURN_DROP_BELOW_END;

/** The link from `end` straight back to `start`: the return path. */
function getReturnLink(graph: dia.Graph, group: Group): Link | undefined {
    const start = group.getStart();
    return graph.getConnectedLinks(group.getEnd(), { outbound: true })
        .find((link): link is Link => link instanceof Link && link.getTargetElement() === start);
}

interface Tree {
    elements: dia.Element[];
    links: dia.Link[];
}

/**
 * The elements of the tree that grows from `roots` and the links between
 * them, up to (not including) the gates and the links into them. Follows the
 * outbound links only, so a nested group is a single element of the tree.
 */
function collectTree(graph: dia.Graph, roots: dia.Element[]): Tree {
    const elements: dia.Element[] = [];
    const links: dia.Link[] = [];
    for (const root of roots) {
        graph.search(root, (element) => {
            if (isGate(element)) return false;
            elements.push(element);
            for (const link of graph.getConnectedLinks(element, { outbound: true })) {
                const child = link.getTargetElement();
                if (child && !isGate(child)) links.push(link);
            }
            return true;
        }, { outbound: true, breadthFirst: true });
    }
    return { elements, links };
}

/**
 * Lays out the content of an expanded loop group.
 *
 * 1. The tree grows down from `start` (with `end` excluded from the layout),
 *    centered on the axis of `start` as the tree layout puts it: a chain of
 *    nodes lines up with the gates. The return link runs a gap left of the
 *    tree, outside of the box of the group; the group's `prevSiblingGap`
 *    keeps a sibling on the left clear of it.
 * 2. `end` is placed below the tree, on the axis, as far as balances the
 *    return link around the tree - a short way below `start` when there is
 *    no tree.
 * 3. The tree hangs from `start` with the usual bar. Its leaves enter `end`
 *    from the right, on its level, so that the loop closes at the side of
 *    `end`; a leaf right above `end` connects straight, and one left of it
 *    comes down through the usual bar. The return link leaves `end` to the
 *    left, runs up and enters `start` from the left - dashed, as it runs
 *    against the flow.
 */
export function layoutLoopGroup(graph: dia.Graph, group: Group): void {
    const start = group.getStart();
    const end = group.getEnd();
    const roots = graph.getNeighbors(start, { outbound: true }).filter((child) => !isGate(child));

    const startBBox = start.getBBox();
    const axisX = startBBox.center().x;

    // The tree hangs from `start` where the tree layout put it: centered on
    // the axis, so that a chain of nodes lines up with the gates.
    createTreeLayout(graph, {
        filter: (children) => children.filter((child) => child.id !== end.id)
    }).layoutTree(start);
    const tree = collectTree(graph, roots);
    // An emptied loop has no tree: `start` links straight down to `end`, and the column of `start` stands in.
    const treeBBox = graph.getCellsBBox(tree.elements) ?? new g.Rect(startBBox.x, startBBox.corner().y + PARENT_GAP, startBBox.width, 0);

    // The return link runs a gap left of everything, outside of the box of the group.
    const returnX = Math.min(treeBBox.x, startBBox.x) - LOOP_GAP;

    // `end` below the tree, as far as balances the return link's run around
    // the tree - or, with no tree to join, as far below `start` as puts the
    // insert button of the straight link between them (a fixed distance
    // above `end`) in the middle of that run.
    const endBBox = end.getBBox();
    const endY = roots.length > 0
        ? treeBBox.corner().y + LOOP_JOIN_GAP
        : startBBox.corner().y + RETURN_DROP_BELOW_START + 2 * INSERT_BUTTON_FROM_TARGET + RETURN_DROP_BELOW_END;
    end.position(axisX - endBBox.width / 2, endY);

    // The tree hangs from `start` with the usual bar. Its leaves enter `end`
    // from the side, on its level - from the right, or from the left in a
    // wide tree, over the return link, which lies below the others; a leaf
    // right above `end` comes straight down.
    forkChildrenFrom(graph, start);
    const endBBoxNow = end.getBBox();
    const endX = endBBoxNow.center().x;
    const endCenterY = endBBoxNow.center().y;
    for (const link of graph.getConnectedLinks(end, { inbound: true })) {
        const leaf = link.getSourceElement();
        if (!leaf || isGate(leaf)) continue;
        const leafX = getAxisX(leaf);
        link.vertices(leafX === endX ? [] : [{ x: leafX, y: endCenterY }]);
    }

    // The return path: out of `end` down the link that leaves it, off to the
    // left, up the side of the group, right under `start`, and on down the
    // link that leaves `start` for a little way, merging into it. The
    // stretches it shares with those links lie under them; where it diverges
    // and merges the corners round off. An arrow in its middle shows the way. The target anchor is the bottom of
    // `start` moved down - measured on the model: the view of the pill is
    // taller by its buttons.
    const returnLink = getReturnLink(graph, group);
    const belowEnd = endCenterY + RETURN_DROP_BELOW_END;
    const belowStart = startBBox.corner().y + RETURN_DROP_BELOW_START;
    if (returnLink) {
        returnLink.source({ id: end.id });
        returnLink.target({ id: start.id, anchor: { name: 'bottom', args: { dy: RETURN_ARROW_BELOW_START, useModelGeometry: true }}});
        returnLink.vertices([
            { x: endX, y: belowEnd },
            { x: returnX, y: belowEnd },
            { x: returnX, y: belowStart },
            { x: axisX, y: belowStart }
        ]);
        returnLink.setBackward(true);
    }

    // The box of the group: the tree and the gates, the drop of the return
    // link below `end` included - not the link's run up the side, which the
    // `prevSiblingGap` of the group makes room for.
    const content = treeBBox.union(startBBox).union(end.getBBox()).union(new g.Rect(endX, belowEnd, 0, 0));
    fitGroupToContent(group, content);
}
