import { layout } from '@joint/plus';
import type { dia, g } from '@joint/plus';

import { GROUP_PADDING, Group, Node, PARENT_GAP, SIBLING_GAP } from './shapes';

/**
 * Where the horizontal bar of a fork or a join lies: a third of the gap away
 * from the element the links share (the parent, or the gate the leaves
 * converge into), two thirds away from each child or leaf. The vertical part
 * a link has of its own is thus the longer one, with room for the insert
 * button of the link.
 */
export const BAR_OFFSET_FROM_SHARED = PARENT_GAP / 3;

/**
 * Vertical distance between the leaves of a group and its `end`: the parent
 * gap plus the bar offset, so that the part of a join a leaf has of its own
 * is as long as the parent gap - room for its insert button clear of the
 * collapse button of a collapsed group among the leaves.
 */
export const SINK_GAP = PARENT_GAP + BAR_OFFSET_FROM_SHARED;

/**
 * The vertical axis a link into or out of `element` runs on: the middle of a
 * node, the axis of the gates of a group.
 */
export function getAxisX(element: dia.Element): number {
    return Group.isGroup(element) ? element.getAxisX() : element.getBBox().center().x;
}

/**
 * A fresh instance for every tree. `layoutTree()` keeps the layout areas of
 * the previous run and treats the elements it has already seen as leaves,
 * while `layout()` would start from every source of the graph - including
 * the `start` node of every group.
 *
 * The tree layout centers a child under its parent by its bounding box and
 * routes the link to the middle of that box. A group is connected on the
 * axis of its gates instead, which is off the middle of a group whose
 * content is wider on one side, so the vertices are computed here: the same
 * horizontal bar the layout draws, between the axes of the two elements.
 */
export function createTreeLayout(graph: dia.Graph, options: Partial<layout.TreeLayout.Options> = {}): layout.TreeLayout {
    const direction = options.direction ?? 'B';
    return new layout.TreeLayout({
        graph,
        direction,
        parentGap: PARENT_GAP,
        siblingGap: SIBLING_GAP,
        firstChildGap: PARENT_GAP,
        updateSiblingRank: null,
        // A group carries its content (and the vertices of the embedded links) along.
        updatePosition: (element, position, opt) => {
            element.position(position.x, position.y, { ...opt, deep: true });
        },
        updateVertices: (link, vertices, opt) => {
            const source = link.getSourceElement();
            const target = link.getTargetElement();
            if (!source || !target) return;
            const sourceX = getAxisX(source);
            const targetX = getAxisX(target);
            if (sourceX === targetX) {
                link.vertices([], opt);
                return;
            }
            // The bar is a third of the gap away from the parent: the part of
            // the link the children share is short, the part of its own
            // (where its insert button sits) is long - and longer still for a
            // child placed further away with the `offset` attribute.
            const sourceBBox = source.getBBox();
            const barY = direction === 'T'
                ? sourceBBox.y - BAR_OFFSET_FROM_SHARED
                : sourceBBox.corner().y + BAR_OFFSET_FROM_SHARED;
            link.vertices([{ x: sourceX, y: barY }, { x: targetX, y: barY }], opt);
        },
        ...options
    });
}

/**
 * Positions and sizes a group around its content, which already includes its
 * `start` and `end` on a common vertical axis: from the top of `start` to the
 * bottom of `end`, and as wide as the content plus some room on both sides.
 * The group is not rendered; its box is what the tree that contains it lays
 * out. The outer links, which connect to the group, are anchored on that axis
 * (see `gateAnchor`), so the group does not have to be symmetric around it.
 */
export function fitGroupToContent(group: Group, content: g.Rect): void {
    const top = group.getStart().getBBox().y;
    const bottom = group.getEnd().getBBox().corner().y;
    group.position(content.x - GROUP_PADDING, top);
    group.resize(content.width + 2 * GROUP_PADDING, bottom - top);
}

/**
 * Routes the links from the leaves of a tree into the gate they converge
 * into, placed below the tree: a horizontal bar a third of the gap above the
 * gate, like the one the tree layout draws below a parent, mirrored. A leaf right above
 * the gate connects straight. Links from the other gate are left alone.
 */
export function joinLeavesInto(graph: dia.Graph, gate: Node): void {
    const gateBBox = gate.getBBox();
    const gateX = gateBBox.center().x;
    const barY = gateBBox.y - BAR_OFFSET_FROM_SHARED;
    for (const link of graph.getConnectedLinks(gate, { inbound: true })) {
        const leaf = link.getSourceElement();
        if (!leaf || (Node.isNode(leaf) && leaf.isGate())) continue;
        const leafX = getAxisX(leaf);
        link.vertices(leafX === gateX ? [] : [{ x: leafX, y: barY }, { x: gateX, y: barY }]);
    }
}

/**
 * Routes the links from a gate to the roots of the tree below it, after the
 * tree has been moved: a horizontal bar a third of the gap below the gate,
 * the one the tree layout draws below a parent. A root right below the gate connects
 * straight. Links to the other gate are left alone.
 */
export function forkChildrenFrom(graph: dia.Graph, gate: Node): void {
    const gateBBox = gate.getBBox();
    const gateX = gateBBox.center().x;
    const barY = gateBBox.corner().y + BAR_OFFSET_FROM_SHARED;
    for (const link of graph.getConnectedLinks(gate, { outbound: true })) {
        const child = link.getTargetElement();
        if (!child || (Node.isNode(child) && child.isGate())) continue;
        const childX = getAxisX(child);
        link.vertices(childX === gateX ? [] : [{ x: gateX, y: barY }, { x: childX, y: barY }]);
    }
}
